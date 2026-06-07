'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Link2, MapPinned, Search, Star, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

type PartnerRow = { id: string; name: string; partner_type: string; tier: string; status: string; island_name: string | null };

type PlaceSearchResult = { id: string; name: string; category: string; island_name: string | null; rating: number | null; review_count: number | null; status: string; is_active: boolean; source_priority: string | null };

type PartnerPlaceLink = { id: string; partner_id: string; place_id: string; relationship_type: string; created_at: string; places?: PlaceSearchResult | PlaceSearchResult[] };

function linkedPlace(link: PartnerPlaceLink): PlaceSearchResult | null {
  if (!link.places) return null;
  return Array.isArray(link.places) ? link.places[0] || null : link.places;
}

function PlaceMeta({ place }: { place: PlaceSearchResult }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted mt-1">
      <span className="capitalize">{place.category}</span><span>·</span><span>{place.island_name || 'Unknown island'}</span>
      {place.rating ? <><span>·</span><span className="inline-flex items-center gap-1"><Star size={11} className="text-brand-gold" /> {place.rating} ({place.review_count || 0})</span></> : null}
      <span>·</span><span className="capitalize">{place.source_priority || 'source'}</span>
    </div>
  );
}

export function PartnerPlaceLinker({ partner, onClose, onChanged }: { partner: PartnerRow; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const [query, setQuery] = useState(partner.name);
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [links, setLinks] = useState<PartnerPlaceLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [searching, setSearching] = useState(false);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);

  const loadLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await apiFetch(`/api/partner-places?partner_id=${partner.id}`);
      if (!res.ok) throw new Error(`Could not load linked places: ${res.status}`);
      const json = await res.json();
      setLinks(json.links || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    setQuery(partner.name);
    setPlaces([]);
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  const searchPlaces = async () => {
    setSearching(true);
    try {
      const res = await apiFetch(`/api/places/search?q=${encodeURIComponent(query)}&limit=25`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const json = await res.json();
      setPlaces(json.places || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSearching(false);
    }
  };

  const linkPlace = async (place: PlaceSearchResult) => {
    setSavingPlaceId(place.id);
    try {
      const res = await apiFetch('/api/partner-places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner_id: partner.id, place_id: place.id }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Link failed: ${res.status}`);
      await loadLinks();
      await onChanged();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPlaceId(null);
    }
  };

  const unlinkPlace = async (linkId: string) => {
    if (!confirm('Unlink this place from the partner?')) return;
    const res = await apiFetch(`/api/partner-places?id=${linkId}`, { method: 'DELETE' });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || `Unlink failed: ${res.status}`);
    await loadLinks();
    await onChanged();
  };

  const linkedIds = new Set(links.map(link => link.place_id));

  return (
    <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline baha-gradient-card flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Partner place matching</div>
          <h3 className="text-lg font-display font-bold text-ink tracking-tight">{partner.name}</h3>
          <div className="text-xs text-body mt-1 capitalize">{partner.partner_type?.replace(/_/g, ' ')} · {partner.tier} · {partner.status} · {partner.island_name || 'No island assigned'}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70" title="Close linker"><X size={17} /></button>
      </div>

      <div className="p-5 grid grid-cols-[1.15fr_0.85fr] gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchPlaces(); }} placeholder="Search canonical places by name" className="w-full border border-hairline rounded-lg pl-9 pr-3 py-2 text-sm focus:border-brand-aqua" /></div>
            <button onClick={searchPlaces} disabled={searching} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">{searching ? 'Searching…' : 'Search'}</button>
          </div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Search results</div>
          <div className="border border-hairline rounded-xl overflow-hidden bg-white">
            {places.length === 0 ? <div className="p-8 text-center"><MapPinned size={28} className="mx-auto text-brand-aqua mb-2" /><div className="text-sm font-semibold text-ink">Search for a canonical place</div><div className="text-xs text-muted mt-1">Try the hotel, restaurant, tour company, attraction, or location name.</div></div> : places.map(place => { const alreadyLinked = linkedIds.has(place.id); return <div key={place.id} className="p-3 border-b border-hairline last:border-0 flex items-center justify-between gap-3 hover:bg-surface/60"><div className="min-w-0"><div className="font-semibold text-sm text-ink truncate">{place.name}</div><PlaceMeta place={place} /></div><button disabled={alreadyLinked || savingPlaceId === place.id} onClick={() => linkPlace(place)} className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${alreadyLinked ? 'bg-status-success-bg text-status-success' : 'bg-brand-blue-light text-brand-blue-dark hover:bg-brand-aqua-light disabled:opacity-60'}`}>{alreadyLinked ? <CheckCircle2 size={12} /> : <Link2 size={12} />}{alreadyLinked ? 'Linked' : savingPlaceId === place.id ? 'Linking…' : 'Link'}</button></div>; })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2"><div className="text-[11px] uppercase tracking-wider font-bold text-muted">Linked places</div><button onClick={loadLinks} className="text-[11px] font-semibold text-brand-blue hover:underline">Refresh</button></div>
          <div className="border border-hairline rounded-xl overflow-hidden bg-white">
            {loadingLinks ? <div className="p-4"><div className="skeleton h-4 w-32 mb-3" /><div className="skeleton h-14 w-full" /></div> : links.length === 0 ? <div className="p-8 text-center"><Link2 size={26} className="mx-auto text-muted mb-2" /><div className="text-sm font-semibold text-ink">No linked places yet</div><div className="text-xs text-muted mt-1">Link this partner to the official place record for reporting and future sponsored placements.</div></div> : links.map(link => { const place = linkedPlace(link); return <div key={link.id} className="p-3 border-b border-hairline last:border-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-sm text-ink truncate">{place?.name || link.place_id}</div>{place ? <PlaceMeta place={place} /> : <div className="text-[11px] text-muted mt-1">Canonical place</div>}<div className="text-[10px] text-muted mt-2 uppercase tracking-wide">{link.relationship_type.replace(/_/g, ' ')}</div></div><button onClick={() => unlinkPlace(link.id)} className="p-1.5 rounded-md text-status-danger hover:bg-status-danger-bg" title="Unlink place"><Trash2 size={14} /></button></div></div>; })}
          </div>
        </div>
      </div>
    </div>
  );
}
