'use client';

import { useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useRefreshLeadStatuses } from '@/components/status-catalog';

export function ClientCodeManager({ codes, onChange }: { codes: string[]; onChange: (codes: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (current: string) => {
    const next = draft.trim().toUpperCase();
    if (!next || next === current) {
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      await axios.patch(`/api/admin/buyer-codes/${encodeURIComponent(current)}`, { code: next });
      onChange(codes.map(code => code === current ? next : code).sort((a, b) => a.localeCompare(b)));
      setEditing(null);
      toast({ title: 'Client code updated', description: `${current} is now ${next}.` });
    } catch (error: any) {
      toast({ title: 'Could not update code', description: error.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(`Delete ${code}? Leads using it will have the client code cleared.`)) return;
    setBusy(true);
    try {
      await axios.delete(`/api/admin/buyer-codes/${encodeURIComponent(code)}`);
      onChange(codes.filter(item => item !== code));
      toast({ title: 'Client code deleted', description: `${code} was removed.` });
    } catch (error: any) {
      toast({ title: 'Could not delete code', description: error.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Client codes</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Client codes</DialogTitle>
            <DialogDescription>Rename a code or delete it. Leads using a deleted code have that field cleared.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {codes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No client codes yet.</p>}
            {codes.map(code => (
              <div key={code} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                {editing === code ? (
                  <Input
                    value={draft}
                    autoFocus
                    className="h-8 font-mono uppercase"
                    onChange={(event) => setDraft(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') save(code);
                      if (event.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 font-mono text-sm font-semibold">{code}</span>
                )}
                {editing === code ? (
                  <Button size="sm" disabled={busy} onClick={() => save(code)}>Save</Button>
                ) : (
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${code}`} onClick={() => { setEditing(code); setDraft(code); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Delete ${code}`} disabled={busy} onClick={() => remove(code)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StatusManager() {
  const refresh = useRefreshLeadStatuses();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ key: string; label: string }[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await axios.get('/api/lead-statuses');
    setRows(data.statuses || []);
  };

  const openManager = async () => {
    setOpen(true);
    try {
      await load();
    } catch {
      toast({ title: 'Could not load statuses', variant: 'destructive' });
    }
  };

  const add = async () => {
    const label = name.trim();
    if (!label) return;
    setBusy(true);
    try {
      const { data } = await axios.post('/api/admin/lead-statuses', { label });
      setRows(data.statuses || []);
      setName('');
      refresh();
      toast({ title: 'Status added', description: label });
    } catch (error: any) {
      toast({ title: 'Could not add status', description: error.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const save = async (current: string) => {
    const label = draft.trim();
    if (!label) return;
    setBusy(true);
    try {
      const { data } = await axios.put(`/api/admin/lead-statuses/${encodeURIComponent(current)}`, { label, key: label });
      setRows(data.statuses || []);
      setEditing(null);
      refresh();
      toast({ title: 'Status updated' });
    } catch (error: any) {
      toast({ title: 'Could not update status', description: error.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={openManager}>Statuses</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Statuses</DialogTitle>
            <DialogDescription>Add a status or rename one. Leads already using a renamed status are updated.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input placeholder="New status name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add(); }} />
            <Button disabled={busy || !name.trim()} onClick={add}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {rows.map(row => (
              <div key={row.key} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                {editing === row.key ? (
                  <Input
                    value={draft}
                    autoFocus
                    className="h-8"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') save(row.key);
                      if (event.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium">{row.label}</span>
                )}
                {editing === row.key ? (
                  <Button size="sm" disabled={busy} onClick={() => save(row.key)}>Save</Button>
                ) : (
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.label}`} onClick={() => { setEditing(row.key); setDraft(row.label); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
