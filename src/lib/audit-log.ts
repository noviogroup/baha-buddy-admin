/**
 * audit-log.ts — central helper for writing to admin_audit_log.
 *
 * EVERY mutating API route must call logAudit() before returning. The plan
 * (Section 11.4) requires this to be the SINGLE point of write so that
 * integration tests can assert "after every mutation, an audit row exists for
 * that entity_id." If you add a new admin mutation route, you must call this.
 *
 * Usage from a Next.js Route Handler:
 *
 *   import { logAudit } from '@/lib/audit-log';
 *   import { withAdminAuth } from '@/lib/admin-auth';
 *
 *   export const POST = withAdminAuth(async (req, { supabase, admin }) => {
 *     const before = await supabase.from('ugc_content').select('*').eq('id', id).single();
 *     const { data: after } = await supabase
 *       .from('ugc_content')
 *       .update({ moderation_status: 'approved' })
 *       .eq('id', id)
 *       .select('*')
 *       .single();
 *
 *     await logAudit({
 *       supabase, admin, request: req,
 *       action: 'ugc_approved',
 *       entityType: 'ugc_content',
 *       entityId: id,
 *       before: before.data,
 *       after,
 *     });
 *
 *     return NextResponse.json({ ok: true });
 *   });
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type AuditEntityType =
  | 'user'
  | 'trip'
  | 'booking'
  | 'passenger'
  | 'ugc_content'
  | 'support_ticket'
  | 'promo_code'
  | 'partner'
  | 'partner_place'
  | 'place'
  | 'default_header_image'
  | 'concierge_order'
  | 'admin_user'
  | 'api_credit_status';

export type AuditAction =
  // Auth
  | 'admin_signed_in' | 'admin_signed_out' | 'admin_role_changed'
  | 'admin_added' | 'admin_removed'
  // Users
  | 'user_suspended' | 'user_unsuspended' | 'user_anonymized'
  | 'user_email_changed' | 'user_data_exported' | 'pii_revealed'
  // Trips
  | 'trip_status_changed' | 'trip_archived' | 'trip_name_changed' | 'trip_admin_note_added'
  // Bookings
  | 'booking_cancelled' | 'booking_refunded' | 'booking_modified' | 'booking_status_updated'
  | 'booking_noshow_marked' | 'goodwill_credit_issued'
  | 'booking_note_added' | 'email_resent'
  // UGC
  | 'ugc_approved' | 'ugc_rejected' | 'ugc_deleted'
  // Support
  | 'ticket_status_changed' | 'ticket_assigned'
  | 'ticket_priority_changed' | 'ticket_admin_reply'
  // Content
  | 'sanity_picks_rotated' | 'google_places_resync' | 'google_places_entry_updated'
  | 'place_updated'
  | 'default_header_created' | 'default_header_updated' | 'default_header_deleted'
  // Concierge
  | 'concierge_order_updated'
  // Partners / promos / keys / billing
  | 'partner_created' | 'partner_updated' | 'partner_status_changed'
  | 'partner_place_linked' | 'partner_place_unlinked'
  | 'promo_created' | 'promo_deactivated' | 'promo_used_manually'
  | 'api_key_status_changed' | 'api_key_rotated'
  | 'billing_credit_updated';

export interface AdminContext {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
}

export interface LogAuditInput {
  supabase: SupabaseClient<Database>;
  admin: AdminContext;
  request?: Request;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

/** Extract IP address from common reverse-proxy headers. */
function extractIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

function extractUserAgent(req?: Request): string | null {
  return req?.headers.get('user-agent') || null;
}

/**
 * Write a single row to admin_audit_log.
 * Throws on database error so callers can rollback or alert.
 */
export async function logAudit(input: LogAuditInput): Promise<{ id: string }> {
  const {
    supabase, admin, request, action, entityType, entityId,
    before, after, metadata = {},
  } = input;

  const row = {
    admin_id: admin.id,
    admin_email: admin.email,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    before_state: before === undefined ? null : (before as Record<string, unknown> | null),
    after_state: after === undefined ? null : (after as Record<string, unknown> | null),
    metadata: metadata as Record<string, unknown>,
    ip_address: extractIp(request),
    user_agent: extractUserAgent(request),
  };

  const { data, error } = await supabase
    .from('admin_audit_log')
    .insert(row as never)
    .select('id')
    .single();

  if (error) {
    // Audit failures must surface. Never silently swallow.
    console.error('[audit-log] failed to write entry', { action, entityType, entityId, error });
    throw new Error(`Audit log write failed: ${error.message}`);
  }

  return { id: (data as { id: string }).id };
}

/**
 * Helper to capture a "before / after" pair around a single update.
 * Avoids the common bug of forgetting to fetch the before state.
 *
 *   await withAuditedUpdate({
 *     supabase, admin, request: req,
 *     table: 'ugc_content', id,
 *     action: 'ugc_approved',
 *     entityType: 'ugc_content',
 *     update: { moderation_status: 'approved' },
 *   });
 */
export async function withAuditedUpdate<T extends Record<string, unknown>>(opts: {
  supabase: SupabaseClient<Database>;
  admin: AdminContext;
  request?: Request;
  table: string;
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  update: T;
  metadata?: Record<string, unknown>;
}): Promise<{ before: unknown; after: unknown; auditId: string }> {
  const { supabase, admin, request, table, id, action, entityType, update, metadata } = opts;

  // 1. Snapshot before
  const beforeRes = await supabase
    .from(table as never)
    .select('*')
    .eq('id', id)
    .single();
  if (beforeRes.error) {
    throw new Error(`Audit pre-fetch failed on ${table}: ${beforeRes.error.message}`);
  }

  // 2. Perform update
  const afterRes = await supabase
    .from(table as never)
    .update(update as never)
    .eq('id', id)
    .select('*')
    .single();
  if (afterRes.error) {
    throw new Error(`Update failed on ${table}: ${afterRes.error.message}`);
  }

  // 3. Log
  const { id: auditId } = await logAudit({
    supabase, admin, request, action,
    entityType, entityId: id,
    before: beforeRes.data, after: afterRes.data, metadata,
  });

  return { before: beforeRes.data, after: afterRes.data, auditId };
}

/**
 * Special-case helper for PII reveals — writes to BOTH pii_access_log
 * (the dedicated table, for compliance queries) and admin_audit_log
 * (for the general audit feed). Both writes are required.
 */
export async function logPiiReveal(opts: {
  supabase: SupabaseClient<Database>;
  admin: AdminContext;
  request?: Request;
  entityType: 'user' | 'booking' | 'passenger';
  entityId: string;
  field: 'passport_number' | 'payment_method_last4' | 'dob' | string;
  reason: string;
}): Promise<void> {
  const { supabase, admin, request, entityType, entityId, field, reason } = opts;

  if (!reason || reason.trim().length < 3) {
    throw new Error('PII reveal requires a reason of at least 3 characters');
  }

  const ip = extractIp(request);
  const ua = extractUserAgent(request);

  // Write to pii_access_log
  const piiRes = await supabase.from('pii_access_log').insert({
    admin_id: admin.id,
    admin_email: admin.email,
    entity_type: entityType,
    entity_id: entityId,
    field,
    reason,
    ip_address: ip,
    user_agent: ua,
  } as never);
  if (piiRes.error) throw new Error(`pii_access_log write failed: ${piiRes.error.message}`);

  // Mirror to admin_audit_log
  await logAudit({
    supabase, admin, request,
    action: 'pii_revealed',
    entityType,
    entityId,
    metadata: { field, reason },
  });
}
