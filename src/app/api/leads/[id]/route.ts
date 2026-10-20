import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import Lead from '@/models/Lead';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import { findDuplicateLead } from '@/lib/lead-duplicates';
import {
  buildFieldsArray,
  composeAddress,
  digitsOnlyPhone,
  LEAD_STATUSES,
  normalizeAddress,
  normalizeEmail,
  normalizeLeadStatus,
  normalizePhone,
  normalizeText,
  validateLeadPayload,
  withCanonicalWitnessFields,
} from '@/lib/lead-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Define as Promise
) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== 'object') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // FIX: Await params before accessing .id
    const { id: leadId } = await params;

    const lead = await Lead.findById(leadId)
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name email');

    if (!lead) return NextResponse.json({ message: 'Lead not found' }, { status: 404 });

    if (decoded.role !== 'super_admin' &&
        lead.createdBy && lead.createdBy._id.toString() !== decoded.id) {
      return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Define as Promise
) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== 'object') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // FIX: Await params before accessing .id
    const { id: leadId } = await params;
    const body = await request.json();

    if (!['admin', 'super_admin'].includes(decoded.role as string)) {
      return NextResponse.json({ message: 'Only an admin can edit a lead.' }, { status: 403 });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ message: 'Lead not found' }, { status: 404 });

    const detailFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'applicationType', 'lawsuit', 'notes', 'streetAddress', 'city', 'state', 'zipCode', 'fields'];
    const isLeadDetailSave = detailFields.some(field => Object.prototype.hasOwnProperty.call(body, field));
    const existingFields = Array.isArray(lead.fields)
      ? lead.fields.reduce((acc: Record<string, string>, field: { key: string; value: string }) => {
          if (field?.key) acc[field.key] = field.value || '';
          return acc;
        }, {})
      : {};
    const incomingFields = body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields)
      ? body.fields
      : existingFields;
    const fields = withCanonicalWitnessFields(incomingFields);
    const mergedPayload = {
      ...lead.toObject(),
      ...body,
      phone: body.phone ?? lead.phone,
      fields,
    };
    const validationErrors = isLeadDetailSave ? validateLeadPayload(mergedPayload) : [];

    if (validationErrors.length > 0) {
      return NextResponse.json({
        message: validationErrors.map(error => error.message).join(' '),
        errors: validationErrors,
        fieldErrors: validationErrors,
      }, { status: 400 });
    }

    let duplicateResult: Awaited<ReturnType<typeof findDuplicateLead>> | null = null;
    if (isLeadDetailSave) {
      const user = await User.findById(decoded.id).select('organizationId');
      duplicateResult = await findDuplicateLead({
        decoded,
        user,
        email: mergedPayload.email,
        phone: mergedPayload.phone,
        address: mergedPayload,
        fields,
        firstName: mergedPayload.firstName,
        lastName: mergedPayload.lastName,
        excludeLeadId: leadId,
      });
    }

    if (duplicateResult?.isDuplicate) {
      return NextResponse.json({
        message: duplicateResult.duplicateReason || 'This update matches another lead and was not saved.',
        errors: duplicateResult.fieldErrors,
        fieldErrors: duplicateResult.fieldErrors,
        isDuplicate: true,
        duplicateInfo: duplicateResult.existingLeadInfo,
      }, { status: 409 });
    }

    // Handle status history and dynamic fields as before
    const incomingStatus = body.status ? normalizeLeadStatus(body.status) : body.status;
    if (incomingStatus && !LEAD_STATUSES.includes(incomingStatus as any)) {
      return NextResponse.json({ message: 'Invalid status selected' }, { status: 400 });
    }

    if (incomingStatus && incomingStatus !== lead.status) {
      lead.statusHistory.push({
        fromStatus: lead.status,
        toStatus: incomingStatus,
        notes: body.statusNote || "",
        changedBy: decoded.id,
        timestamp: new Date()
      });
      lead.status = incomingStatus;
    }

    if (body.fields && typeof body.fields === 'object') {
      lead.fields = buildFieldsArray(fields);
      lead.markModified('fields');
    }

    const updateable = detailFields.filter(field => field !== 'fields');
    updateable.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(body, field)) return;
      if (field === 'dateOfBirth' && !body[field]) return;
      if (field === 'phone') {
        lead.phone = digitsOnlyPhone(body.phone);
        return;
      }
      lead[field] = body[field];
    });

    const fullAddress = composeAddress(lead.toObject());
    lead.address = fullAddress;
    lead.fullNameNormalized = normalizeText(`${lead.firstName || ''} ${lead.lastName || ''}`);
    lead.emailNormalized = normalizeEmail(lead.email) || undefined;
    lead.phoneNormalized = normalizePhone(lead.phone) || undefined;
    lead.addressNormalized = normalizeAddress(lead.toObject()) || undefined;

    await lead.save();
    return NextResponse.json({
      message: 'Lead updated successfully',
      lead,
      isDuplicate: false,
      duplicateInfo: null,
      fieldErrors: [],
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({
        message: 'This phone number or email already exists on another lead, so the edit was not saved.',
      }, { status: 409 });
    }
    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      return NextResponse.json({
        message: error.message || 'The lead could not be saved. Check the highlighted fields.',
      }, { status: 400 });
    }
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
