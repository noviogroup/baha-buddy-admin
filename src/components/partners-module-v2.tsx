'use client';

import { useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, Edit3, Handshake, Link2, MapPinned, Plus, Target, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { PartnerPlaceLinker } from '@/components/partner-place-linker';
import { PartnerEditor } from '@/components/partner-editor';

type PartnerRow = {
  id: string;
  name: string;
  partner_type: string;
  tier: string;
  status: string;
  island_name: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  description?: string | null;
  is_featured?: boolean;
  is_sponsored?: boolean;
  linked_places: number;
  total_leads: number;
  converted_leads: number;
  campaigns: number;
  campaign_revenue: number;
};

type PartnersResponse = { summary: Record<string, number>; partners: PartnerRow[] };

const emptyForm = { name: '', partner_type: 'vendor', tier: 'standard', status: 'prospect', island_name: '', contact_name: '', contact_email: '', website: '' };

function money(value: number) { return `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="flex items-center gap-2 mb-2"><span className="text-brand-blue">{icon}</span><span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span></div><div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>{sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active' ? 'bg-status-success-bg text-status-success' : status === 'prospect' ? 'bg-brand-blue-light text-brand-blue-dark' : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}

export function PartnersModuleV2() {
  const { data, loading, error, reload } = useApi<PartnersResponse>('/api/partners/summary');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerRow | null>(null);

  const createPartner = async () => {
    if (!form.name.trim()) return alert('Partner name is required');
    setSaving(true);
    try {
      const res = await apiFetch('/api/partners', { method: 'POST', body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Create failed: ${res.status}`);
      setForm(emptyForm);
      setShowForm(false);
      await reload();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Partners unavailable</h3><p className="text-sm text-body">{error || 'The partners summary API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Partner Ecosystem</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Manage partners, link them to canonical places, and prepare the foundation for leads, campaigns, sponsored placements, and partner reporting.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-blue px-3 py-1.5 rounded-lg hover:bg-brand-blue-dark"><Plus size={13} /> Add Partner</button></div></div>

      {showForm && <div className="bg-white rounded-xl border border-hairline p-5 shadow-card"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-ink">Create partner</h3><button onClick={() => setShowForm(false)} className="text-muted hover:text-ink"><X size={16} /></button></div><div className="grid grid-cols-4 gap-3"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Partner name" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><select value={form.partner_type} onChange={e => setForm({ ...form, partner_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="vendor">Vendor</option><option value="hotel">Hotel</option><option value="restaurant">Restaurant</option><option value="tour_operator">Tour Operator</option><option value="transportation">Transportation</option><option value="guide">Guide</option><option value="attraction">Attraction</option><option value="sponsor">Sponsor</option></select><select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="free">Free</option><option value="standard">Standard</option><option value="featured">Featured</option><option value="premium">Premium</option><option value="sponsor">Sponsor</option></select><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="prospect">Prospect</option><option value="active">Active</option><option value="paused">Paused</option></select><input value={form.island_name} onChange={e => setForm({ ...form, island_name: e.target.value })} placeholder="Island" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Contact name" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="Contact email" className="border border-hairline rounded-lg px-3 py-2 text-sm" /><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="Website" className="border border-hairline rounded-lg px-3 py-2 text-sm" /></div><div className="flex justify-end mt-4"><button onClick={createPartner} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">{saving ? 'Saving…' : 'Create Partner'}</button></div></div>}

      <div className="grid grid-cols-4 gap-3"><StatCard icon={<BriefcaseBusiness size={18} />} label="Partners" value={s.total || 0} sub={`${s.active || 0} active · ${s.prospect || 0} prospects`} /><StatCard icon={<MapPinned size={18} />} label="Linked Places" value={s.linkedPlaces || 0} sub="Connected to canonical places" /><StatCard icon={<Target size={18} />} label="Leads" value={s.totalLeads || 0} sub={`${s.convertedLeads || 0} converted`} /><StatCard icon={<Handshake size={18} />} label="Campaign Revenue" value={money(s.campaignRevenue || 0)} sub={`${s.campaigns || 0} campaigns`} /></div>

      {editingPartner && <PartnerEditor partner={editingPartner} onClose={() => setEditingPartner(null)} onSaved={reload} />}
      {selectedPartner && <PartnerPlaceLinker partner={selectedPartner} onClose={() => setSelectedPartner(null)} onChanged={reload} />}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink tracking-tight">Partner roster</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Partner</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Type</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Tier</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Places</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{data.partners.map(partner => <tr key={partner.id} className={`border-b border-hairline last:border-0 hover:bg-surface/50 ${selectedPartner?.id === partner.id || editingPartner?.id === partner.id ? 'bg-brand-blue-light/60' : ''}`}><td className="px-4 py-3"><div className="font-semibold text-ink">{partner.name}</div><div className="text-[11px] text-muted">{partner.island_name || 'No island assigned'}</div></td><td className="px-4 py-3 capitalize text-body">{partner.partner_type?.replace(/_/g, ' ')}</td><td className="px-4 py-3 capitalize text-body">{partner.tier}</td><td className="px-4 py-3"><StatusBadge status={partner.status} /></td><td className="px-4 py-3 text-body">{partner.linked_places || 0}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><button onClick={() => { setEditingPartner(partner); setSelectedPartner(null); }} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface"><Edit3 size={12} className="inline mr-1" /> Edit</button><button onClick={() => { setSelectedPartner(partner); setEditingPartner(null); }} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-brand-blue-dark hover:bg-brand-blue-light"><Link2 size={12} className="inline mr-1" /> Link places</button></div></td></tr>)}{data.partners.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No partners yet.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
