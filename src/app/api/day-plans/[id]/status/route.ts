import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

export const PATCH = withAdminAuth(async (request, { supabase, admin }, context?: Context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const status = body.status;

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
