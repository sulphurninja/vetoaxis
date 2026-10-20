import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth';
import { dbConnect } from '@/lib/dbConnect';
import SessionActivity from '@/models/SessionActivity';
import { markTimedOutSessions, ONLINE_WINDOW_MS } from '@/lib/session-activity';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await markTimedOutSessions();

    const decoded = getAuthToken(req);
    if (!decoded || typeof decoded !== 'object') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - ONLINE_WINDOW_MS);
    const { searchParams } = new URL(req.url);
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);
    const limitParam = Number.parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const activeSessions = await SessionActivity.find({
      isActive: true,
      lastSeenAt: { $gte: onlineThreshold },
    })
      .populate('userId', 'name email role')
      .populate('organizationId', 'name')
      .sort({ lastSeenAt: -1 })
      .limit(200)
      .lean();

    const recentSessions = await SessionActivity.find({})
      .populate('userId', 'name email role')
      .populate('organizationId', 'name')
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [totalActiveNow, todayLogins, todayLogouts, totalRecentSessions] = await Promise.all([
      SessionActivity.countDocuments({
        isActive: true,
        lastSeenAt: { $gte: onlineThreshold },
      }),
      SessionActivity.countDocuments({
        loginAt: { $gte: todayStart },
      }),
      SessionActivity.countDocuments({
        logoutAt: { $gte: todayStart },
      }),
      SessionActivity.countDocuments({}),
    ]);

    return NextResponse.json({
      summary: {
        onlineUsers: totalActiveNow,
        todayLogins,
        todayLogouts,
        onlineWindowMs: ONLINE_WINDOW_MS,
      },
      activeSessions,
      recentSessions,
      recentPagination: {
        total: totalRecentSessions,
        page,
        limit,
        pages: Math.ceil(totalRecentSessions / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching session activity:', error);
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
