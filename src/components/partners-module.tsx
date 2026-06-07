'use client';

import { useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, Handshake, Link2, MapPinned, Plus, Search, Target, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

type PartnerRow = {
  id: string;
  name: string;
  partner_type: string;
  tier: string;
  status: string;
  island_name: string | null;
  linked_places: number;
  total_leads: number;
  converted_leads: number;
  campaigns: number;
  campaign_revenue: number;
};

type PartnersResponse = {
  summary: Record<string, number>;
  byTier: { label: string; count: number }[];
  byType: { label: string; count: number }[];
  byIsland: { label: string; count: number }[];
  partners: PartnerRow[];
};

type PlaceSearchResult = {
  id: string;
  name: string;
  category: string;
  island_name: string | null;
  rating: number | null;
  review_count: number | null;
  status: string;
  is_active: boolean;
  source_priority: string | null;
};

type PartnerPlaceLink = {
  id: string;
  partner_id: string;
  place_id: string;
  relationship_type: string;
  created_at: string;
  places?: PlaceSearchResult;
};

function money(value: number) {
  return `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="flex items-center gap-2 mb-2"><span className="text-brand-blue">{icon}</span><span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span></div>
      <div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active' ? 'bg-status-success-bg text-status-success' : status === 'prospect' ? 'bg-brand-blue-light text-brand-blue-dark' : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}

export function PartnersModule() {
  const { data, loading, error, reload } = useApi<PartnersResponse>('/api/partners/summary');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [placeLinks, setPlaceLinks] = useState<PartnerPlaceLink[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [form, setForm] = useState({ name: '', partner_type: 'vendor', tier: 'standard', status: 'prospect', island_name: '', contact_name: '', contact_email: '', website: '' });

  const submitPartner = async () => {
    if (!form.name.trim()) return alert('Partner name is required');
    setSaving(true);
    try {
      const res = await apiFetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Create failed: ${res.status}`);
      setForm({ name: '', partner_type: 'vendor', tier: 'standard', status: 'prospect', island_name: '', contact_name: '', contact_email: '', website: '' });
      setShowForm(false);
      await reload();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const loadPartnerLinks = async (partnerId: string) => {
    const res = await apiFetch(`/api/partner-places?partner_id=${partnerId}`);
    if (!res.ok) return setPlaceLinks([]);
    const json = await res.json();
    setPlaceLinks(json.links || []);
  };

  const openLinking = async (partner: PartnerRow) => {
    setSelectedPartner(partner);
    setPlaceQuery(partner.name);
    setPlaces([]);
    await loadPartnerLinks(partner.id);
  };

  const searchPlaces = async () => {
    setPlaceLoading(true);
    try {
      const res = await apiFetch(`/api/places/search?q=${encodeURIComponent(placeQuery)}&limit=25`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const json = await res.json();
      setPlaces(json.places || []);
    } catch (err: any) { alert(err.message); } finally { setPlaceLoading(false); }
  };

  const linkPlace = async (placeId: string) => {
    if (!selectedPartner) return;
    setLinking(true);
    try {
      const res = await apiFetch('/api/partner-places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner_id: selectedPartner.id, place_id: placeId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Link failed: ${res.status}`);
      await loadPartnerLinks(selectedPartner.id);
      await reload();
    } catch (err: any) { alert(err.message); } finally { setLinking(false); }
  };

  const unlinkPlace = async (linkId: string) => {
    if (!selectedPartner) return;
    if (!confirm('Unlink this place from the partner?')) return;
    const res = await apiFetch(`/api/partner-places?id=${linkId}`, { method: 'DELETE' });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || `Unlink failed: ${res.status}`);
    await loadPartnerLinks(selectedPartner.id);
    await reload();
  };

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Partners unavailable</h3><p className="text-sm text-body">{error || 'The partners summary API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Partner Ecosystem</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Manage hotels, restaurants, tour operators, transportation providers, guides, sponsors, campaigns, referrals, and linked canonical places.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-blue px-3 py-1.5 rounded-lg hover:bg-brand-blue-dark"><Plus size={13} /> Add Partner</button></div></div>

      {showForm && <div className="bg-white rounded-xl border border-hairline p-5 shadow-card"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-ink">Create partner</h3><button onClick={() => setShowForm(false)} className="text-muted hover:text-ink"><X size={16} /></button></div><div className="grid grid-cols-4 gap-3"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Partner name" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><select value={form.partner_type} onChange={e => setForm({ ...form, partner_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="vendor">Vendor</option><option value="hotel">Hotel</option><option value="restaurant">Restaurant</option><option value="tour_operator">Tour Operator</option><option value="transportation">Transportation</option><option value="guide">Guide</option><option value="attraction">Attraction</option><option value="sponsor">Sponsor</option></select><select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="free">Free</option><option value="standard">Standard</option><option value="featured">Featured</option><option value="premium">Premium</option><option value="sponsor">Sponsor</option></select><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="prospect">Prospect</option><option value="active">Active</option><option value="paused">Paused</option></select><input value={form.island_name} onChange={e => setForm({ ...form, island_name: e.target.value })} placeholder="Island" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Contact name" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="Contact email" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="Website" className="border border-hairline rounded-lg px-3 py-2 text-sm" /></div><div className="flex justify-end mt-4"><button onClick={submitPartner} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">{saving ? 'Saving…' : 'Create Partner'}</button></div></div>}

      <div className="grid grid-cols-4 gap-3"><Stat icon={<BriefcaseBusiness size={18} />} label="Partners" value={s.total || 0} sub={`${s.active || 0} active · ${s.prospect || 0} prospects`} /><Stat icon={<MapPinned size={18} />} label="Linked Places" value={s.linkedPlaces || 0} sub="Connected to canonical places" /><Stat icon={<Target size={18} />} label="Leads" value={s.totalLeads || 0} sub={`${s.convertedLeads || 0} converted`} /><Stat icon={<Handshake size={18} />} label="Campaign Revenue" value={money(s.campaignRevenue || 0)} sub={`${s.campaigns || 0} campaigns`} /></div>

      {selectedPartner && <div className="bg-white rounded-xl border border-hairline p-5 shadow-card"><div className="flex items-start justify-between gap-4 mb-4"><div><h3 className="text-sm font-semibold text-ink">Link places for {selectedPartner.name}</h3><p className="text-xs text-muted">Search canonical places and connect this partner to the official Baha Buddy place record.</p></div><button onClick={() => setSelectedPartner(null)} className="text-muted hover:text-ink"><X size={16} /></button></div><div className="flex gap-2 mb-4"><input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchPlaces(); }} placeholder="Search places by name" className="flex-1 border border-hairline rounded-lg px-3 py-2 text-sm" /><button onClick={searchPlaces} disabled={placeLoading} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60"><Search size={14} className="inline mr-1" /> {placeLoading ? 'Searching…' : 'Search'}</button></div><div className="grid grid-cols-2 gap-4"><div><div className="text-[11px] text-muted font-bold uppercase tracking-wider mb-2">Search results</div><div className="border border-hairline rounded-lg overflow-hidden">{places.length === 0 ? <div className="p-4 text-sm text-muted">No search results yet.</div> : places.map(place => <div key={place.id} className="p-3 border-b border-hairline last:border-0 flex items-center justify-between gap-3"><div><div className="font-semibold text-sm text-ink">{place.name}</div><div className="text-[11px] text-muted capitalize">{place.category} · {place.island_name || 'Unknown'} · {place.source_priority || 'source'}</div></div><button disabled={linking} onClick={() => linkPlace(place.id)} className="px-2.5 py-1 rounded-md bg-brand-blue-light text-brand-blue-dark text-[11px] font-bold hover:bg-brand-aqua-light"><Link2 size={12} className="inline mr-1" /> Link</button></div>)}</div></div><div><div className="text-[11px] text-muted font-bold uppercase tracking-wider mb-2">Linked places</div><div className="border border-hairline rounded-lg overflow-hidden">{placeLinks.length === 0 ? <div className="p-4 text-sm text-muted">No places linked yet.</div> : placeLinks.map(link => <div key={link.id} className="p-3 border-b border-hairline last:border-0 flex items-center justify-between gap-3"><div><div className="font-semibold text-sm text-ink">{link.places?.name || link.place_id}</div><div className="text-[11px] text-muted capitalize">{link.places?.category || 'place'} · {link.places?.island_name || 'Unknown'} · {link.relationship_type}</div></div><button onClick={() => unlinkPlace(link.id)} className="text-[11px] text-status-danger font-semibold hover:underline">Unlink</button></div>)}</div></div></div></div>}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink tracking-tight">Partner roster</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Partner</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Type</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Tier</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Places</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{data.partners.map(partner => <tr key={partner.id} className="border-b border-hairline last:border-0 hover:bg-surface/50"><td className="px-4 py-3"><div className="font-semibold text-ink">{partner.name}</div><div className="text-[11px] text-muted">{partner.island_name || 'No island assigned'}</div></td><td className="px-4 py-3 capitalize text-body">{partner.partner_type?.replace(/_/g, ' ')}</td><td className="px-4 py-3 capitalize text-body">{partner.tier}</td><td className="px-4 py-3"><StatusBadge status={partner.status} /></td><td className="px-4 py-3 text-body">{partner.linked_places || 0}</td><td className="px-4 py-3"><button onClick={() => openLinking(partner)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-brand-blue-dark hover:bg-brand-blue-light"><Link2 size={12} className="inline mr-1" /> Link places</button></td></tr>)}{data.partners.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No partners yet.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
