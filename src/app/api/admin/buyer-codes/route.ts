import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import BuyerCode from '@/models/BuyerCode';
import Lead from '@/models/Lead';
import { dbConnect } from '@/lib/dbConnect';

const DEFAULT_CODES = ['C1', 'C2', 'C3', 'C4', 'C5'];

async function ensureDefaults() {
  const count = await BuyerCode.countDocuments();
  if (count > 0) return;
  await BuyerCode.insertMany(
    DEFAULT_CODES.map((code, index) => ({
      code,
      label: code,
      active: true,
      sortOrder: index,
    }))
  );
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!['admin', 'super_admin'].includes(decoded.role as string)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await ensureDefaults();

    const catalog = await BuyerCode.find({ active: true })
      .sort({ sortOrder: 1, code: 1 })
      .lean<{ code: string }[]>();

    const used = await Lead.distinct('buyerCode', {
      buyerCode: { $exists: true, $nin: [null, ''] },
    });
    const catalogCodes = new Set(catalog.map((item) => String(item.code).toUpperCase()));
    const extras = (used as string[])
      .filter(code => typeof code === 'string' && code.trim())
      .map(code => code.trim().toUpperCase())
      .filter(code => !catalogCodes.has(code))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      buyerCodes: [...catalog.map((item) => item.code), ...extras],
      catalog,
    });
  } catch (error) {
    console.error('Error fetching vendor codes:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!['admin', 'super_admin'].includes(decoded.role as string)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code || !/^[A-Z0-9-]{1,12}$/.test(code)) {
      return NextResponse.json({
        message: 'Vendor code must be a short code like C1 or C6.',
      }, { status: 400 });
    }

    await ensureDefaults();

    const existing = await BuyerCode.findOne({ code });
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        await existing.save();
        return NextResponse.json({ buyerCode: existing }, { status: 200 });
      }
      return NextResponse.json({ message: 'Vendor code already exists' }, { status: 409 });
    }

    const count = await BuyerCode.countDocuments();
    const buyerCode = await BuyerCode.create({
      code,
      label: body.label || code,
      active: true,
      sortOrder: count,
    });

    return NextResponse.json({ buyerCode }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ message: 'Vendor code already exists' }, { status: 409 });
    }
    console.error('Error creating vendor code:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
