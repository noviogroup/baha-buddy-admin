import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PartnerRow = {
  id: string;
  name: string;
  partner_type: string | null;
  tier: string | null;
  status: string | null;
  is_featured: boolean | null;
  is_sponsored: boolean | null;
  island_name: string | null;
  created_at: string;
};

export const GET = withAdminAuth(async () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const partnersRes = await fetch(
      `${supabaseUrl}/rest/v1/partners?select=id,name,partner_type,tier,status,is_featured,is_sponsored,island_name,created_at&order=created_at.desc`,
      { headers, cache: 'no-store' },
    );

    if (!partnersRes.ok) {
      const text = await partnersRes.text();
      throw new Error(`partners fetch failed: ${partnersRes.status} ${text}`);
    }

    const placeLinksRes = await fetch(`${supabaseUrl}/rest/v1/partner_places?select=id,partner_id`, { headers, cache: 'no-store' });
    const leadsRes = await fetch(`${supabaseUrl}/rest/v1/partner_leads?select=id,partner_id,status`, { headers, cache: 'no-store' });
    const campaignsRes = await fetch(`${supabaseUrl}/rest/v1/partner_campaigns?select=id,partner_id,revenue_amount`, { headers, cache: 'no-store' });

    const partners = (await partnersRes.json()) as PartnerRow[];
    const placeLinks = placeLinksRes.ok ? await placeLinksRes.json() : [];
    const leads = leadsRes.ok ? await leadsRes.json() : [];
    const campaigns = campaignsRes.ok ? await campaignsRes.json() : [];

    const partnerRows = partners.map(partner => {
      const linkedPlaces = placeLinks.filter((row: any) => row.partner_id === partner.id).length;
      const partnerLeads = leads.filter((row: any) => row.partner_id === partner.id);
      const partnerCampaigns = campaigns.filter((row: any) => row.partner_id === partner.id);
      const campaignRevenue = partnerCampaigns.reduce((sum: number, row: any) => sum + Number(row.revenue_amount || 0), 0);

      return {
        id: partner.id,
        name: partner.name,
        partner_type: partner.partner_type || 'vendor',
        tier: partner.tier || 'standard',
        status: partner.status || 'prospect',
        is_featured: Boolean(partner.is_featured),
        is_sponsored: Boolean(partner.is_sponsored),
        island_name: partner.island_name,
        linked_places: linkedPlaces,
        total_leads: partnerLeads.length,
        converted_leads: partnerLeads.filter((row: any) => row.status === 'converted').length,
        campaigns: partnerCampaigns.length,
        campaign_revenue: campaignRevenue,
        paid_payouts: 0,
      };
    });

    const summary = partnerRows.reduce((acc: Record<string, number>, row: any) => {
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

    for (const row of partnerRows) {
      byTier[row.tier || 'unknown'] = (byTier[row.tier || 'unknown'] || 0) + 1;
      byType[row.partner_type || 'unknown'] = (byType[row.partner_type || 'unknown'] || 0) + 1;
      byIsland[row.island_name || 'Unassigned'] = (byIsland[row.island_name || 'Unassigned'] || 0) + 1;
    }

    const toRows = (obj: Record<string, number>) => Object.entries(obj)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      summary,
      byTier: toRows(byTier),
      byType: toRows(byType),
      byIsland: toRows(byIsland).slice(0, 12),
      partners: partnerRows,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    console.error('Partners summary API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
