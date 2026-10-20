'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, History, ChevronRight, ChevronLeft,
  Plus, ArrowUpRight, X, Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';
import { LEAD_STATUSES } from '@/lib/lead-utils';
import { PageHeader } from '@/components/page-header';
import { StatusBadge, formatStatus } from '@/components/status-badge';
import { CreatorMark, creatorActivityLabel } from '@/components/creator-mark';

const PAGE_SIZE = 10;

const initialsOf = (lead: any) =>
  `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase() || '—';

export default function ClientLeads() {
  const { user, loading: authLoading, authChecked } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [caseTypeFilter, setCaseTypeFilter] = useState(searchParams.get('applicationType') || '');
  const [entryDate, setEntryDate] = useState(searchParams.get('entryDate') || '');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; lead: any | null }>({ open: false, lead: null });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filterSignature = `${statusFilter}|${debouncedSearch}|${entryDate}|${caseTypeFilter}`;
  const lastFilter = useRef(filterSignature);
  const hasFilters = Boolean(searchInput || (statusFilter && statusFilter !== 'All') || entryDate || caseTypeFilter);

  useEffect(() => {
    if (!authChecked || authLoading || !user) return;

    if (lastFilter.current !== filterSignature) {
      lastFilter.current = filterSignature;
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
        return;
      }
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(PAGE_SIZE),
          search: debouncedSearch,
        });
        if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
        if (entryDate) params.set('entryDate', entryDate);
        if (caseTypeFilter) params.set('applicationType', caseTypeFilter);
        const { data } = await axios.get(`/api/leads?${params.toString()}`);
        if (cancelled) return;
        setLeads(data.leads || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total ?? 0,
          pages: data.pagination?.pages ?? 0,
          limit: data.pagination?.limit ?? prev.limit,
        }));
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, authChecked, authLoading, pagination.page, filterSignature, statusFilter, debouncedSearch, entryDate, caseTypeFilter]);

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('All');
    setEntryDate('');
    setCaseTypeFilter('');
  };

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Workspace"
          title="My Leads"
          description="Search and filter every lead you've submitted. Duplicates are blocked before they save."
          actions={
            <Button onClick={() => router.push('/leads/create')}>
              <Plus className="h-4 w-4" /> New lead
            </Button>
          }
        />

        <div className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, address…"
                className="h-9 pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="filter-bar">
              <Select value={statusFilter || 'All'} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="All">All statuses</SelectItem>
                  {LEAD_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={caseTypeFilter || 'All'} onValueChange={(value) => setCaseTypeFilter(value === 'All' ? '' : value)}>
                <SelectTrigger size="sm" className="w-[190px]">
                  <SelectValue placeholder="All case types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All case types</SelectItem>
                  {Object.keys(DYNAMIC_FIELDS).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-[160px]">
                <DateInput value={entryDate} onChange={setEntryDate} placeholder="Entry date" className="h-8 text-sm" />
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Lead name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Case type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client code</TableHead>
                <TableHead>{user?.role === 'super_admin' ? 'Vendor' : 'Vendor code'}</TableHead>
                <TableHead>Entered</TableHead>
                <TableHead className="pr-5 text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-transparent">
                    <TableCell className="pl-5"><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Inbox className="size-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{hasFilters ? 'No leads match these filters' : 'No leads yet'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hasFilters ? 'Try a different status, case type, or date.' : 'Create your first lead to get started.'}
                        </p>
                      </div>
                      {hasFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                      ) : (
                        <Button size="sm" onClick={() => router.push('/leads/create')}><Plus className="h-4 w-4" /> New lead</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : leads.map((lead) => (
                <TableRow
                  key={lead._id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/leads/${lead._id}`)}
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        {initialsOf(lead)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{lead.firstName} {lead.lastName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">#{String(lead._id).slice(-6)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[220px] truncate text-foreground/90">{lead.email || '—'}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{lead.phone || '—'}</p>
                  </TableCell>
                  <TableCell className="text-foreground/90">{lead.applicationType || '—'}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell>
                    {(user?.role === 'admin' || user?.role === 'super_admin') ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/leads/${lead._id}?vendor=1`);
                        }}
                        className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10"
                      >
                        {lead.buyerCode || 'Assign'}
                      </button>
                    ) : lead.buyerCode ? (
                      <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{lead.buyerCode}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CreatorMark person={lead.createdBy} showName={user?.role === 'super_admin'} />
                  </TableCell>
                  <TableCell>
                    <p className="tabular-nums text-foreground/90">{format(new Date(lead.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{format(new Date(lead.createdAt), 'h:mm a')}</p>
                  </TableCell>
                  <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon-sm" title="Activity history" onClick={() => setHistoryDialog({ open: true, lead })}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Open lead" onClick={() => router.push(`/leads/${lead._id}`)}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {pagination.total === 0
                ? 'No results'
                : <>Showing <span className="font-semibold text-foreground">{rangeStart}–{rangeEnd}</span> of <span className="font-semibold text-foreground">{pagination.total}</span></>}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                {pagination.page} / {pagination.pages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={historyDialog.open} onOpenChange={(open) => !open && setHistoryDialog({ open: false, lead: null })}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Activity history
            </DialogTitle>
            <DialogDescription>
              {historyDialog.lead?.firstName} {historyDialog.lead?.lastName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[420px]">
            <ol className="relative space-y-5 px-6 py-5">
              <span className="absolute bottom-5 left-[29px] top-6 w-px bg-border" aria-hidden />
              {historyDialog.lead?.statusHistory?.length > 0 ? (
                [...historyDialog.lead.statusHistory].reverse().map((log: any, i: number) => (
                  <li key={i} className="relative flex gap-4 pl-0">
                    <span className="relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2 border-card bg-primary ring-4 ring-primary/15" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={log.toStatus} />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground/85">{log.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">by {creatorActivityLabel(log.changedBy, user?.role === 'super_admin')}</p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="py-8 text-center text-sm text-muted-foreground">No history recorded for this lead yet.</li>
              )}
            </ol>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
