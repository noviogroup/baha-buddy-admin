/**
 * admin-auth.ts — server-side admin authentication and role enforcement.
 *
 * Today the admin panel gates rendering with NEXT_PUBLIC_ADMIN_EMAILS in
 * src/components/auth-gate.tsx. That env var is shipped to the client, so it's
 * a UX gate, NOT a security boundary. Anyone with network access to /api/*
 * could call the API routes directly.
 *
 * This module fixes that by:
 *   1. Reading ADMIN_EMAILS (server-only) as the source of truth.
 *   2. Verifying the Supabase session JWT on every API request.
 *   3. Loading the admin's role from public.admin_users.
 *   4. Returning an AdminContext that downstream handlers (and logAudit) use.
 *
 * Usage:
 *
 *   import { withAdminAuth } from '@/lib/admin-auth';
 *
 *   export const POST = withAdminAuth(async (req, { supabase, admin }) => {
 *     // admin.id, admin.email, admin.role
 *     // supabase is the service-role client
 *     return NextResponse.json({ ok: true });
 *   }, { requireRole: 'admin' });   // optional: defaults to 'admin'
 */

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase';
import type { Database } from './types';
import type { AdminContext } from './audit-log';

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

// Role hierarchy: super_admin > admin > viewer
const ROLE_RANK: Record<AdminRole, number> = {
  super_admin: 3,
  admin: 2,
  viewer: 1,
};

function meetsRole(actual: AdminRole, required: AdminRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/** Server-only allowlist. Falls back to NEXT_PUBLIC_ADMIN_EMAILS for dev convenience. */
function parseServerAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  if (!raw) return [];
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resolve an admin session from the incoming request and return its context.
 * Returns null if the request is unauthenticated, the email is not on the
 * allowlist, or the user is missing/inactive in admin_users.
 */
export async function resolveAdmin(req: Request): Promise<AdminContext | null> {
  // Pull the Supabase session JWT from the Authorization header (set by the
  // client on every fetch — see _fetchWithAuth below) or fall back to the
  // Supabase cookie pattern.
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  // Cookie fallback — Supabase sets sb-<project-ref>-auth-token cookies
  // when client uses the default cookie storage. We accept either path.
  const cookieHeader = req.headers.get('cookie') || '';
  let cookieJwt: string | null = null;
  if (!bearer && cookieHeader) {
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        // Cookie value is JSON-encoded {access_token, refresh_token, ...}
        const parsed = JSON.parse(decoded);
        cookieJwt = parsed?.access_token || null;
      } catch {
        // ignore malformed cookies
      }
    }
  }

  const jwt = bearer || cookieJwt;
  if (!jwt) return null;

  // Verify the JWT with Supabase Auth
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const verifyClient: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userErr } = await verifyClient.auth.getUser(jwt);
  if (userErr || !userData?.user?.email) return null;

  const email = userData.user.email.toLowerCase();

  // Server-side allowlist check
  const allowlist = parseServerAllowlist();
  if (allowlist.length > 0 && !allowlist.includes(email)) return null;

  // Load role from admin_users (service-role client to bypass RLS)
  const admin = createAdminClient();
  const { data: adminRow, error: adminErr } = await admin
    .from('admin_users')
    .select('id, email, display_name, role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (adminErr) {
    console.error('[admin-auth] admin_users lookup failed', adminErr);
    return null;
  }

  // If admin_users row is missing but email is allowlisted, auto-provision as 'admin'.
  // This is the bootstrap path for new admins: they sign up via Supabase Auth, hit
  // the panel, and on first request we create their admin_users row.
  if (!adminRow) {
    if (allowlist.length === 0 || allowlist.includes(email)) {
      const { data: inserted, error: insertErr } = await admin
        .from('admin_users')
        .insert({
          id: userData.user.id,
          email,
          display_name: userData.user.user_metadata?.display_name || email,
          role: 'admin',
        } as never)
        .select('id, email, role')
        .single();
      if (insertErr || !inserted) {
        console.error('[admin-auth] auto-provision failed', insertErr);
        return null;
      }
      return {
        id: (inserted as { id: string }).id,
        email: (inserted as { email: string }).email,
        role: (inserted as { role: AdminRole }).role,
      };
    }
    return null;
  }

  const row = adminRow as { id: string; email: string; role: AdminRole; active: boolean };
  if (!row.active) return null;

  // Best-effort last_seen update (fire and forget)
  admin
    .from('admin_users')
    .update({ last_seen_at: new Date().toISOString() } as never)
    .eq('id', row.id)
    .then(() => {});

  return { id: row.id, email: row.email, role: row.role };
}

export interface AdminAuthContext {
  supabase: SupabaseClient<Database>;
  admin: AdminContext;
}

export interface WithAdminAuthOptions {
  /** Minimum role required to access this route. Defaults to 'admin'. */
  requireRole?: AdminRole;
}

/**
 * Wrap a Route Handler so it only executes for authenticated admins meeting
 * the required role. Provides supabase (service-role) + admin context.
 */
export function withAdminAuth(
  handler: (req: Request, ctx: AdminAuthContext) => Promise<Response> | Response,
  options: WithAdminAuthOptions = {},
) {
  const requiredRole: AdminRole = options.requireRole ?? 'admin';

  return async function wrapped(req: Request): Promise<Response> {
    const admin = await resolveAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NOT_AUTHENTICATED' },
        { status: 401 },
      );
    }
    if (!meetsRole(admin.role, requiredRole)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'INSUFFICIENT_ROLE',
          required: requiredRole,
          actual: admin.role,
        },
        { status: 403 },
      );
    }
    const supabase = createAdminClient();
    return handler(req, { supabase, admin });
  };
}

/** Imperative variant for code that runs outside a Route Handler. */
export async function requireAdmin(req: Request, requiredRole: AdminRole = 'admin'): Promise<AdminContext> {
  const admin = await resolveAdmin(req);
  if (!admin) throw new Error('NOT_AUTHENTICATED');
  if (!meetsRole(admin.role, requiredRole)) throw new Error('INSUFFICIENT_ROLE');
  return admin;
}
