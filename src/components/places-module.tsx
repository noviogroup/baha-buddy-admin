'use client';

import { AlertTriangle, CheckCircle2, Database, ImageOff, MapPinned, Star, Tags } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type PlacesSummary = {
  summary: {
    total: number;
    active: number;
    hidden: number;
    missingImages: number;
    unverified: number;
    partners: number;
    sourceLinks: number;
  };
  byCategory: { label: string; count: number }[];
  byIsland: { label: string; count: number }[];
  bySource: { label: string; count: number }[];
  recent: {
    id: string;
    name: string;
    category: string;
    island_name: string | null;
    status: string;
    is_active: boolean;
    is_verified: boolean;
    is_partner: boolean;
    primary_image_url: string | null;
    rating: number | null;
    review_count: number | null;
    source_priority: string | null;
  }[];
};

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand-blue">{icon}</span>
        <span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

function MiniBarList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink mb-4">{title}</h3>
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? <div className="text-sm text-muted">No data yet</div> : rows.map(row => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-body capitalize">{row.label.replace(/_/g, ' ')}</span>
              <span className="text-muted">{row.count}</span>
            </div>
            <div className="h-2 rounded-full bg-brand-blue-light overflow-hidden">
              <div className="h-full rounded-full bg-brand-aqua" style={{ width: `${Math.max(5, (row.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlacesModule() {
  const { data, loading, error } = useApi<PlacesSummary>('/api/places/summary');

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="skeleton h-3 w-24 mb-3" /><div className="skeleton h-8 w-24" /></div>)}
        </div>
        <div className="bg-white rounded-xl border border-hairline h-80 shadow-card"><div className="p-5"><div className="skeleton h-4 w-40 mb-6" /><div className="skeleton h-56 w-full" /></div></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Places inventory unavailable</h3>
        <p className="text-sm text-body">{error || 'The places summary API did not return data.'}</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Places Inventory</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Canonical place records are now live. TripAdvisor has been backfilled into Baha Buddy-owned place records with source mappings, ready for admin review and app read-path migration.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success bg-status-success-bg px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Canonical live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<MapPinned size={18} />} label="Canonical Places" value={s.total} sub={`${s.active} active`} />
        <Stat icon={<Database size={18} />} label="Source Links" value={s.sourceLinks} sub="Mapped external records" />
        <Stat icon={<ImageOff size={18} />} label="Missing Images" value={s.missingImages} sub="Needs media extraction/review" />
        <Stat icon={<Star size={18} />} label="Verified / Partners" value={`${s.total - s.unverified}/${s.partners}`} sub="Verified / partner places" />
      </div>

      {s.missingImages > 0 && (
        <div className="bg-status-warning-bg border border-status-warning/20 rounded-xl p-4 text-sm text-status-warning">
          <div className="font-semibold mb-1">Media cleanup required</div>
          <p>TripAdvisor photo payloads are stored in place metadata, but primary image URLs still need a separate extraction/approval step.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <MiniBarList title="By Category" rows={data.byCategory} />
        <MiniBarList title="Top Islands" rows={data.byIsland} />
        <MiniBarList title="By Source" rows={data.bySource} />
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline flex items-center gap-2">
          <Tags size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-ink tracking-tight">Recent canonical places</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Place</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Category</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Island</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Rating</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Source</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map(place => (
                <tr key={place.id} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{place.name}</div>
                    {!place.primary_image_url && <div className="text-[11px] text-status-warning">Missing primary image</div>}
                  </td>
                  <td className="px-4 py-3 capitalize text-body">{place.category}</td>
                  <td className="px-4 py-3 text-body">{place.island_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-body">{place.rating ? `${place.rating} (${place.review_count || 0})` : '—'}</td>
                  <td className="px-4 py-3 text-body capitalize">{place.source_priority || 'manual'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${place.is_active && place.status === 'active' ? 'bg-status-success-bg text-status-success' : 'bg-status-warning-bg text-status-warning'}`}>
                      {place.is_active && place.status === 'active' ? 'Active' : place.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recent.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No canonical places yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
