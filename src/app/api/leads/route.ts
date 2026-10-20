import { NextRequest, NextResponse } from 'next/server';
import Lead from '@/models/Lead';
import { getAuthToken } from '@/lib/auth';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import { findDuplicateLead } from '@/lib/lead-duplicates';
import {
  applicationTypeQuery,
  buildFieldsArray,
  composeAddress,
  createdAtDayQuery,
  digitsOnlyPhone,
  getStatusQueryValue,
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  validateLeadPayload,
  withCanonicalWitnessFields,
} from '@/lib/lead-utils';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Already returns decoded token payload
    const decoded = getAuthToken(request);

    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    const userRole = decoded.role;
    if (!userId) {
      return NextResponse.json({ error: 'Token missing user ID' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const entryDate = url.searchParams.get('entryDate');
    const applicationType = url.searchParams.get('applicationType');

    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};

    if (userRole !== 'super_admin') {
      query.createdBy = userId;
    }

    if (status) {
      query.status = getStatusQueryValue(status);
    }

    if (applicationType) {
      query.applicationType = applicationTypeQuery(applicationType);
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { streetAddress: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { zipCode: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }
    if (entryDate) {
      const createdAt = createdAtDayQuery(entryDate);
      if (createdAt) query.createdAt = createdAt;
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();

    const total = await Lead.countDocuments(query);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verify authentication
    const decoded = getAuthToken(request);

    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the user's organization to assign it to the lead
    const user = await User.findById(decoded.id).select('organizationId');

    const body = await request.json();
    const fields = withCanonicalWitnessFields(
      body.fields && typeof body.fields === 'object' && !Array.isArray(body.fields) ? body.fields : {}
    );
    const payload = { ...body, fields };
    const normalizedEmail = normalizeEmail(body.email);
    const normalizedPhone = normalizePhone(body.phone);
    const normalizedAddress = normalizeAddress(body);
    const fullNameNormalized = normalizeText(`${body.firstName || ''} ${body.lastName || ''}`);
    const fullAddress = composeAddress(body);

    const validationErrors = validateLeadPayload(payload);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        message: validationErrors.map(error => error.message).join(' '),
        errors: validationErrors,
        fieldErrors: validationErrors,
      }, { status: 400 });
    }

    const {
      isDuplicate,
      duplicateReason,
      existingLeadInfo,
      fieldErrors,
    } = await findDuplicateLead({
      decoded,
      user,
      email: body.email,
      phone: body.phone,
      address: body,
      fields,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    if (isDuplicate) {
      return NextResponse.json({
        message: duplicateReason || 'This lead matches an existing record and was not saved.',
        errors: fieldErrors,
        fieldErrors,
        isDuplicate: true,
        duplicateInfo: existingLeadInfo,
      }, { status: 409 });
    }

    const status = body.status || 'PENDING';
    const notes = body.notes || '';
    const fieldsArray = buildFieldsArray(fields);

    // Create the lead with proper fields format and assign organization
    const lead = await Lead.create({
      firstName: body.firstName,
      lastName: body.lastName,
      fullNameNormalized,
      email: body.email,
      emailNormalized: normalizedEmail || undefined,
      phone: digitsOnlyPhone(body.phone) || body.phone,
      phoneNormalized: normalizedPhone || undefined,
      dateOfBirth: body.dateOfBirth,
      address: fullAddress,
      streetAddress: body.streetAddress,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      addressNormalized: normalizedAddress || undefined,
      applicationType: body.applicationType,
      lawsuit: body.lawsuit,
      notes,
      status: status,
      fields: fieldsArray,
      createdBy: decoded.id,
      // Assign the user's organization ID to the lead
      organizationId: user?.organizationId || null,
      statusHistory: [
        {
          fromStatus: '',
          toStatus: status,
          notes: 'Lead created',
          changedBy: decoded.id,
          timestamp: new Date()
        }
      ]
    });

    return NextResponse.json({
      message: 'Lead created successfully',
      lead,
      isDuplicate: false,
      duplicateInfo: null,
      fieldErrors: [],
    }, { status: 201 });
  } catch (error) {
    const mongoError = error as { code?: number };
    if (mongoError?.code === 11000) {
      return NextResponse.json(
        { message: 'Duplicate lead detected while saving. Please refresh and review the existing record.' },
        { status: 409 }
      );
    }
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
