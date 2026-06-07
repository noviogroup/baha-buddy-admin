import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type PlaceSummaryRow = {
  id: string;
  name: string;
  category: string | null;
  island_name: string | null;
  status: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  is_partner: boolean | null;
  primary_image_url: string | null;
  rating: number | null;
  review_count: number | null;
  source_priority: string | null;
  updated_at: string | null;
};

type PlaceSourceRow = {
  id: string;
  place_id: string;
  source: string | null;
  source_table: string | null;
  source_location_id: string | null;
  last_synced_at: string | null;
};

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data: places, error: placesError } = await supabase
      .from('places')
      .select('id,name,category,island_name,status,is_active,is_verified,is_partner,primary_image_url,rating,review_count,source_priority,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (placesError) throw placesError;

    const { data: sources, error: sourcesError } = await supabase
      .from('place_sources')
      .select('id,place_id,source,source_table,source_location_id,last_synced_at')
      .limit(2000);

    if (sourcesError) throw sourcesError;

    const rows = (places || []) as PlaceSummaryRow[];
    const sourceRows = (sources || []) as PlaceSourceRow[];

    const byCategory: Record<string, number> = {};
    const byIsland: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const place of rows) {
      byCategory[place.category || 'unknown'] = (byCategory[place.category || 'unknown'] || 0) + 1;
      byIsland[place.island_name || 'Unknown'] = (byIsland[place.island_name || 'Unknown'] || 0) + 1;
    }

    for (const source of sourceRows) {
      bySource[source.source || 'unknown'] = (bySource[source.source || 'unknown'] || 0) + 1;
    }

    const missingImages = rows.filter(p => !p.primary_image_url).length;
    const unverified = rows.filter(p => !p.is_verified).length;
    const hidden = rows.filter(p => !p.is_active || p.status !== 'active').length;
    const partners = rows.filter(p => p.is_partner).length;

    return NextResponse.json({
      summary: {
        total: rows.length,
        active: rows.length - hidden,
        hidden,
        missingImages,
        unverified,
        partners,
        sourceLinks: sourceRows.length,
      },
      byCategory: Object.entries(byCategory).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      byIsland: Object.entries(byIsland).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      bySource: Object.entries(bySource).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      recent: rows.slice(0, 12),
    });
  } catch (err: any) {
    console.error('Places summary API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
