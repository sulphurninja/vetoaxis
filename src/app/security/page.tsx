'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ShieldCheck, KeyRound, Check, Circle, Monitor } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'One symbol (recommended)', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const STRENGTH = [
  { label: 'Too weak', className: 'bg-destructive' },
  { label: 'Weak', className: 'bg-destructive' },
  { label: 'Fair', className: 'bg-warning' },
  { label: 'Good', className: 'bg-chart-2' },
  { label: 'Strong', className: 'bg-success' },
];

export default function SecurityPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = form.watch('newPassword') || '';
  const passed = RULES.filter(rule => rule.test(newPassword)).length;
  const strength = STRENGTH[newPassword ? passed : 0];

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      setSubmitting(true);
      await axios.post('/api/auth/update-password', values);
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      form.reset();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.response?.data?.error || "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Account"
          title="Security"
          description="Keep your account safe with a strong, unique password."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-[13px] font-medium text-success">
              <ShieldCheck className="h-4 w-4" /> Account protected
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="surface lg:col-span-7">
            <header className="flex items-center gap-3 border-b px-6 py-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <KeyRound className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">Change password</h2>
                <p className="text-[13px] text-muted-foreground">You&apos;ll stay signed in on this device.</p>
              </div>
            </header>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="Create a new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm new password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="Re-enter new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Password strength</span>
                      <span className="font-semibold text-foreground">{newPassword ? strength.label : '—'}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0, 1, 2, 3].map(index => (
                        <span
                          key={index}
                          className={cn('h-1.5 rounded-full transition-colors', newPassword && index < passed ? strength.className : 'bg-border')}
                        />
                      ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-1.5 pt-1 sm:grid-cols-2">
                      {RULES.map(rule => {
                        const ok = rule.test(newPassword);
                        return (
                          <li key={rule.label} className={cn('flex items-center gap-2 text-[13px]', ok ? 'text-foreground' : 'text-muted-foreground')}>
                            {ok
                              ? <Check className="size-3.5 text-success" strokeWidth={3} />
                              : <Circle className="size-3.5 text-muted-foreground/50" />}
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting} className="min-w-[160px]">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Update password
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>

          <div className="space-y-6 lg:col-span-5">
            <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/[0.08] via-card to-chart-2/[0.06] p-6">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <ShieldCheck className="size-4 text-primary" /> Good habits
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  'Use a password you don\'t use anywhere else',
                  'Mix symbols (!@#) and numbers',
                  'Avoid names, birthdays, or phone numbers',
                  'Change it every 90 days',
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2.5 text-[13px] text-foreground/85">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15">
                      <Check className="size-2.5 text-success" strokeWidth={3} />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface p-6">
              <h3 className="text-[15px] font-semibold">Signed in as</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {(user?.name || 'U').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/30 px-3.5 py-3">
                <Monitor className="size-4 text-muted-foreground" />
                <div className="text-[13px]">
                  <p className="font-medium">This device</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
                <span className="ml-auto size-2 rounded-full bg-success ring-4 ring-success/15" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
