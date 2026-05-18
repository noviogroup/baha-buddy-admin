'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api-client';

/**
 * Lightweight data-loading hook used by every page in the admin panel.
 *
 * Behavior:
 *   - Fires apiFetch(url) on mount, attaching the admin's Supabase JWT.
 *   - Re-fires whenever url or any item in deps changes.
 *   - Listens for the global 'admin:refresh' window event (the header
 *     Refresh button dispatches it) and reloads when fired.
 *
 * If url is empty/falsy, the hook short-circuits to a non-loading idle state.
 * This is the standard pattern for conditional fetches:
 *
 *   const { data } = useApi<X>(selectedId ? `/api/x?id=${selectedId}` : '', [selectedId]);
 */
export function useApi<T>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!url) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { reload(); }, [reload, ...deps]);

  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener('admin:refresh', onRefresh);
    return () => window.removeEventListener('admin:refresh', onRefresh);
  }, [reload]);

  return { data, loading, error, reload };
}
