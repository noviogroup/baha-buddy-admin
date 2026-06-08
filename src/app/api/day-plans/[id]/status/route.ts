import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set(['draft', 'review', 'published', 'archived']);

function getPlanId(request: Request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/day-plans\/([^/]+)\/status$/);
  return match?.[1] || null;
}

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  const id = getPlanId(request);
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === 'string' ? body.status : '';

  if (!id) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: `Invalid status: ${status || 'empty'}` }, { status: 400 });
  }

  const updatePayload = {
    status,
    updated_by: admin.id,
  };

  const { data, error } = await supabase
    .from('cruise_itineraries')
    .update(updatePayload as never)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Plan not found or status was not updated' }, { status: 404 });
  }

  return NextResponse.json({ plan: data });
});
