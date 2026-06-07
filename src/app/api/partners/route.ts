import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const VALID_TYPES = ['hotel', 'restaurant', 'tour_operator', 'transportation', 'guide', 'attraction', 'visa_service', 'sponsor', 'vendor'];
const VALID_TIERS = ['free', 'standard', 'featured', 'premium', 'sponsor'];
const VALID_STATUSES = ['prospect', 'active', 'paused', 'churned', 'archived'];

type PartnerRow = {
  id: string;
  name: string;
  slug: string;
  partner_type: string;
  tier: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  island_name: string | null;
  description: string | null;
  is_featured: boolean;
  is_sponsored: boolean;
  created_at?: string;
  updated_at?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() || null : undefined;
}

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) return NextResponse.json({ error: 'Partner name is required' }, { status: 400 });

    const partner_type = VALID_TYPES.includes(body.partner_type) ? body.partner_type : 'vendor';
    const tier = VALID_TIERS.includes(body.tier) ? body.tier : 'standard';
    const status = VALID_STATUSES.includes(body.status) ? body.status : 'prospect';

    const row = {
      name,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      partner_type,
      tier,
      status,
      contact_name: typeof body.contact_name === 'string' ? body.contact_name.trim() || null : null,
      contact_email: typeof body.contact_email === 'string' ? body.contact_email.trim() || null : null,
      contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone.trim() || null : null,
      website: typeof body.website === 'string' ? body.website.trim() || null : null,
      island_name: typeof body.island_name === 'string' ? body.island_name.trim() || null : null,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      is_featured: body.is_featured === true,
      is_sponsored: body.is_sponsored === true,
    };

    const { data, error } = await supabase
      .from('partners')
      .insert(row as never)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Partner insert returned no row');

    const partner = data as PartnerRow;

    await logAudit({
      supabase,
      admin,
      request,
      action: 'partner_created',
      entityType: 'partner',
      entityId: partner.id,
      after: partner,
      metadata: { source: 'admin_command_center' },
    });

    return NextResponse.json({ success: true, partner });
  } catch (err: any) {
    console.error('Partner create API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Partner id is required' }, { status: 400 });

    const before = await supabase.from('partners').select('*').eq('id', id).single();
    if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (VALID_TYPES.includes(body.partner_type)) updates.partner_type = body.partner_type;
    if (VALID_TIERS.includes(body.tier)) updates.tier = body.tier;
    if (VALID_STATUSES.includes(body.status)) updates.status = body.status;

    const textFields = ['contact_name', 'contact_email', 'contact_phone', 'website', 'island_name', 'description'];
    for (const field of textFields) {
      const value = cleanText(body[field]);
      if (value !== undefined) updates[field] = value;
    }

    if (typeof body.is_featured === 'boolean') updates.is_featured = body.is_featured;
    if (typeof body.is_sponsored === 'boolean') updates.is_sponsored = body.is_sponsored;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('partners')
      .update(updates as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Partner update returned no row');

    await logAudit({
      supabase,
      admin,
      request,
      action: 'partner_updated',
      entityType: 'partner',
      entityId: id,
      before: before.data,
      after: data,
      metadata: { updates },
    });

    return NextResponse.json({ success: true, partner: data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err: any) {
    console.error('Partner update API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}, { requireRole: 'admin' });
