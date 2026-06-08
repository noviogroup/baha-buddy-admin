import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const PATCH = withAdminAuth(async (request, { supabase, admin }) => {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 2];
  const body = await request.json();
  const status = body.status;

  if (!id) {
    return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
  }

  if (!['draft', 'review', 'published', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cruise_itineraries')
    .update({ status, updated_by: admin.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data });
});
