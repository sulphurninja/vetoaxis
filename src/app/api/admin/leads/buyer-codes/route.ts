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
    const catalog = await BuyerCode.find({ active: true }).sort({ sortOrder: 1, code: 1 }).lean<{ code: string }[]>();
    const used = await Lead.distinct('buyerCode', {
      buyerCode: { $exists: true, $nin: [null, ''] },
    });
    const catalogCodes = new Set(catalog.map((item) => String(item.code).toUpperCase()));
    const extras = (used as string[])
      .filter(code => typeof code === 'string' && code.trim())
      .map(code => code.trim().toUpperCase())
      .filter(code => !catalogCodes.has(code));

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
