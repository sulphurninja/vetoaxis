'use client';

import { ReactNode, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight, Briefcase, Calendar, Check, ClipboardList, Copy, History,
  Mail, MapPin, NotebookPen, Phone, Tag, UserRound,
} from 'lucide-react';
import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';
import { StatusBadge } from '@/components/status-badge';
import { creatorActivityLabel } from '@/components/creator-mark';
import { cn } from '@/lib/utils';

export const formatLeadDate = (value?: string | null) => {
  if (!value) return '';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (ymd) return format(new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])), 'MM/dd/yyyy');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'MM/dd/yyyy');
};

const leadAddress = (lead: any) =>
  [lead.streetAddress, lead.city, [lead.state, lead.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', ') ||
  lead.address ||
  '';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
      aria-label="Copy"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function DetailItem({ icon: Icon, label, value, copy, mono }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: ReactNode;
  copy?: string;
  mono?: boolean;
}) {
  return (
    <div className="group flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <p className={cn('break-words text-sm font-medium text-foreground', mono && 'tabular-nums')}>{value || '—'}</p>
          {copy && <CopyButton value={copy} />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('surface p-5', className)}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

export function LeadProfile({ lead, actions, backButton, onClientCode, showCreatorName = false }: {
  lead: any;
  actions?: ReactNode;
  backButton?: ReactNode;
  onClientCode?: () => void;
  showCreatorName?: boolean;
}) {
  const appFields = DYNAMIC_FIELDS[lead.applicationType] || [];
  const fields: { key: string; value: any }[] = lead.fields || [];
  const history: any[] = [...(lead.statusHistory || [])].reverse();
  const address = leadAddress(lead);

  const fieldLabel = (key: string) => appFields.find(f => f.key === key)?.label || key;
  const fieldValue = (key: string, value: any) => {
    const def = appFields.find(f => f.key === key);
    if (def?.type === 'date') return formatLeadDate(String(value || ''));
    return value === undefined || value === null || value === '' ? '—' : String(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="surface relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/[0.08] via-chart-2/[0.06] to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {backButton}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-lg font-bold text-primary-foreground shadow-md shadow-primary/20">
              {`${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{lead.firstName} {lead.lastName}</h1>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className="font-mono">#{String(lead._id).slice(-6).toUpperCase()}</span>
                {lead.applicationType && <span className="flex items-center gap-1"><Briefcase className="size-3.5" />{lead.applicationType}</span>}
                {showCreatorName && (
                  <span className="flex items-center gap-1"><UserRound className="size-3.5" />Created by {lead.createdBy?.name || 'System'}</span>
                )}
                <span className="flex items-center gap-1"><Tag className="size-3.5" />Vendor <span className="font-mono font-semibold text-foreground">{lead.createdBy?.vendorCode || '—'}</span></span>
              </div>
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        <dl className={cn('relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border', showCreatorName ? 'xl:grid-cols-5' : 'md:grid-cols-4')}>
          {[
            { label: 'Created', value: lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy · h:mm a') : '—' },
            { label: 'Last updated', value: lead.updatedAt ? format(new Date(lead.updatedAt), 'MMM d, yyyy · h:mm a') : '—' },
            ...(showCreatorName ? [{ label: 'Created by', value: lead.createdBy?.name || 'System' }] : []),
            {
              label: 'Vendor code',
              value: lead.createdBy?.vendorCode
                ? <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{lead.createdBy.vendorCode}</span>
                : <span className="text-muted-foreground">Not set</span>,
            },
            {
              label: 'Client code',
              value: onClientCode ? (
                <button
                  type="button"
                  onClick={onClientCode}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10"
                >
                  <Tag className="size-3" />
                  {lead.buyerCode || 'Assign code'}
                </button>
              ) : lead.buyerCode ? (
                <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{lead.buyerCode}</span>
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              ),
            },
          ].map(item => (
            <div key={item.label} className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Section title="Contact" icon={Phone}>
              <div className="divide-y divide-border/70">
                <DetailItem icon={Mail} label="Email" value={lead.email} copy={lead.email} />
                <DetailItem icon={Phone} label="Phone" value={lead.phone} copy={lead.phone} mono />
                <DetailItem icon={MapPin} label="Address" value={address} copy={address} />
              </div>
            </Section>
            <Section title="Case" icon={Briefcase}>
              <div className="divide-y divide-border/70">
                <DetailItem icon={Tag} label="Case type" value={lead.applicationType} />
                <DetailItem icon={ClipboardList} label="Lawsuit" value={lead.lawsuit} />
                <DetailItem icon={Calendar} label="Date of birth" value={formatLeadDate(lead.dateOfBirth)} mono />
              </div>
            </Section>
          </div>

          <Section title="Case details" icon={ClipboardList}>
            {fields.length > 0 ? (
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="rounded-lg border bg-muted/30 px-3.5 py-2.5">
                    <p className="text-xs text-muted-foreground">{fieldLabel(field.key)}</p>
                    <p className="mt-0.5 break-words text-sm font-medium text-foreground">{fieldValue(field.key, field.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No case-specific details for this lead.</p>
            )}
          </Section>

          <Section title="Notepad" icon={NotebookPen}>
            {lead.notes ? (
              <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">{lead.notes}</p>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">Nothing written yet.</p>
            )}
          </Section>
        </div>

        <aside className="lg:col-span-4">
          <section className="surface flex max-h-[760px] flex-col lg:sticky lg:top-20">
            <h3 className="flex items-center justify-between border-b px-5 py-4 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2"><History className="size-4 text-primary" /> Activity</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{history.length}</span>
            </h3>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {history.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No status changes yet.</p>
              ) : (
                <ol className="relative space-y-6">
                  <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" aria-hidden />
                  {history.map((entry, index) => (
                    <li key={entry._id || index} className="relative pl-7">
                      <span className={cn(
                        'absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-card',
                        index === 0 ? 'bg-primary ring-4 ring-primary/15' : 'bg-muted-foreground/40'
                      )} />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.fromStatus && entry.fromStatus !== entry.toStatus && (
                            <>
                              <StatusBadge status={entry.fromStatus} className="px-2 py-0 text-[11px] opacity-70" />
                              <ArrowRight className="size-3 text-muted-foreground" />
                            </>
                          )}
                          <StatusBadge status={entry.toStatus} className="px-2 py-0 text-[11px]" />
                        </div>
                        {entry.notes && (
                          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground/85">{entry.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {creatorActivityLabel(entry.changedBy, showCreatorName)} · {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
