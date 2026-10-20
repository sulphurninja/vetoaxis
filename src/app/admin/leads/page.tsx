'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader, StatCard } from '@/components/page-header';
import { StatusBadge, formatStatus } from '@/components/status-badge';
import { CreatorMark } from '@/components/creator-mark';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Search,
  MoreHorizontal,
  RefreshCw,
  FileEdit,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Tag,
  Inbox,
  X,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';
import { LEAD_STATUSES, normalizeLeadStatus } from '@/lib/lead-utils';

const LEADS_PAGE_SIZE = 30;

const updateLeadSchema = z.object({
  status: z.enum([...LEAD_STATUSES] as [string, ...string[]]),
  notes: z.string().optional(),
  buyerCode: z.string().optional(),
});

type UpdateLeadFormValues = z.infer<typeof updateLeadSchema>;

interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  applicationType: string; 
  createdAt: string;
  createdBy: { name: string; email: string; }; 
  buyerCode?: string;
}

interface UserOption {
  _id?: string;
  id?: string;
  name: string;
  email: string;
}

interface LeadsPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [createdByFilter, setCreatedByFilter] = useState<string>('ALL');
  const [buyerCodeFilter, setBuyerCodeFilter] = useState<string>('ALL');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('ALL');
  const [entryDate, setEntryDate] = useState<string>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [buyerCodes, setBuyerCodes] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });
  const [pagination, setPagination] = useState<LeadsPagination>({ total: 0, page: 1, limit: LEADS_PAGE_SIZE, pages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const { user, loading: authLoading, authChecked } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const updateForm = useForm<UpdateLeadFormValues>({
    resolver: zodResolver(updateLeadSchema),
    defaultValues: { status: 'PENDING', notes: '', buyerCode: '' },
  });

  useEffect(() => {
    if (!authLoading && authChecked && user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, authChecked, user, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !authChecked || !isAdmin) return;
    const load = async () => {
      try {
        const codesRes = await axios.get('/api/admin/buyer-codes');
        setBuyerCodes(codesRes.data?.buyerCodes || []);
        if (isSuperAdmin) {
          const usersRes = await axios.get('/api/admin/users');
          setUsers(usersRes.data?.users || []);
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Failed to load filter data';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    };
    load();
  }, [authLoading, authChecked, isAdmin, isSuperAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const buildLeadParams = useCallback((page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(LEADS_PAGE_SIZE));
    if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
    if (buyerCodeFilter && buyerCodeFilter !== 'ALL') params.set('buyerCode', buyerCodeFilter);
    if (caseTypeFilter && caseTypeFilter !== 'ALL') params.set('applicationType', caseTypeFilter);
    if (entryDate) params.set('entryDate', entryDate);
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (isSuperAdmin && createdByFilter && createdByFilter !== 'ALL') {
      params.set('createdBy', createdByFilter);
    }
    return params;
  }, [statusFilter, buyerCodeFilter, caseTypeFilter, entryDate, debouncedSearchQuery, isSuperAdmin, createdByFilter, user?.id]);

  const fetchLeadsPage = useCallback(async (
    pageToLoad: number,
    options: { replace?: boolean; signal?: AbortSignal } = {}
  ) => {
    const replace = options.replace ?? false;
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
      const params = buildLeadParams(pageToLoad);
      const { data } = await axios.get(`/api/admin/leads?${params.toString()}`, { signal: options.signal });
      const incomingLeads = data.leads || [];

      setLeads((current) => replace ? incomingLeads : [...current, ...incomingLeads]);
      setPagination(data.pagination || { total: incomingLeads.length, page: pageToLoad, limit: LEADS_PAGE_SIZE, pages: pageToLoad });
      setStats(data.stats || {
        total: incomingLeads.length,
        pending: incomingLeads.filter((l: Lead) => l.status === 'PENDING').length,
        verified: incomingLeads.filter((l: Lead) => l.status === 'VERIFIED' || l.status === 'ID_VERIFIED').length,
        rejected: incomingLeads.filter((l: Lead) => l.status === 'REJECTED' || l.status === 'REJECTED_BY_CLIENT').length,
      });
      setErrorMessage('');
    } catch (error: any) {
      if (axios.isCancel(error) || error?.name === 'CanceledError') return;
      const msg = error?.response?.data?.message || error?.message || 'Failed to load leads';
      setErrorMessage(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      if (replace) {
        setLoading(false);
      } else {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [buildLeadParams]);

  useEffect(() => {
    if (authLoading || !authChecked || !isAdmin) return;
    const controller = new AbortController();
    setLeads([]);
    fetchLeadsPage(1, { replace: true, signal: controller.signal });
    return () => controller.abort();
  }, [fetchLeadsPage, reloadKey, authLoading, authChecked, isAdmin]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || loadingMore || pagination.page >= pagination.pages) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting) return;
      fetchLeadsPage(pagination.page + 1);
    }, { rootMargin: '300px 0px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchLeadsPage, loading, loadingMore, pagination.page, pagination.pages]);

  const rememberVendorCode = async (code: string) => {
    if (!code || buyerCodes.includes(code)) return;
    try {
      await axios.post('/api/admin/buyer-codes', { code });
      setBuyerCodes(prev => [...prev, code].sort((a, b) => a.localeCompare(b)));
    } catch {
      setBuyerCodes(prev => prev.includes(code) ? prev : [...prev, code].sort((a, b) => a.localeCompare(b)));
    }
  };

  const onUpdateLead = async (values: UpdateLeadFormValues) => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const code = (values.buyerCode || '').trim().toUpperCase();
      if (isSuperAdmin) {
        await axios.put(`/api/admin/leads/${selectedLead._id}`, { ...values, buyerCode: code });
        if (code) await rememberVendorCode(code);
        toast({ title: "Success", description: "Lead updated" });
      } else {
        if (!code) {
          toast({ title: "Client code required", description: "Choose a client code such as C1.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        await axios.put(`/api/admin/leads/${selectedLead._id}/buyer-code`, { buyerCode: code });
        await rememberVendorCode(code);
        toast({ title: "Success", description: "Client code updated" });
      }
      setUpdateDialogOpen(false);
      setReloadKey((k) => k + 1);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Update failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await axios.delete(`/api/admin/leads/${leadId}`);
      toast({ title: "Success", description: "Lead deleted successfully" });
      setReloadKey((k) => k + 1);
    } catch (error: any) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  const handleUpdateLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    updateForm.setValue('status', normalizeLeadStatus(lead.status) as any);
    updateForm.setValue('notes', '');
    updateForm.setValue('buyerCode', lead.buyerCode || '');
    setUpdateDialogOpen(true);
  };
  const hasFilters = Boolean(
    searchQuery ||
    statusFilter !== 'All' ||
    createdByFilter !== 'ALL' ||
    buyerCodeFilter !== 'ALL' ||
    caseTypeFilter !== 'ALL' ||
    entryDate
  );

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCreatedByFilter('ALL');
    setBuyerCodeFilter('ALL');
    setCaseTypeFilter('ALL');
    setEntryDate('');
  };

  if (authLoading || (authChecked && user && !isAdmin)) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Administration"
          title="Lead Management"
          description="Review every lead across the team. Client codes are assigned on the lead. Vendor codes belong to the person who created it."
          actions={
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          }
        />

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total leads" value={stats.total.toLocaleString()} icon={Users} tone="primary" hint="Matching current filters" />
          <StatCard label="Pending" value={stats.pending.toLocaleString()} icon={Clock} tone="warning" hint="Awaiting review" />
          <StatCard label="Verified" value={stats.verified.toLocaleString()} icon={CheckCircle2} tone="success" hint="Verified or ID verified" />
          <StatCard label="Rejected" value={stats.rejected.toLocaleString()} icon={XCircle} tone="danger" hint="Rejected internally or by client" />
        </div>

        <div className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone…"
                  className="h-9 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span> leads
              </p>
            </div>

            <div className="filter-bar">
              <SlidersHorizontal className="mr-1 h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="All">All statuses</SelectItem>
                  {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                <SelectTrigger size="sm" className="w-[190px]">
                  <SelectValue placeholder="Case type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All case types</SelectItem>
                  {Object.keys(DYNAMIC_FIELDS).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              {isSuperAdmin && (
                <>
                  <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                    <SelectTrigger size="sm" className="w-[170px]">
                      <SelectValue placeholder="Created by" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="ALL">All agents</SelectItem>
                      {users.map((u) => {
                        const id = u._id || u.id || '';
                        if (!id) return null;
                        return <SelectItem key={id} value={id}>{u.name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={buyerCodeFilter} onValueChange={setBuyerCodeFilter}>
                    <SelectTrigger size="sm" className="w-[160px]">
                      <SelectValue placeholder="Client code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All client codes</SelectItem>
                      {buyerCodes.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}
              <div className="w-[150px]">
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
                <TableHead>{isSuperAdmin ? 'Vendor' : 'Vendor code'}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client code</TableHead>
                <TableHead>Entered</TableHead>
                <TableHead className="pr-5 text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-transparent">
                    <TableCell className="pl-5"><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
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
                        <p className="font-semibold text-foreground">No leads found</p>
                        <p className="mt-1 text-sm text-muted-foreground">Nothing matches the current filters.</p>
                      </div>
                      {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead._id}
                      className="group cursor-pointer"
                      onClick={() => router.push(`/admin/leads/${lead._id}`)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                            {`${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{lead.firstName} {lead.lastName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">#{lead._id.slice(-6)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[220px] truncate text-foreground/90">{lead.email}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{lead.phone}</p>
                      </TableCell>
                      <TableCell className="text-foreground/90">{lead.applicationType || 'General'}</TableCell>
                      <TableCell>
                        <CreatorMark person={lead.createdBy} showName={isSuperAdmin} />
                      </TableCell>
                      <TableCell><StatusBadge status={lead.status} /></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleUpdateLeadClick(lead)}
                          className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10"
                        >
                          {lead.buyerCode || 'Assign'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="tabular-nums text-foreground/90">{lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : '—'}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{lead.createdAt ? format(new Date(lead.createdAt), 'h:mm a') : ''}</p>
                      </TableCell>
                      <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => router.push(`/admin/leads/${lead._id}`)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <DropdownMenuItem onClick={() => handleUpdateLeadClick(lead)} className="cursor-pointer">
                                <FileEdit className="mr-2 h-4 w-4" /> Update status
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleUpdateLeadClick(lead)} className="cursor-pointer">
                              <Tag className="mr-2 h-4 w-4" /> Set client code
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDeleteLead(lead._id)}
                                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete lead
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loadingMore && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-14 text-center">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
          <div ref={loadMoreRef} className="h-1" />
          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 text-sm text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-foreground">{leads.length}</span> of{' '}
              <span className="font-semibold text-foreground">{pagination.total}</span> leads
            </span>
            {pagination.page < pagination.pages && !loadingMore && (
              <span className="text-xs">Scroll to load more</span>
            )}
          </div>
        </div>

        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{isSuperAdmin ? 'Status and client code' : 'Set client code'}</DialogTitle>
              <DialogDescription>
                {selectedLead && (
                  <span className="font-medium text-foreground">{selectedLead.firstName} {selectedLead.lastName} · </span>
                )}
                {isSuperAdmin
                  ? 'Change status, add a notepad entry, or assign a client code.'
                  : 'Assign a simple client code such as C1 or C2.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(onUpdateLead)} className="space-y-5">
                {isSuperAdmin && <FormField control={updateForm.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />}
                {isSuperAdmin && <FormField control={updateForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notepad</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Why is this status changing?" className="resize-none" {...field} />
                    </FormControl>
                  </FormItem>
                )} />}
                <FormField control={updateForm.control} name="buyerCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client code</FormLabel>
                    {buyerCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {buyerCodes.map(code => {
                          const active = (field.value || '') === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => field.onChange(code)}
                              className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                                active
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'bg-card text-foreground hover:border-primary/50 hover:bg-accent'
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <FormControl>
                      <Input
                        placeholder="Or type a new code, like C6"
                        className="mt-1 font-mono uppercase"
                        value={field.value || ''}
                        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSuperAdmin ? 'Save changes' : 'Save client code'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
