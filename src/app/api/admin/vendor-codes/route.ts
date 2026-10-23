import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import User from '@/models/User';
import { dbConnect } from '@/lib/dbConnect';

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

    const codes = await User.distinct('vendorCode', {
      vendorCode: { $exists: true, $nin: [null, ''] },
    });
    const vendorCodes = (codes as string[])
      .filter(code => typeof code === 'string' && code.trim())
      .map(code => code.trim().toUpperCase())
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ vendorCodes });
  } catch (error) {
    console.error('Error fetching vendor codes:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
