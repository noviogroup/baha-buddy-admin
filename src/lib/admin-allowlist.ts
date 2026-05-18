/**
 * Admin email allowlist — security-critical gating for the admin panel.
 *
 * Source of truth: the `NEXT_PUBLIC_ADMIN_EMAILS` env var (comma-separated).
 * This module is intentionally framework-free (no React, no Supabase) so it
 * can be unit-tested in isolation. The auth-provider imports it.
 *
 * Default behavior when the allowlist is empty: ALLOW any authenticated user
 * (dev mode). This is convenient but means staging/prod MUST set the env var.
 */

/** Parse the comma-separated env var into a normalized list. */
export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check whether an email is on the admin allowlist.
 *
 * @param email     User's email (case-insensitive). null/undefined → false.
 * @param allowlist Parsed allowlist. Empty array → ALL emails allowed (dev mode).
 */
export function isEmailOnAllowlist(
  email: string | null | undefined,
  allowlist: string[],
): boolean {
  if (!email) return false;
  // Empty allowlist = dev mode = allow any authenticated user.
  if (allowlist.length === 0) return true;
  return allowlist.includes(email.toLowerCase());
}

/**
 * Convenience wrapper for the common case: check directly against the env var.
 * Equivalent to `isEmailOnAllowlist(email, parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_EMAILS))`.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return isEmailOnAllowlist(email, parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_EMAILS));
}
