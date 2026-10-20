import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  hint?: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary ring-primary/15',
    success: 'bg-success/12 text-success ring-success/15',
    warning: 'bg-warning/15 text-warning ring-warning/20',
    danger: 'bg-destructive/10 text-destructive ring-destructive/15',
    info: 'bg-chart-2/12 text-chart-2 ring-chart-2/15',
  };

  return (
    <div className="surface group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[28px] font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
        </div>
        <div className={cn('flex size-10 items-center justify-center rounded-xl ring-1', tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
