import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data: partners, error } = await supabase
      .from('v_partner_performance')
      .select('*')
      .order('name', { ascending: true })
      .limit(500);

    if (error) throw error;

    const rows = partners || [];
    const summary = rows.reduce((acc: Record<string, number>, row: any) => {
      acc.total += 1;
      acc[row.status || 'unknown'] = (acc[row.status || 'unknown'] || 0) + 1;
      acc.featured += row.is_featured ? 1 : 0;
      acc.sponsored += row.is_sponsored ? 1 : 0;
      acc.linkedPlaces += Number(row.linked_places || 0);
      acc.totalLeads += Number(row.total_leads || 0);
      acc.convertedLeads += Number(row.converted_leads || 0);
      acc.campaigns += Number(row.campaigns || 0);
      acc.campaignRevenue += Number(row.campaign_revenue || 0);
      acc.paidPayouts += Number(row.paid_payouts || 0);
      return acc;
    }, {
      total: 0,
      active: 0,
      prospect: 0,
      paused: 0,
      churned: 0,
      archived: 0,
      featured: 0,
      sponsored: 0,
      linkedPlaces: 0,
      totalLeads: 0,
      convertedLeads: 0,
      campaigns: 0,
      campaignRevenue: 0,
      paidPayouts: 0,
    });

    const byTier: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byIsland: Record<string, number> = {};

    for (const row of rows as any[]) {
      byTier[row.tier || 'unknown'] = (byTier[row.tier || 'unknown'] || 0) + 1;
      byType[row.partner_type || 'unknown'] = (byType[row.partner_type || 'unknown'] || 0) + 1;
      byIsland[row.island_name || 'Unassigned'] = (byIsland[row.island_name || 'Unassigned'] || 0) + 1;
    }

    return NextResponse.json({
      summary,
      byTier: Object.entries(byTier).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      byType: Object.entries(byType).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      byIsland: Object.entries(byIsland).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      partners: rows,
    });
  } catch (err: any) {
    console.error('Partners summary API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
