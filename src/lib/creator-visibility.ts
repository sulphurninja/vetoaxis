const VENDOR_CODE = /^[A-Z0-9-]{1,12}$/;

export function normalizeVendorCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function isValidVendorCode(code: string): boolean {
  return VENDOR_CODE.test(code);
}

type Person = {
  _id?: unknown;
  name?: string;
  email?: string;
  vendorCode?: string;
} | null | undefined;

export function presentPerson(person: Person, role: string) {
  const vendorCode = normalizeVendorCode(person?.vendorCode);
  if (role === 'super_admin') {
    return {
      _id: person?._id,
      name: person?.name || 'System',
      email: person?.email || '',
      vendorCode,
    };
  }
  return { vendorCode };
}

export function redactLeadPeople(lead: any, role: string) {
  if (!lead) return lead;
  const source = typeof lead.toObject === 'function' ? lead.toObject() : lead;
  return {
    ...source,
    createdBy: presentPerson(source.createdBy, role),
    statusHistory: Array.isArray(source.statusHistory)
      ? source.statusHistory.map((entry: any) => ({
          ...entry,
          changedBy: presentPerson(entry.changedBy, role),
        }))
      : source.statusHistory,
  };
}
