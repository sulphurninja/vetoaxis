'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { Activity, Clock3, LogIn, LogOut, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SessionUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type SessionOrg = {
  _id: string;
  name: string;
};

type SessionRecord = {
  _id: string;
  sessionId: string;
  userId: SessionUser;
  organizationId?: SessionOrg;
  loginAt: string;
  logoutAt?: string;
  lastSeenAt: string;
  isActive: boolean;
  logoutReason?: string;
  loginIp?: string;
  logoutIp?: string;
};

type SessionsApiResponse = {
  summary: {
    onlineUsers: number;
    todayLogins: number;
    todayLogouts: number;
    onlineWindowMs: number;
  };
  activeSessions: SessionRecord[];
  recentSessions: SessionRecord[];
  recentPagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const RECENT_SESSIONS_PAGE_SIZE = 30;

export default function AdminSessionsPage() {
  const router = useRouter();
  const { user, loading: authLoading, authChecked } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [data, setData] = useState<SessionsApiResponse | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchSessions = useCallback(async (page = 1, options: { replace?: boolean } = {}) => {
    const replace = options.replace ?? page === 1;
    if (replace) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoading(true);
    } else {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const response = await axios.get<SessionsApiResponse>(
        `/api/admin/sessions?page=${page}&limit=${RECENT_SESSIONS_PAGE_SIZE}`
      );
      setData((current) => {
        if (replace || !current) return response.data;

        return {
          ...response.data,
          recentSessions: [
            ...(current.recentSessions || []),
            ...(response.data.recentSessions || []),
          ],
        };
      });
    } catch (error: any) {
      if (error?.response?.status === 403) {
        router.replace('/dashboard');
        return;
      }
      console.error('Error loading sessions:', error);
    } finally {
      if (replace) {
        setLoading(false);
      } else {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (authLoading || !authChecked || !user) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
      return;
    }
    void fetchSessions(1, { replace: true });
    const timer = window.setInterval(() => {
      void fetchSessions(1, { replace: true });
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [authLoading, authChecked, user, isSuperAdmin, router, fetchSessions]);

  useEffect(() => {
    const target = loadMoreRef.current;
    const pagination = data?.recentPagination;
    if (!target || loading || loadingMore || !pagination || pagination.page >= pagination.pages) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting) return;
      void fetchSessions(pagination.page + 1, { replace: false });
    }, { rootMargin: '300px 0px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, [data?.recentPagination, fetchSessions, loading, loadingMore]);

  const onlineWindowLabel = useMemo(() => {
    if (!data?.summary.onlineWindowMs) return '2 minutes';
    const minutes = Math.max(1, Math.round(data.summary.onlineWindowMs / 60000));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }, [data]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading session activity...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <p className="eyebrow">Administration</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Sessions</h1>
            <p className="text-sm text-muted-foreground">
              Live presence and login/logout history. Online is based on heartbeat within {onlineWindowLabel}.
            </p>
          </div>
          <Button onClick={() => void fetchSessions(1, { replace: true })} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Online now" value={data?.summary.onlineUsers ?? 0} icon={Activity} tone="success" hint={`Heartbeat within ${onlineWindowLabel}`} />
          <StatCard label="Logins today" value={data?.summary.todayLogins ?? 0} icon={LogIn} tone="primary" />
          <StatCard label="Logouts today" value={data?.summary.todayLogouts ?? 0} icon={LogOut} tone="info" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Currently Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.activeSessions ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No active sessions right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.activeSessions ?? []).map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <div className="font-medium">{session.userId?.name || 'Unknown User'}</div>
                        <div className="text-xs text-muted-foreground">{session.userId?.email || '-'}</div>
                      </TableCell>
                      <TableCell>{session.userId?.role || '-'}</TableCell>
                      <TableCell>{session.organizationId?.name || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(session.loginAt), 'PPp')}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(session.lastSeenAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                          <span className="size-1.5 rounded-full bg-success" /> Online
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Login / Logout Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Logout</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentSessions ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No audit records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.recentSessions ?? []).map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <div className="font-medium">{session.userId?.name || 'Unknown User'}</div>
                        <div className="text-xs text-muted-foreground">{session.userId?.email || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {session.sessionId.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{format(new Date(session.loginAt), 'PPp')}</TableCell>
                      <TableCell>
                        {session.logoutAt ? (
                          format(new Date(session.logoutAt), 'PPp')
                        ) : (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <Clock3 className="h-3 w-3" />
                            Not logged out
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(session.lastSeenAt), 'PPp')}</TableCell>
                      <TableCell>{session.logoutReason || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
                {loadingMore && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center">
                      <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div ref={loadMoreRef} className="h-1" />
            <div className="pt-4 text-sm text-muted-foreground">
              Showing {(data?.recentSessions ?? []).length} of {data?.recentPagination.total ?? 0} audit records
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
