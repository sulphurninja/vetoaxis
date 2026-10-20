'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  PenLine,
  Tag,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import DashboardLayout from '@/components/DashboardLayout';
import { LEAD_STATUSES, normalizeLeadStatus } from '@/lib/lead-utils';
import { LeadProfile } from '@/components/lead-profile';
import { StatusBadge, formatStatus } from '@/components/status-badge';

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
  dateOfBirth: string;
  address: string;
  applicationType: string;
  lawsuit: string;
  notes: string;
  status: string;
  buyerCode?: string;
  fields: { key: string; value: string }[];
  statusHistory: {
    _id: string;
    fromStatus: string;
    toStatus: string;
    notes: string;
    timestamp: string;
    changedBy: {
      _id: string;
      name: string;
      email: string;
    };
  }[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, authChecked } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const [buyerCodes, setBuyerCodes] = useState<string[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateForm = useForm<UpdateLeadFormValues>({
    resolver: zodResolver(updateLeadSchema),
    defaultValues: {
      status: 'PENDING',
      notes: '',
      buyerCode: '',
    },
  });

  useEffect(() => {
    if (authLoading || !authChecked || !isAdmin) return;
    if (params.id) {
      fetchLeadDetails(params.id as string);
    }
  }, [params.id, authLoading, authChecked, isAdmin]);

  useEffect(() => {
    if (authLoading || !authChecked || !isAdmin) return;
    axios.get('/api/admin/buyer-codes')
      .then(res => setBuyerCodes(res.data?.buyerCodes || []))
      .catch(() => setBuyerCodes([]));
  }, [authLoading, authChecked, isAdmin]);

  useEffect(() => {
    if (!authLoading && authChecked && user && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, authChecked, user, isAdmin, router]);

  const fetchLeadDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/leads/${id}`);
      setLead(data.lead);
      updateForm.setValue('status', normalizeLeadStatus(data.lead.status) as UpdateLeadFormValues['status']);
      updateForm.setValue('buyerCode', data.lead.buyerCode || '');
    } catch (error: any) {
      console.error('Error fetching lead details:', error);
      setError(error.response?.data?.message || 'Failed to load lead details');
      toast({
        title: "Error",
        description: "Failed to load lead details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (values: UpdateLeadFormValues) => {
    if (!lead) return;

    setSubmitting(true);
    try {
      const code = (values.buyerCode || '').trim().toUpperCase();
      if (isSuperAdmin) {
        await axios.put(`/api/admin/leads/${lead._id}`, { ...values, buyerCode: code });
      } else {
        if (!code) {
          toast({ title: 'Client code required', description: 'Choose a client code such as C1.', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        await axios.put(`/api/admin/leads/${lead._id}/buyer-code`, { buyerCode: code });
      }
      if (code && !buyerCodes.includes(code)) {
        try {
          await axios.post('/api/admin/buyer-codes', { code });
          setBuyerCodes(prev => [...prev, code].sort((a, b) => a.localeCompare(b)));
        } catch {
          setBuyerCodes(prev => prev.includes(code) ? prev : [...prev, code]);
        }
      }
      toast({
        title: "Success",
        description: isSuperAdmin ? "Lead updated successfully" : "Client code updated",
      });
      fetchLeadDetails(lead._id);
      setUpdateDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (
    <Button variant="outline" size="icon" onClick={() => router.push('/admin/leads')} className="hidden shrink-0 sm:inline-flex" aria-label="Back to leads">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  if (authLoading || (authChecked && user && !isAdmin) || loading) {
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

  if (error || !lead) {
    return (
      <DashboardLayout>
        <div className="surface mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertCircle className="size-6" /></div>
          <p className="font-semibold">{error ? "Couldn't load this lead" : 'Lead not found'}</p>
          <p className="text-sm text-muted-foreground">{error || 'The requested lead could not be found.'}</p>
          <Button variant="outline" onClick={() => router.push('/admin/leads')}><ArrowLeft className="h-4 w-4" /> Back to leads</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <LeadProfile
        lead={lead}
        backButton={backButton}
        onClientCode={() => setUpdateDialogOpen(true)}
        showCreatorName={isSuperAdmin}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/admin/leads/edit/${lead._id}`)}>
              <PenLine className="h-4 w-4" /> Edit lead
            </Button>
            <Button onClick={() => setUpdateDialogOpen(true)}>
              <Tag className="h-4 w-4" /> {isSuperAdmin ? 'Status & client code' : 'Set client code'}
            </Button>
          </>
        }
      />

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{isSuperAdmin ? 'Status and client code' : 'Set client code'}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{lead.firstName} {lead.lastName}</span>
              <StatusBadge status={lead.status} className="px-2 py-0 text-[11px]" />
            </DialogDescription>
          </DialogHeader>

          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateStatus)} className="space-y-5">
              {isSuperAdmin && <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {LEAD_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />}

              {isSuperAdmin && <FormField
                control={updateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notepad</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a note about this change (optional)" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />}

              <FormField
                control={updateForm.control}
                name="buyerCode"
                render={({ field }) => (
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
                        placeholder="Or type a new client code, like C6"
                        className="mt-1 font-mono uppercase"
                        value={field.value || ''}
                        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
    </DashboardLayout>
  );
}
