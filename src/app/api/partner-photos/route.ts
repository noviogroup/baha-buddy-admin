import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAdminAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const status = searchParams.get('status') || 'pending';

  let query = supabase
    .from('partner_photo_submissions')
    .select('id,place_id,partner_id,url,alt,type,status,submitted_at,reviewed_at,reviewed_by,rejection_reason,places(name),partners(name)')
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (placeId) query = query.eq('place_id', placeId);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
});

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  const body = await request.json();
  const { id, action, rejectionReason } = body;
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

  const updates: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin?.email || 'admin',
  };
  if (action === 'reject' && rejectionReason) updates.rejection_reason = rejectionReason;

  const { data: submissionRaw, error: fetchErr } = await supabase
    .from('partner_photo_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !submissionRaw) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  const submission = submissionRaw as unknown as { place_id: string; url: string; alt: string; type: string };

  const { error } = await supabase
    .from('partner_photo_submissions')
    .update(updates as never)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === 'approve') {
    const { data: place } = await supabase.from('places').select('gallery_images').eq('id', submission.place_id).single();
    const existing: any[] = Array.isArray((place as any)?.gallery_images) ? (place as any).gallery_images : [];
    const newImage = { url: submission.url, alt: submission.alt || '', type: submission.type || 'gallery', is_primary: false, order: existing.length };
    await supabase
      .from('places')
      .update({ gallery_images: [...existing, newImage], updated_at: new Date().toISOString() } as never)
      .eq('id', submission.place_id);
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}, { requireRole: 'admin' });
