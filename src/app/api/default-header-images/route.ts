import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit-log';
import { DEFAULT_HEADER_IMAGE_SEEDS, slugifyHeaderScope, type DefaultHeaderImageRecord, type DefaultHeaderType } from '@/lib/default-header-catalog';

export const dynamic = 'force-dynamic';

const HEADER_TYPES: DefaultHeaderType[] = ['global', 'island', 'itinerary_category', 'business_type', 'empty_state'];

function isHeaderType(value: unknown): value is DefaultHeaderType {
  return typeof value === 'string' && HEADER_TYPES.includes(value as DefaultHeaderType);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildScopeKey(headerType: DefaultHeaderType, body: Record<string, unknown>) {
  if (headerType === 'global') return 'global';
  if (headerType === 'island') return slugifyHeaderScope(cleanString(body.island) || cleanString(body.scope_key));
  if (headerType === 'itinerary_category') return slugifyHeaderScope(cleanString(body.category) || cleanString(body.scope_key));
  if (headerType === 'business_type') return slugifyHeaderScope(cleanString(body.business_type) || cleanString(body.scope_key));
  return slugifyHeaderScope(cleanString(body.scope_key) || cleanString(body.title));
}

function normalizePayload(body: Record<string, unknown>, existing?: Partial<DefaultHeaderImageRecord>) {
  const headerType = isHeaderType(body.header_type) ? body.header_type : existing?.header_type;
  if (!headerType) throw new Error('A valid header_type is required.');

  const title = cleanString(body.title) ?? existing?.title;
  const desktopImageUrl = cleanString(body.desktop_image_url) ?? existing?.desktop_image_url;
  const altText = cleanString(body.alt_text) ?? existing?.alt_text ?? title;
  const scopeKey = buildScopeKey(headerType, { ...existing, ...body });

  if (!title) throw new Error('Title is required.');
  if (!desktopImageUrl) throw new Error('Desktop image URL is required.');
  if (!altText) throw new Error('Alt text is required.');
  if (!scopeKey) throw new Error('Scope key could not be generated.');

  return {
    title,
    description: cleanString(body.description),
    header_type: headerType,
    scope_key: scopeKey,
    island: cleanString(body.island),
    category: cleanString(body.category),
    business_type: cleanString(body.business_type),
    desktop_image_url: desktopImageUrl,
    mobile_image_url: cleanString(body.mobile_image_url),
    card_image_url: cleanString(body.card_image_url),
    app_detail_image_url: cleanString(body.app_detail_image_url),
    alt_text: altText,
    is_active: body.is_active === undefined ? existing?.is_active ?? true : Boolean(body.is_active),
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : existing?.sort_order ?? 100,
  } satisfies DefaultHeaderImageRecord;
}

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('default_header_images')
      .select('*')
      .order('header_type', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      // Keep the admin page useful before the migration has run.
      return NextResponse.json({ headers: DEFAULT_HEADER_IMAGE_SEEDS, seeded: true, warning: error.message });
    }

    const headers = data && data.length > 0 ? data : DEFAULT_HEADER_IMAGE_SEEDS;
    return NextResponse.json({ headers, seeded: !data || data.length === 0 });
  } catch (err: any) {
    return NextResponse.json({ headers: DEFAULT_HEADER_IMAGE_SEEDS, seeded: true, warning: err.message });
  }
}, { requireRole: 'admin' });

export const POST = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const payload = normalizePayload(body);
    const { data, error } = await supabase
      .from('default_header_images')
      .insert({ ...payload, created_by: admin.id, updated_by: admin.id } as never)
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({ supabase, admin, request, action: 'default_header_created', entityType: 'default_header_image', entityId: data?.id ?? payload.scope_key, before: null, after: data, metadata: { header_type: payload.header_type, scope_key: payload.scope_key } });

    return NextResponse.json({ success: true, header: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}, { requireRole: 'admin' });

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const body = await request.json();
    const id = cleanString(body.id);
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from('default_header_images').select('*').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: fetchError?.message ?? 'Header image not found' }, { status: 404 });

    const payload = normalizePayload(body, existing as DefaultHeaderImageRecord);
    const { data, error } = await supabase
      .from('default_header_images')
      .update({ ...payload, updated_by: admin.id } as never)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({ supabase, admin, request, action: 'default_header_updated', entityType: 'default_header_image', entityId: id, before: existing, after: data, metadata: { header_type: payload.header_type, scope_key: payload.scope_key } });

    return NextResponse.json({ success: true, header: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}, { requireRole: 'admin' });

export const DELETE = withAdminAuth(async (request, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabase.from('default_header_images').select('*').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: fetchError?.message ?? 'Header image not found' }, { status: 404 });

    const { error } = await supabase.from('default_header_images').delete().eq('id', id);
    if (error) throw error;

    await logAudit({ supabase, admin, request, action: 'default_header_deleted', entityType: 'default_header_image', entityId: id, before: existing, after: null, metadata: {} });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}, { requireRole: 'admin' });
