import LeadStatus from "@/models/LeadStatus";
import { LEAD_STATUSES, normalizeLeadStatus } from "@/lib/lead-utils";

const CODE = /^[A-Z0-9_-]{1,40}$/;

export type LeadStatusRecord = {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
};

export function statusKeyFromName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function isValidStatusKey(key: string) {
  return CODE.test(key);
}

const labelFromKey = (key: string) => {
  const value = key.replace(/[_-]/g, " ").toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : key;
};

export async function ensureLeadStatuses() {
  const existing = await LeadStatus.countDocuments();
  if (existing > 0) return;
  await LeadStatus.insertMany(
    LEAD_STATUSES.map((key, index) => ({
      key,
      label: labelFromKey(key),
      color: "#64748b",
      sortOrder: index,
      active: true,
    }))
  );
}

export async function listLeadStatuses(): Promise<LeadStatusRecord[]> {
  await ensureLeadStatuses();
  const rows = await LeadStatus.find({ active: true }).sort({ sortOrder: 1, label: 1 }).lean<LeadStatusRecord[]>();
  return rows.map(row => ({
    key: row.key,
    label: row.label,
    color: row.color || "#64748b",
    sortOrder: row.sortOrder || 0,
  }));
}

export async function isAllowedLeadStatus(status?: string | null) {
  const key = normalizeLeadStatus(status);
  if (!key) return false;
  await ensureLeadStatuses();
  const found = await LeadStatus.findOne({ key, active: true }).select("_id").lean();
  return Boolean(found);
}
