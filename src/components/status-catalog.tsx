'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { LEAD_STATUSES } from '@/lib/lead-utils';

export type LeadStatusOption = { key: string; label: string; color: string };

const readable = (key: string) => {
  const value = key.replace(/[_-]/g, ' ').toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : key;
};

const fallback: LeadStatusOption[] = LEAD_STATUSES.map(key => ({
  key,
  label: readable(key),
  color: '#64748b',
}));

const StatusCatalogContext = createContext<{ statuses: LeadStatusOption[]; refresh: () => void }>({
  statuses: fallback,
  refresh: () => {},
});

export function StatusCatalogProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<LeadStatusOption[]>(fallback);

  const refresh = () => {
    axios.get('/api/lead-statuses')
      .then(res => {
        const next = Array.isArray(res.data?.statuses) ? res.data.statuses : [];
        if (next.length) setStatuses(next);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    refresh();
  }, []);

  return <StatusCatalogContext.Provider value={{ statuses, refresh }}>{children}</StatusCatalogContext.Provider>;
}

export function useLeadStatuses() {
  return useContext(StatusCatalogContext).statuses;
}

export function useRefreshLeadStatuses() {
  return useContext(StatusCatalogContext).refresh;
}
