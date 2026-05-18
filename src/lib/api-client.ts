/**
 * api-client.ts — typed fetch wrapper that automatically attaches the current
 * admin's Supabase session JWT to outbound API calls.
 *
 * Why this exists:
 *   - withAdminAuth (src/lib/admin-auth.ts) validates a Bearer token on every
 *     mutating route.
 *   - The Supabase JS client stores the session in localStorage (default), not
 *     cookies, so the JWT is NOT auto-sent with fetch.
 *   - This helper bridges that gap by reading the session and adding the
 *     Authorization header explicitly.
 *
 * Use this for ANY client-side call to a route protected by withAdminAuth.
 * Reads from open routes (the existing useApi hook) can keep using bare fetch
 * for now; this will be folded in during the Phase 2 "lock down all routes" pass.
 *
 * Usage:
 *
 *   import { apiFetch } from '@/lib/api-client';
 *
 *   const res = await apiFetch('/api/ugc', {
 *     method: 'POST',
 *     body: JSON.stringify({ id, action }),
 *   });
 */

import { createBrowserClient } from './supabase';

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Fetch wrapper that attaches `Authorization: Bearer <jwt>` from the current
 * Supabase session. Falls back to plain fetch if no session is present (the
 * route handler will return 401, surfacing the auth issue to the caller).
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const sb = createBrowserClient();
  const { data: { session } } = await sb.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Convenience: JSON POST with auth.
 */
export async function apiPost<TBody, TResp = unknown>(url: string, body: TBody): Promise<TResp> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}
