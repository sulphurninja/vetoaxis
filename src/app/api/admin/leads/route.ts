import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from '@/lib/auth';
import Lead from '@/models/Lead';
import { dbConnect } from '@/lib/dbConnect';
import { redactLeadPeople } from '@/lib/creator-visibility';
import { applicationTypeQuery, createdAtDayQuery, getStatusQueryValue, LEGACY_STATUS_VALUES } from '@/lib/lead-utils';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters for potential filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const createdBy = searchParams.get('createdBy');
    const buyerCode = searchParams.get('buyerCode');
    const entryDate = searchParams.get('entryDate');
    const applicationType = searchParams.get('applicationType');
    const search = searchParams.get('search')?.trim();
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);
    const limitParam = Number.parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status && status !== 'All') {
      query.status = getStatusQueryValue(status);
    }
    if (buyerCode) {
      query.buyerCode = buyerCode;
    }
    if (applicationType) {
      query.applicationType = applicationTypeQuery(applicationType);
    }
    if (entryDate) {
      const createdAt = createdAtDayQuery(entryDate);
      if (createdAt) query.createdAt = createdAt;
    }
    if (createdBy) {
      query.createdBy = createdBy;
    }
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { streetAddress: regex },
        { city: regex },
        { state: regex },
        { zipCode: regex },
        { address: regex },
      ];
    }

    const countStatuses = (statuses: string[]) => {
      const statusValues = statuses.flatMap(status => LEGACY_STATUS_VALUES[status] || [status]);
      const activeStatusValues = query.status?.$in || (query.status ? [query.status] : null);
      if (activeStatusValues && !activeStatusValues.some((status: string) => statusValues.includes(status))) {
        return Promise.resolve(0);
      }

      return Lead.countDocuments({
        ...query,
        status: statusValues.length === 1 ? statusValues[0] : { $in: statusValues },
      });
    };

    const [leads, total, pending, verified, rejected] = await Promise.all([
      Lead.find(query)
        .select('firstName lastName email phone status applicationType createdAt buyerCode createdBy')
        .populate('createdBy', 'name email vendorCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
      countStatuses(['PENDING']),
      countStatuses(['VERIFIED', 'ID_VERIFIED']),
      countStatuses(['REJECTED', 'REJECTED_BY_CLIENT']),
    ]);

    return NextResponse.json({
      leads: leads.map(lead => redactLeadPeople(lead, decoded.role as string)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total,
        pending,
        verified,
        rejected,
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
