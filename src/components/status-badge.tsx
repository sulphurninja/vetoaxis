import { STATUS_CONFIG } from '@/app/dashboard/status-registry';
import { normalizeLeadStatus } from '@/lib/lead-utils';
import { cn } from '@/lib/utils';

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(100,116,139,${alpha})`;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

export const statusColor = (status?: string | null) =>
  STATUS_CONFIG[normalizeLeadStatus(status)]?.color || '#64748b';

export const formatStatus = (status?: string | null) => {
  const value = normalizeLeadStatus(status).replace(/[_-]/g, ' ').toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const color = statusColor(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={{
        color,
        borderColor: hexToRgba(color, 0.28),
        backgroundColor: hexToRgba(color, 0.09),
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {formatStatus(status)}
    </span>
  );
}
