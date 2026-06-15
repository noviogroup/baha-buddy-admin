'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Calendar, ChevronDown, ChevronUp, Eye, EyeOff,
  Gift, Plus, Star, Tag, Trash2, X, Zap,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

// ─── Types ───────────────────────────────────────────────────────────────────

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  deal_type: string;
  price_from: number | null;
  cta_label: string | null;
  cta_url: string | null;
  source: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  featured: boolean;
  sponsored: boolean;
  partner_id: string | null;
  partner_name: string | null;
  place_id: string | null;
  place_name: string | null;
  created_at: string;
  updated_at: string;
};

type PartnerOption = { id: string; name: string; partner_type: string };
type PlaceOption = { id: string; name: string; category: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const DEAL_TYPES = [
  { value: 'partner_offer', label: 'Partner Offer' },
  { value: 'featured_place', label: 'Featured Place' },
  { value: 'sponsored_content', label: 'Sponsored Content' },
  { value: 'concierge_upsell', label: 'Concierge Upsell' },
  { value: 'tour_promotion', label: 'Tour Promotion' },
];

const DEAL_TYPE_COLORS: Record<string, string> = {
  partner_offer: 'bg-brand-blue-light text-brand-blue-dark',
  featured_place: 'bg-status-success-bg text-status-success',
  sponsored_content: 'bg-purple-50 text-purple-700',
  concierge_upsell: 'bg-brand-gold-light text-status-warning',
  tour_promotion: 'bg-teal-50 text-teal-700',
};

const EMPTY_FORM: Partial<DealRow> = {
  title: '',
  description: '',
  image: '',
  deal_type: 'partner_offer',
  price_from: undefined as any,
  cta_label: 'Learn More',
  cta_url: '',
  source: '',
  starts_at: '',
  ends_at: '',
  active: true,
  featured: false,
  sponsored: false,
  partner_id: '',
  place_id: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLive(deal: DealRow): boolean {
  if (!deal.active) return false;
  const now = new Date();
  const started = !deal.starts_at || new Date(deal.starts_at) <= now;
  const notExpired = !deal.ends_at || new Date(deal.ends_at) >= now;
  return started && notExpired;
}

function isExpired(deal: DealRow): boolean {
  return !!deal.ends_at && new Date(deal.ends_at) < new Date();
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'gold' | 'red' | 'purple' | 'teal' }) {
  const cls = {
    blue: 'bg-brand-blue-light text-brand-blue-dark',
    green: 'bg-status-success-bg text-status-success',
    gold: 'bg-brand-gold-light text-status-warning',
    red: 'bg-status-danger-bg text-status-danger',
    purple: 'bg-purple-50 text-purple-700',
    teal: 'bg-teal-50 text-teal-700',
  }[tone];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function DealTypeBadge({ type }: { type: string }) {
  const label = DEAL_TYPES.find(d => d.value === type)?.label || type;
  const cls = DEAL_TYPE_COLORS[type] || 'bg-surface text-muted';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm text-body">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-3 pt-4 border-t border-hairline">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-semibold text-body mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Edit/Create panel ────────────────────────────────────────────────────────

function DealPanel({
  deal,
  partners,
  places,
  onClose,
  onSaved,
}: {
  deal: Partial<DealRow> | null;
  partners: PartnerOption[];
  places: PlaceOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !deal?.id;
  const [form, setForm] = useState<Partial<DealRow>>(deal ? { ...deal } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof DealRow, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.title?.trim()) return alert('Title is required');
    if (!form.deal_type) return alert('Deal type is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Convert empty strings to null for optional fields
        partner_id: form.partner_id || null,
        place_id: form.place_id || null,
        price_from: form.price_from || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      const res = await apiFetch('/api/deals', {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Save failed: ${res.status}`);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'border border-hairline rounded-lg px-3 py-2 text-sm w-full';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline baha-gradient-card flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-0.5">
              {isNew ? 'New Deal / Placement' : 'Edit Deal / Placement'}
            </div>
            <h3 className="text-lg font-display font-bold text-ink">{form.title || 'Untitled'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isNew ? 'Create Deal' : 'Save Changes'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface text-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          <Section title="Basic Info">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title *">
                <input
                  value={form.title || ''}
                  onChange={e => set('title', e.target.value)}
                  className={inp}
                  placeholder="e.g. 20% Off at Atlantis, Paradise Island"
                />
              </Field>
              <Field label="Deal Type *" half>
                <select value={form.deal_type || 'partner_offer'} onChange={e => set('deal_type', e.target.value)} className={`${inp} bg-white`}>
                  {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description || ''}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className={`${inp} resize-none`}
                  placeholder="Short description shown to users"
                />
              </Field>
              <Field label="Image URL" half>
                <input
                  value={form.image || ''}
                  onChange={e => set('image', e.target.value)}
                  className={inp}
                  placeholder="https://…"
                />
              </Field>
              {form.image && (
                <Field label="Preview" half>
                  <img src={form.image} alt="preview" className="h-20 w-full object-cover rounded-lg border border-hairline" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </Field>
              )}
            </div>
          </Section>

          <Section title="CTA & Pricing">
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA Label" half>
                <input
                  value={form.cta_label || ''}
                  onChange={e => set('cta_label', e.target.value)}
                  className={inp}
                  placeholder="Book Now, Learn More, Get Deal…"
                />
              </Field>
              <Field label="Price From (USD)" half>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_from ?? ''}
                  onChange={e => set('price_from', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inp}
                  placeholder="149"
                />
              </Field>
              <Field label="CTA URL">
                <input
                  value={form.cta_url || ''}
                  onChange={e => set('cta_url', e.target.value)}
                  className={inp}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Source Tracking Tag" half>
                <input
                  value={form.source || ''}
                  onChange={e => set('source', e.target.value)}
                  className={inp}
                  placeholder="explore_hero, partner_upsell…"
                />
              </Field>
            </div>
          </Section>

          <Section title="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date / Time" half>
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(form.starts_at || null)}
                  onChange={e => set('starts_at', e.target.value || null)}
                  className={inp}
                />
              </Field>
              <Field label="End Date / Time" half>
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(form.ends_at || null)}
                  onChange={e => set('ends_at', e.target.value || null)}
                  className={inp}
                />
              </Field>
              <div className="col-span-2 text-[11px] text-muted">
                Leave blank for evergreen deals with no expiry. Mobile Explore queries active deals within the start/end window.
              </div>
            </div>
          </Section>

          <Section title="Visibility & Flags">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 grid grid-cols-3 gap-4 py-1">
                <Toggle checked={!!form.active} onChange={v => set('active', v)} label="Active (live)" />
                <Toggle checked={!!form.featured} onChange={v => set('featured', v)} label="Featured (Explore hero)" />
                <Toggle checked={!!form.sponsored} onChange={v => set('sponsored', v)} label="Sponsored (paid)" />
              </div>
            </div>
          </Section>

          <Section title="Linkage">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link to Partner" half>
                <select
                  value={form.partner_id || ''}
                  onChange={e => set('partner_id', e.target.value || null)}
                  className={`${inp} bg-white`}
                >
                  <option value="">— No partner —</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Link to Place" half>
                <select
                  value={form.place_id || ''}
                  onChange={e => set('place_id', e.target.value || null)}
                  className={`${inp} bg-white`}
                >
                  <option value="">— No place —</option>
                  {places.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
                </select>
              </Field>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-hairline bg-surface/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted">
            {!isNew && form.updated_at && <>Last updated {new Date(form.updated_at).toLocaleString()}</>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-hairline text-sm text-body hover:bg-surface">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : isNew ? 'Create Deal' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Module ─────────────────────────────────────────────────────────────

export function DealsManagerModule() {
  const { data: summaryData } = useApi<any>('/api/deals/summary');
  const { data: partnersData } = useApi<{ partners: PartnerOption[] }>('/api/places/partners-list');

  const [deals, setDeals] = useState<DealRow[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    deal_type: 'all',
    active: 'all',
    featured: false,
    sponsored: false,
    partner_id: 'all',
  });
  const [sort, setSort] = useState({ col: 'created_at', dir: 'desc' });
  const [editDeal, setEditDeal] = useState<Partial<DealRow> | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const partners = partnersData?.partners || [];
  const summary = summaryData?.summary || {};

  const loadDeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.deal_type !== 'all') params.set('deal_type', filters.deal_type);
      if (filters.active !== 'all') params.set('active', filters.active);
      if (filters.featured) params.set('featured', 'true');
      if (filters.sponsored) params.set('sponsored', 'true');
      if (filters.partner_id !== 'all') params.set('partner_id', filters.partner_id);
      params.set('sort', sort.col);
      params.set('dir', sort.dir);
      params.set('limit', '200');
      const res = await apiFetch(`/api/deals?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Fetch failed: ${res.status}`);
      const json = await res.json();
      setDeals(json.deals || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load places for the form dropdown (lightweight)
  const loadPlaces = async () => {
    try {
      const res = await apiFetch('/api/places?limit=500&sort=name&dir=asc');
      if (res.ok) {
        const json = await res.json();
        setPlaces((json.places || []).map((p: any) => ({ id: p.id, name: p.name, category: p.category })));
      }
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    loadDeals();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [filters.deal_type, filters.active, filters.featured, filters.sponsored, filters.partner_id, sort.col, sort.dir]);

  useEffect(() => { loadPlaces(); }, []);

  const quickToggle = async (id: string, action: 'toggle_active' | 'toggle_featured' | 'toggle_sponsored') => {
    const res = await apiFetch('/api/deals', {
      method: 'PATCH',
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || 'Update failed');
    await loadDeals();
  };

  const deleteDeal = async (id: string) => {
    if (!confirm('Delete this deal? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/deals?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await loadDeals();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (deal: DealRow) => { setEditDeal(deal); setShowPanel(true); };
  const openNew = () => { setEditDeal(null); setShowPanel(true); };

  const SortBtn = ({ col }: { col: string }) => {
    const active = sort.col === col;
    return (
      <button
        onClick={() => setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))}
        className="ml-1 inline-flex"
      >
        {active
          ? (sort.dir === 'asc' ? <ChevronUp size={11} className="text-brand-blue" /> : <ChevronDown size={11} className="text-brand-blue" />)
          : <ChevronDown size={11} className="text-muted opacity-40" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">
              Featured Content & Deals Manager
            </h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Control Explore hero sections, partner upsells, sponsored placements, and deal campaigns.
              Active featured deals power the mobile Explore hero and web deal pages.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-blue px-4 py-2 rounded-lg hover:bg-brand-blue-dark shrink-0"
          >
            <Plus size={15} /> New Deal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<Gift size={18} />} label="Total Deals" value={summary.total ?? deals.length} sub="All placements" />
        <Stat icon={<Zap size={18} />} label="Live Now" value={summary.live ?? '—'} sub="Active + in date window" />
        <Stat icon={<Star size={18} />} label="Featured" value={summary.featured ?? '—'} sub="Explore hero eligible" />
        <Stat icon={<Calendar size={18} />} label="Expired" value={summary.expired ?? 0} sub="Past end date" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
        <div className="grid grid-cols-[1fr_160px_160px_160px_auto] gap-2 mb-3">
          <select
            value={filters.deal_type}
            onChange={e => setFilters({ ...filters, deal_type: e.target.value })}
            className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All types</option>
            {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filters.active}
            onChange={e => setFilters({ ...filters, active: e.target.value })}
            className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">Any status</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <select
            value={filters.partner_id}
            onChange={e => setFilters({ ...filters, partner_id: e.target.value })}
            className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All partners</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex items-center gap-3 px-1">
            <label className="flex items-center gap-1.5 text-sm text-body cursor-pointer">
              <input
                type="checkbox"
                checked={filters.featured}
                onChange={e => setFilters({ ...filters, featured: e.target.checked })}
                className="rounded"
              />
              Featured
            </label>
            <label className="flex items-center gap-1.5 text-sm text-body cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sponsored}
                onChange={e => setFilters({ ...filters, sponsored: e.target.checked })}
                className="rounded"
              />
              Sponsored
            </label>
          </div>
          <button
            onClick={loadDeals}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-muted">Sort:</span>
          <select
            value={sort.col}
            onChange={e => setSort({ col: e.target.value, dir: 'desc' })}
            className="border border-hairline rounded-lg px-2 py-1.5 text-xs bg-white"
          >
            <option value="created_at">Date Created</option>
            <option value="updated_at">Last Updated</option>
            <option value="starts_at">Start Date</option>
            <option value="title">Title A–Z</option>
            <option value="price_from">Price</option>
          </select>
          <button
            onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            className="px-2 py-1.5 rounded-md border border-hairline text-xs text-body hover:bg-surface"
          >
            {sort.dir === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink tracking-tight">
            Deals & Placements <span className="text-muted font-normal">({deals.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading deals…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-surface/50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">
                    Deal <SortBtn col="title" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Partner / Place</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">
                    Schedule <SortBtn col="starts_at" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">
                    Price <SortBtn col="price_from" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Active</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Featured</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Flags</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map(deal => {
                  const live = isLive(deal);
                  const expired = isExpired(deal);
                  return (
                    <tr key={deal.id} className="border-b border-hairline last:border-0 hover:bg-surface/40">
                      {/* Title + image + CTA */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          {deal.image ? (
                            <img
                              src={deal.image}
                              alt={deal.title}
                              className="w-10 h-10 rounded-lg object-cover border border-hairline shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-surface border border-hairline shrink-0 flex items-center justify-center">
                              <Gift size={14} className="text-muted" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-ink leading-snug">{deal.title}</div>
                            {deal.cta_label && (
                              <div className="text-[11px] text-brand-blue font-medium mt-0.5">
                                {deal.cta_label} →
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <DealTypeBadge type={deal.deal_type} />
                      </td>
                      {/* Partner / Place */}
                      <td className="px-4 py-3">
                        <div className="text-body text-[12px] space-y-0.5">
                          {deal.partner_name && <div>🤝 {deal.partner_name}</div>}
                          {deal.place_name && <div>📍 {deal.place_name}</div>}
                          {!deal.partner_name && !deal.place_name && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      {/* Schedule */}
                      <td className="px-4 py-3">
                        <div className="text-[11px] space-y-0.5">
                          {deal.starts_at || deal.ends_at ? (
                            <>
                              <div className="text-body">
                                {deal.starts_at ? fmtDate(deal.starts_at) : 'Always'} →
                              </div>
                              <div className={expired ? 'text-status-danger font-medium' : 'text-body'}>
                                {deal.ends_at ? fmtDate(deal.ends_at) : 'No end'}
                                {expired && ' (expired)'}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">Evergreen</span>
                          )}
                          {live && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-status-success">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-success inline-block" /> LIVE
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-body">
                        {deal.price_from != null ? `From $${deal.price_from}` : <span className="text-muted">—</span>}
                      </td>
                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => quickToggle(deal.id, 'toggle_active')}
                          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${deal.active ? 'bg-status-success-bg text-status-success' : 'bg-surface text-muted'}`}
                          title={deal.active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {deal.active ? <Eye size={11} /> : <EyeOff size={11} />}
                          {deal.active ? 'Active' : 'Off'}
                        </button>
                      </td>
                      {/* Featured toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => quickToggle(deal.id, 'toggle_featured')}
                          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${deal.featured ? 'bg-brand-gold-light text-status-warning' : 'bg-surface text-muted'}`}
                          title="Toggle featured (Explore hero)"
                        >
                          <Star size={11} />
                          {deal.featured ? 'Hero' : 'Normal'}
                        </button>
                      </td>
                      {/* Flags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {deal.sponsored && <Badge tone="purple">Sponsored</Badge>}
                          {expired && <Badge tone="red">Expired</Badge>}
                          {!expired && deal.ends_at && (() => {
                            const daysLeft = Math.ceil((new Date(deal.ends_at).getTime() - Date.now()) / 86400000);
                            return daysLeft <= 7 ? <Badge tone="gold">Ends in {daysLeft}d</Badge> : null;
                          })()}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(deal)}
                            className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteDeal(deal.id)}
                            disabled={deletingId === deal.id}
                            className="p-1.5 rounded-md border border-hairline text-muted hover:text-status-danger hover:border-status-danger disabled:opacity-40"
                            title="Delete deal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <AlertTriangle size={28} className="mx-auto text-muted mb-2" />
                      <div className="text-sm text-muted">No deals match the current filters.</div>
                      <button
                        onClick={openNew}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                      >
                        <Plus size={13} /> Create the first deal
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit panel */}
      {showPanel && (
        <DealPanel
          deal={editDeal}
          partners={partners}
          places={places}
          onClose={() => setShowPanel(false)}
          onSaved={loadDeals}
        />
      )}
    </div>
  );
}
