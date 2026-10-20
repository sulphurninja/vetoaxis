'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, PenLine, SearchX, Tag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/lead-utils';
import { LeadProfile } from '@/components/lead-profile';
import { formatStatus } from '@/components/status-badge';

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
});

const vendorCodeSchema = z.object({
  buyerCode: z.string().trim().min(1, 'Choose a client code such as C1.'),
});

type StatusFormValues = z.infer<typeof statusUpdateSchema>;
type VendorCodeFormValues = z.infer<typeof vendorCodeSchema>;

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [buyerCodes, setBuyerCodes] = useState<string[]>([]);
  const canAssignVendorCode = user?.role === 'admin' || user?.role === 'super_admin';

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: { status: '', notes: '' },
  });

  const vendorForm = useForm<VendorCodeFormValues>({
    resolver: zodResolver(vendorCodeSchema),
    defaultValues: { buyerCode: '' },
  });

  useEffect(() => {
    const fetchLead = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/leads/${id}`);
        setLead(data.lead);
        form.setValue('status', data.lead.status);
        vendorForm.setValue('buyerCode', data.lead.buyerCode || '');
      } catch {
        toast({ title: "Lead not found", description: "This lead may have been removed or you don't have access.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [id, form, vendorForm]);

  useEffect(() => {
    if (!canAssignVendorCode || searchParams.get('vendor') !== '1') return;
    setVendorDialogOpen(true);
  }, [canAssignVendorCode, searchParams]);

  useEffect(() => {
    if (!canAssignVendorCode) return;
    axios.get('/api/admin/buyer-codes')
      .then(res => setBuyerCodes(res.data?.buyerCodes || []))
      .catch(() => setBuyerCodes([]));
  }, [canAssignVendorCode]);

  const onUpdateStatus: SubmitHandler<StatusFormValues> = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await axios.put(`/api/leads/${id}`, { status: values.status, statusNote: values.notes });
      setLead(data.lead);
      toast({ title: "Status updated", description: `Now ${formatStatus(values.status).toLowerCase()}.` });
      form.setValue('notes', '');
      setStatusDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.response?.data?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdateVendorCode: SubmitHandler<VendorCodeFormValues> = async (values) => {
    const code = values.buyerCode.trim().toUpperCase();
    setSubmitting(true);
    try {
      await axios.put(`/api/admin/leads/${id}/buyer-code`, { buyerCode: code });
      if (code && !buyerCodes.includes(code)) {
        try {
          await axios.post('/api/admin/buyer-codes', { code });
          setBuyerCodes(prev => [...prev, code].sort((a, b) => a.localeCompare(b)));
        } catch {
          setBuyerCodes(prev => prev.includes(code) ? prev : [...prev, code]);
        }
      }
      setLead((current: any) => current ? { ...current, buyerCode: code } : current);
      toast({ title: 'Client code saved', description: `${lead.firstName} ${lead.lastName} is now ${code}.` });
      setVendorDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Client code failed', description: err?.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (
    <Button variant="outline" size="icon" onClick={() => router.back()} className="hidden shrink-0 sm:inline-flex" aria-label="Back">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="surface flex items-center gap-4 p-6">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Skeleton className="h-80 rounded-xl lg:col-span-8" />
            <Skeleton className="h-80 rounded-xl lg:col-span-4" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="surface mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><SearchX className="size-6" /></div>
          <p className="font-semibold">Lead not found</p>
          <p className="text-sm text-muted-foreground">It may have been removed, or you don&apos;t have access to it.</p>
          <Button variant="outline" onClick={() => router.push('/leads')}><ArrowLeft className="h-4 w-4" /> Back to my leads</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <LeadProfile
        lead={lead}
        backButton={backButton}
        onClientCode={canAssignVendorCode ? () => setVendorDialogOpen(true) : undefined}
        showCreatorName={user?.role === 'super_admin'}
        actions={
          <>
            {canAssignVendorCode && (
              <Button variant="outline" onClick={() => setVendorDialogOpen(true)}>
                <Tag className="h-4 w-4" /> Client code
              </Button>
            )}
            {user?.role === 'super_admin' && (
              <Button onClick={() => setStatusDialogOpen(true)}>
                <PenLine className="h-4 w-4" /> Update status
              </Button>
            )}
          </>
        }
      />

      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set client code</DialogTitle>
            <DialogDescription>Pick C1–C5, or type a new code such as C6. New codes are saved for the whole team.</DialogDescription>
          </DialogHeader>
          <Form {...vendorForm}>
            <form onSubmit={vendorForm.handleSubmit(onUpdateVendorCode)} className="space-y-5">
              <FormField control={vendorForm.control} name="buyerCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client code</FormLabel>
                  {buyerCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {buyerCodes.map(code => {
                        const active = (field.value || '').toUpperCase() === code;
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
                <Button type="button" variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save client code
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update status</DialogTitle>
            <DialogDescription>{lead.firstName} {lead.lastName}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateStatus)} className="space-y-5">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {LEAD_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notepad</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[100px]" placeholder="Why is the status changing?" />
                  </FormControl>
                </FormItem>
              )} />
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
