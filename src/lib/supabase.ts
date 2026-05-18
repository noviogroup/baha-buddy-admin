import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ─── Server-side client (Service Role — full access, bypasses RLS) ───
// Use ONLY in Server Components and API routes
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars — see .env.example');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Client-side (Anon key — respects RLS) ───
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  browserClient = createClient<Database>(url, key);
  return browserClient;
}
