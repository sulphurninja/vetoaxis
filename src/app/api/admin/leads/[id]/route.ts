import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import Lead from '@/models/Lead';
import { dbConnect } from '@/lib/dbConnect';
import { normalizeLeadStatus } from '@/lib/lead-utils';
import { isAllowedLeadStatus } from '@/lib/lead-statuses';
import { redactLeadPeople } from '@/lib/creator-visibility';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    await dbConnect();

    // Verify authentication
    const decoded = getAuthToken(request);

    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userRole = decoded.role;

    if (!['admin', 'super_admin'].includes(userRole as string)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Check if the lead exists
    const lead = await Lead.findById(leadId)
      .populate('createdBy', 'name email vendorCode organizationId')
      .populate('statusHistory.changedBy', 'name email vendorCode')
      .populate('organizationId', 'name');

    if (!lead) {
      return NextResponse.json(
        { message: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead: redactLeadPeople(lead, userRole as string) });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    await dbConnect();

    // Verify authentication
    const decoded = getAuthToken(request);

    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(decoded.role as string)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { notes, buyerCode } = body;
    const status = body.status ? normalizeLeadStatus(body.status) : body.status;

    if (status && !(await isAllowedLeadStatus(status))) {
      return NextResponse.json({ message: 'Invalid status selected' }, { status: 400 });
    }

    const existing = await Lead.findById(leadId).select('status');
    if (!existing) return NextResponse.json({ message: 'Lead not found' }, { status: 404 });

    const updateOps: any = { $set: {} as Record<string, unknown> };
    if (buyerCode !== undefined) {
      updateOps.$set.buyerCode = typeof buyerCode === 'string' && buyerCode.trim()
        ? buyerCode.trim().toUpperCase()
        : buyerCode;
    }
    if (status && status !== existing.status) {
      updateOps.$set.status = status;
      updateOps.$push = {
        statusHistory: {
          fromStatus: existing.status,
          toStatus: status,
          notes: notes || '',
          changedBy: decoded.id,
          timestamp: new Date(),
        },
      };
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateOps, { new: true });

    if (!updatedLead) {
      return NextResponse.json(
        { message: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Lead updated successfully',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    await dbConnect();

    // Verify authentication and role
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== 'object' || decoded.role !== 'super_admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const deletedLead = await Lead.findByIdAndDelete(leadId);

    if (!deletedLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
