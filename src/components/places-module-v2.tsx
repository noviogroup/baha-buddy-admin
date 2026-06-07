'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, ImageOff, MapPinned, Search, ShieldCheck, Star, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

type PlaceRow = {
  id: string;
  name: string;
  category: string;
  island_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  primary_image_url: string | null;
  rating: number | null;
  review_count: number | null;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  is_partner: boolean;
  source_priority: string | null;
  partner_count: number;
  partner_links: any[];
};

type PlacesSummary = {
  summary: { total: number; active: number; hidden: number; missingImages: number; unverified: number; partners: number; sourceLinks: number };
  byCategory: { label: string; count: number }[];
  byIsland: { label: string; count: number }[];
  bySource: { label: string; count: number }[];
};

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'gold' | 'red' }) {
  const cls = tone === 'green' ? 'bg-status-success-bg text-status-success' : tone === 'gold' ? 'bg-brand-gold-light text-status-warning' : tone === 'red' ? 'bg-status-danger-bg text-status-danger' : 'bg-brand-blue-light text-brand-blue-dark';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="flex items-center gap-2 mb-2"><span className="text-brand-blue">{icon}</span><span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span></div><div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>{sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}</div>;
}

export function PlacesModuleV2() {
  const { data: summary, loading: summaryLoading, error: summaryError, reload: reloadSummary } = useApi<PlacesSummary>('/api/places/summary');
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [selected, setSelected] = useState<PlaceRow | null>(null);
  const [filters, setFilters] = useState({ q: '', category: 'all', queue: 'all', status: 'all' });

  const loadPlaces = async () => {
    setLoadingPlaces(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.queue !== 'all') params.set('queue', filters.queue);
      if (filters.status !== 'all') params.set('status', filters.status);
      params.set('limit', '100');
      const res = await apiFetch(`/api/places?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Places fetch failed: ${res.status}`);
      const json = await res.json();
      setPlaces(json.places || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingPlaces(false);
    }
  };

  useEffect(() => { loadPlaces(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters.category, filters.queue, filters.status]);

  const updatePlace = async (id: string, patch: Record<string, unknown>) => {
    const res = await apiFetch('/api/places', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || `Update failed: ${res.status}`);
    await loadPlaces();
    await reloadSummary();
    if (selected?.id === id) {
      const json = await res.json().catch(() => null);
      if (json?.place) setSelected({ ...selected, ...json.place });
    }
  };

  if (summaryLoading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (summaryError || !summary) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Places unavailable</h3><p className="text-sm text-body">{summaryError || 'The places summary API did not return data.'}</p></div>;

  const s = summary.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Places Cleanup</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Search and clean canonical places before web/mobile rely fully on them. Verify quality, hide poor records, review image gaps, and see partner-linked places.</p></div><Badge tone="green">Canonical live</Badge></div></div>

      <div className="grid grid-cols-4 gap-3"><Stat icon={<MapPinned size={18} />} label="Canonical Places" value={s.total} sub={`${s.active} active`} /><Stat icon={<ImageOff size={18} />} label="Missing Images" value={s.missingImages} sub="Needs media cleanup" /><Stat icon={<ShieldCheck size={18} />} label="Unverified" value={s.unverified} sub="Needs admin review" /><Stat icon={<Star size={18} />} label="Partner Places" value={s.partners} sub={`${s.sourceLinks} source links`} /></div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card"><div className="grid grid-cols-[1fr_150px_180px_150px_auto] gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') loadPlaces(); }} placeholder="Search places by name" className="w-full border border-hairline rounded-lg pl-9 pr-3 py-2 text-sm" /></div><select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All categories</option><option value="hotel">Hotels</option><option value="restaurant">Restaurants</option><option value="attraction">Attractions</option><option value="activity">Activities</option></select><select value={filters.queue} onChange={e => setFilters({ ...filters, queue: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All queues</option><option value="missing_images">Missing images</option><option value="unverified">Unverified</option><option value="hidden">Hidden</option><option value="partner_linked">Partner linked</option></select><select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All status</option><option value="active">Active</option><option value="hidden">Hidden</option><option value="draft">Draft</option><option value="archived">Archived</option></select><button onClick={loadPlaces} disabled={loadingPlaces} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">{loadingPlaces ? 'Loading…' : 'Search'}</button></div></div>

      {selected && <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden"><div className="px-5 py-4 border-b border-hairline baha-gradient-card flex items-start justify-between"><div><div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Place detail</div><h3 className="text-lg font-display font-bold text-ink">{selected.name}</h3><div className="text-xs text-body mt-1 capitalize">{selected.category} · {selected.island_name || 'Unknown'} · {selected.source_priority || 'source'}</div></div><button onClick={() => setSelected(null)} className="text-muted hover:text-ink"><X size={17} /></button></div><div className="p-5 grid grid-cols-[220px_1fr] gap-5"><div className="h-36 rounded-xl bg-surface border border-hairline flex items-center justify-center overflow-hidden">{selected.primary_image_url ? <img src={selected.primary_image_url} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-muted text-xs"><ImageOff size={28} className="mx-auto mb-2" />No primary image</div>}</div><div className="space-y-3"><div className="flex flex-wrap gap-2"><Badge tone={selected.is_verified ? 'green' : 'gold'}>{selected.is_verified ? 'Verified' : 'Unverified'}</Badge><Badge tone={selected.is_active && selected.status === 'active' ? 'green' : 'red'}>{selected.is_active && selected.status === 'active' ? 'Active' : selected.status}</Badge>{selected.partner_count > 0 && <Badge>{selected.partner_count} partner link(s)</Badge>}</div><p className="text-sm text-body">{selected.description || selected.address || 'No description or address available.'}</p><div className="text-xs text-muted">Rating: {selected.rating ? `${selected.rating} (${selected.review_count || 0})` : '—'} · Website: {selected.website || '—'}</div>{selected.partner_links.length > 0 && <div className="border border-hairline rounded-lg p-3"><div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Linked partners</div>{selected.partner_links.map(link => <div key={link.id} className="text-sm text-body">{link.partners?.name || link.partner_id} <span className="text-xs text-muted">({link.partners?.status || 'partner'})</span></div>)}</div>}<div className="flex gap-2"><button onClick={() => updatePlace(selected.id, { action: 'verify' })} className="px-3 py-1.5 rounded-md bg-status-success-bg text-status-success text-xs font-bold"><CheckCircle2 size={13} className="inline mr-1" /> Verify</button>{selected.is_active && selected.status === 'active' ? <button onClick={() => updatePlace(selected.id, { action: 'hide' })} className="px-3 py-1.5 rounded-md bg-status-warning-bg text-status-warning text-xs font-bold"><EyeOff size={13} className="inline mr-1" /> Hide</button> : <button onClick={() => updatePlace(selected.id, { action: 'show' })} className="px-3 py-1.5 rounded-md bg-brand-blue-light text-brand-blue-dark text-xs font-bold"><Eye size={13} className="inline mr-1" /> Show</button>}</div></div></div></div>}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Places list</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Place</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Category</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Island</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Quality</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Partners</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{places.map(place => <tr key={place.id} className={`border-b border-hairline last:border-0 hover:bg-surface/50 ${selected?.id === place.id ? 'bg-brand-blue-light/60' : ''}`}><td className="px-4 py-3"><div className="font-semibold text-ink">{place.name}</div><div className="text-[11px] text-muted">{!place.primary_image_url ? 'Missing image · ' : ''}{place.source_priority || 'manual'}</div></td><td className="px-4 py-3 capitalize text-body">{place.category}</td><td className="px-4 py-3 text-body">{place.island_name || 'Unknown'}</td><td className="px-4 py-3"><div className="flex gap-1">{place.is_verified ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Review</Badge>}{!place.is_active || place.status !== 'active' ? <Badge tone="red">Hidden</Badge> : null}</div></td><td className="px-4 py-3 text-body">{place.partner_count || 0}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setSelected(place)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface">Detail</button>{!place.is_verified && <button onClick={() => updatePlace(place.id, { action: 'verify' })} className="px-2.5 py-1 rounded-md bg-status-success-bg text-status-success text-[11px] font-bold">Verify</button>}{place.is_active && place.status === 'active' ? <button onClick={() => updatePlace(place.id, { action: 'hide' })} className="px-2.5 py-1 rounded-md bg-status-warning-bg text-status-warning text-[11px] font-bold">Hide</button> : <button onClick={() => updatePlace(place.id, { action: 'show' })} className="px-2.5 py-1 rounded-md bg-brand-blue-light text-brand-blue-dark text-[11px] font-bold">Show</button>}</div></td></tr>)}{places.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No places match the current filters.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
