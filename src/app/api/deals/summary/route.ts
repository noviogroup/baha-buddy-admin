import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const now = new Date().toISOString();

    const { data: rawDeals, error } = await supabase
      .from('deals')
      .select('id,active,featured,sponsored,starts_at,ends_at,deal_type');

    if (error) throw error;

    const all = (rawDeals || []) as Array<{
      id: string;
      active: boolean;
      featured: boolean;
      sponsored: boolean;
      starts_at: string | null;
      ends_at: string | null;
      deal_type: string;
    }>;
    const total = all.length;
    const activeCount = all.filter((d: any) => d.active).length;
    const featuredCount = all.filter((d: any) => d.featured).length;
    const sponsoredCount = all.filter((d: any) => d.sponsored).length;

    // Live: active=true AND within date window
    const liveCount = all.filter((d: any) => {
      if (!d.active) return false;
      const started = !d.starts_at || d.starts_at <= now;
      const notExpired = !d.ends_at || d.ends_at >= now;
      return started && notExpired;
    }).length;

    const expiredCount = all.filter((d: any) => d.ends_at && d.ends_at < now).length;

    // Count by deal_type
    const byType: Record<string, number> = {};
    for (const d of all) {
      byType[d.deal_type] = (byType[d.deal_type] || 0) + 1;
    }

    return NextResponse.json(
      { summary: { total, active: activeCount, featured: featuredCount, sponsored: sponsoredCount, live: liveCount, expired: expiredCount, byType } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err: any) {
    console.error('Deals summary error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
