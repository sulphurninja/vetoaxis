export function CreatorMark({ person, showName }: {
  person?: { name?: string; vendorCode?: string } | null;
  showName: boolean;
}) {
  const code = person?.vendorCode;
  if (showName) {
    return (
      <div className="min-w-0">
        <p className="truncate text-foreground/90">{person?.name || 'System'}</p>
        <p className="font-mono text-[11px] font-semibold text-muted-foreground">{code || 'No vendor code'}</p>
      </div>
    );
  }
  if (!code) return <span className="text-muted-foreground">—</span>;
  return <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{code}</span>;
}

export function creatorActivityLabel(person: { name?: string; vendorCode?: string } | null | undefined, showName: boolean) {
  const code = person?.vendorCode;
  if (showName) {
    const name = person?.name || 'System';
    return code ? `${name} · ${code}` : name;
  }
  return code || '—';
}
