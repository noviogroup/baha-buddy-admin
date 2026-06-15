'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff,
  ImageOff, MapPinned, Plus, Search, Star, Tag, Trash2, X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

// ─── Types ───────────────────────────────────────────────────────────────────

type PlaceRow = {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  subcategory: string | null;
  island_id: string | null;
  island_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  short_description: string | null;
  description: string | null;
  primary_image_url: string | null;
  gallery_images: string[];
  gallery_count: number;
  rating: number | null;
  review_count: number;
  price_level: string | null;
  amenities: string[];
  tags: string[];
  best_for: string[];
  review_highlights: string[];
  buddy_tips: string[];
  opening_hours: Record<string, string> | null;
  source: string | null;
  partner_id: string | null;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  is_partner: boolean;
  featured: boolean;
  sponsored: boolean;
  source_priority: string | null;
  created_at: string;
  updated_at: string;
  partner_count: number;
};

type IslandOption = { id: string; slug: string; name: string };
type PartnerOption = { id: string; name: string; partner_type: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const PLACE_CATEGORIES = [
  { value: 'hotel', label: 'Hotel / Stay' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'beach', label: 'Beach' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'activity', label: 'Activity' },
  { value: 'transport', label: 'Transport Provider' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'shopping', label: 'Shopping Area' },
  { value: 'cruise_stop', label: 'Cruise-Friendly Stop' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'rating', label: 'Rating' },
];

const EMPTY_FORM: Partial<PlaceRow> = {
  name: '',
  slug: '',
  category: 'hotel',
  subcategory: '',
  island_id: '',
  island_name: '',
  address: '',
  latitude: undefined as any,
  longitude: undefined as any,
  phone: '',
  website: '',
  short_description: '',
  description: '',
  primary_image_url: '',
  gallery_images: [],
  amenities: [],
  tags: [],
  best_for: [],
  review_highlights: [],
  buddy_tips: [],
  opening_hours: null,
  source: 'manual',
  partner_id: '',
  status: 'active',
  is_active: true,
  is_verified: false,
  featured: false,
  sponsored: false,
};

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'gold' | 'red' | 'purple' }) {
  const cls = {
    blue: 'bg-brand-blue-light text-brand-blue-dark',
    green: 'bg-status-success-bg text-status-success',
    gold: 'bg-brand-gold-light text-status-warning',
    red: 'bg-status-danger-bg text-status-danger',
    purple: 'bg-purple-50 text-purple-700',
  }[tone];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{children}</span>;
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

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  };
  return (
    <div className="border border-hairline rounded-lg p-2 min-h-[42px] flex flex-wrap gap-1.5 cursor-text" onClick={() => {}}>
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-brand-blue-light text-brand-blue-dark px-2 py-0.5 rounded-md text-xs font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-status-danger"><X size={10} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={value.length === 0 ? (placeholder || 'Type and press Enter…') : ''}
        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
      />
    </div>
  );
}

// ─── List input (editable items) ──────────────────────────────────────────────

function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const item = input.trim();
    if (item) onChange([...value, item]);
    setInput('');
  };
  return (
    <div className="space-y-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-surface rounded-md px-2.5 py-1.5 text-sm">
          <span className="text-muted mt-0.5">{i + 1}.</span>
          <span className="flex-1 text-body">{item}</span>
          <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-muted hover:text-status-danger mt-0.5"><X size={12} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Add item…'}
          className="flex-1 border border-hairline rounded-lg px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={add} className="px-3 py-1.5 rounded-lg bg-brand-blue-light text-brand-blue-dark text-sm font-semibold hover:bg-brand-blue hover:text-white">Add</button>
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

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

function PlacePanel({
  place,
  islands,
  partners,
  onClose,
  onSaved,
}: {
  place: Partial<PlaceRow> | null;
  islands: IslandOption[];
  partners: PartnerOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !place?.id;
  const [form, setForm] = useState<Partial<PlaceRow>>(place ? { ...place } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof PlaceRow, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const autoSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  const save = async () => {
    if (!form.name?.trim()) return alert('Name is required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (isNew && !payload.slug?.trim()) payload.slug = autoSlug(payload.name || '');
      const res = await apiFetch('/api/places', {
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline baha-gradient-card flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-0.5">{isNew ? 'New Place' : 'Edit Place'}</div>
            <h3 className="text-lg font-display font-bold text-ink">{form.name || 'Untitled'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">
              {saving ? 'Saving…' : isNew ? 'Create Place' : 'Save Changes'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface text-muted hover:text-ink"><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          <Section title="Basic Info">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <input value={form.name || ''} onChange={e => { set('name', e.target.value); if (isNew) set('slug', autoSlug(e.target.value)); }} className={inp} placeholder="Place name" />
              </Field>
              <Field label="Slug" half>
                <input value={form.slug || ''} onChange={e => set('slug', e.target.value)} className={inp} placeholder="auto-generated" />
              </Field>
              <Field label="Category *" half>
                <select value={form.category || 'hotel'} onChange={e => set('category', e.target.value)} className={`${inp} bg-white`}>
                  {PLACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Subcategory" half>
                <input value={form.subcategory || ''} onChange={e => set('subcategory', e.target.value)} className={inp} placeholder="e.g. boutique hotel" />
              </Field>
              <Field label="Island Assignment" half>
                <select
                  value={form.island_id || ''}
                  onChange={e => {
                    const island = islands.find(i => i.id === e.target.value);
                    set('island_id', e.target.value || null);
                    set('island_name', island?.name || null);
                  }}
                  className={`${inp} bg-white`}
                >
                  <option value="">— Select island —</option>
                  {islands.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </Field>
              <Field label="Partner Linkage" half>
                <select
                  value={form.partner_id || ''}
                  onChange={e => set('partner_id', e.target.value || null)}
                  className={`${inp} bg-white`}
                >
                  <option value="">— No partner —</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Status & Visibility">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" half>
                <select value={form.status || 'active'} onChange={e => set('status', e.target.value)} className={`${inp} bg-white`}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="hidden">Hidden</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Source" half>
                <input value={form.source || ''} onChange={e => set('source', e.target.value)} className={inp} placeholder="manual, tripadvisor, google…" />
              </Field>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <Toggle checked={!!form.is_active} onChange={v => { set('is_active', v); if (!v && form.status === 'active') set('status', 'hidden'); }} label="Active (visible)" />
                <Toggle checked={!!form.is_verified} onChange={v => set('is_verified', v)} label="Verified" />
                <Toggle checked={!!form.featured} onChange={v => set('featured', v)} label="Featured" />
                <Toggle checked={!!form.sponsored} onChange={v => set('sponsored', v)} label="Sponsored" />
              </div>
            </div>
          </Section>

          <Section title="Location">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Address">
                <input value={form.address || ''} onChange={e => set('address', e.target.value)} className={inp} placeholder="Full address" />
              </Field>
              <Field label="Latitude" half>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude ?? ''}
                  onChange={e => set('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inp}
                  placeholder="25.0480"
                />
              </Field>
              <Field label="Longitude" half>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude ?? ''}
                  onChange={e => set('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inp}
                  placeholder="-77.3554"
                />
              </Field>
            </div>
          </Section>

          <Section title="Description">
            <div className="space-y-3">
              <Field label="Short Description (card-level)">
                <textarea value={form.short_description || ''} onChange={e => set('short_description', e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="One-line summary shown on cards" />
              </Field>
              <Field label="Full Description">
                <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={4} className={`${inp} resize-y`} placeholder="Detailed place description" />
              </Field>
            </div>
          </Section>

          <Section title="Media">
            <div className="space-y-3">
              <Field label="Primary Image URL">
                <div className="flex gap-2">
                  <input value={form.primary_image_url || ''} onChange={e => set('primary_image_url', e.target.value)} className={`${inp} flex-1`} placeholder="https://…" />
                  {form.primary_image_url && (
                    <div className="w-14 h-10 rounded-lg overflow-hidden border border-hairline shrink-0">
                      <img src={form.primary_image_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </Field>
              <div>
                <label className="block text-xs font-semibold text-body mb-1">Gallery Images ({(form.gallery_images || []).length})</label>
                <p className="text-xs text-muted mb-2">Managed via Media Gallery Manager — shown here for reference only.</p>
                <div className="flex flex-wrap gap-1.5">
                  {(form.gallery_images || []).slice(0, 6).map((url, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-hairline">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {(form.gallery_images || []).length > 6 && (
                    <div className="w-12 h-12 rounded-lg border border-hairline bg-surface flex items-center justify-center text-xs text-muted font-semibold">
                      +{(form.gallery_images || []).length - 6}
                    </div>
                  )}
                  {(form.gallery_images || []).length === 0 && <span className="text-xs text-muted">No gallery images yet</span>}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Tags & Attributes">
            <div className="space-y-3">
              <Field label="Amenities">
                <TagInput value={form.amenities || []} onChange={v => set('amenities', v)} placeholder="WiFi, Pool, Beach access…" />
              </Field>
              <Field label="Vibe Tags">
                <TagInput value={form.tags || []} onChange={v => set('tags', v)} placeholder="romantic, family-friendly, luxury…" />
              </Field>
              <Field label="Best For">
                <TagInput value={form.best_for || []} onChange={v => set('best_for', v)} placeholder="couples, snorkeling, sunset views…" />
              </Field>
            </div>
          </Section>

          <Section title="Buddy Content">
            <div className="space-y-4">
              <Field label="Review Highlights">
                <ListInput value={form.review_highlights || []} onChange={v => set('review_highlights', v)} placeholder="Add a highlight…" />
              </Field>
              <Field label="Buddy Tips (shown to users in chat)">
                <ListInput value={form.buddy_tips || []} onChange={v => set('buddy_tips', v)} placeholder="Add a tip Buddy will share…" />
              </Field>
            </div>
          </Section>

          <Section title="Business Info">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" half>
                <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className={inp} placeholder="+1 (242) 000-0000" />
              </Field>
              <Field label="Website" half>
                <input value={form.website || ''} onChange={e => set('website', e.target.value)} className={inp} placeholder="https://…" />
              </Field>
              <Field label="Opening Hours (JSON or text)">
                <textarea
                  value={form.opening_hours ? JSON.stringify(form.opening_hours, null, 2) : ''}
                  onChange={e => {
                    try { set('opening_hours', e.target.value ? JSON.parse(e.target.value) : null); }
                    catch { set('opening_hours', { raw: e.target.value }); }
                  }}
                  rows={3}
                  className={`${inp} resize-none font-mono text-xs`}
                  placeholder={'{ "Mon-Fri": "9am-5pm", "Sat": "10am-3pm" }'}
                />
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
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-hairline text-sm text-body hover:bg-surface">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60">
              {saving ? 'Saving…' : isNew ? 'Create Place' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Module ─────────────────────────────────────────────────────────────

export function PlacesManagerModule() {
  const { data: islandsData } = useApi<{ islands: IslandOption[] }>('/api/places/islands-list');
  const { data: partnersData } = useApi<{ partners: PartnerOption[] }>('/api/places/partners-list');
  const { data: summaryData } = useApi<any>('/api/places/summary');

  const islands = islandsData?.islands || [];
  const partners = partnersData?.partners || [];

  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', category: 'all', island: 'all', status: 'all', featured: false, partnered: false });
  const [sort, setSort] = useState({ col: 'updated_at', dir: 'desc' });
  const [editPlace, setEditPlace] = useState<Partial<PlaceRow> | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.island !== 'all') params.set('island', filters.island);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.featured) params.set('featured', 'true');
      if (filters.partnered) params.set('partner', 'true');
      params.set('sort', sort.col);
      params.set('dir', sort.dir);
      params.set('limit', '200');
      const res = await apiFetch(`/api/places?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Fetch failed: ${res.status}`);
      const json = await res.json();
      setPlaces(json.places || []);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlaces(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters.category, filters.island, filters.status, filters.featured, filters.partnered, sort.col, sort.dir]);

  const quickUpdate = async (id: string, body: Record<string, unknown>) => {
    const res = await apiFetch('/api/places', { method: 'PATCH', body: JSON.stringify({ id, ...body }) });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || 'Update failed');
    await loadPlaces();
  };

  const archivePlace = async (id: string) => {
    if (!confirm('Archive this place? It will be hidden from mobile and web.')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/places?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await loadPlaces();
    } catch (err: any) { alert(err.message); }
    finally { setDeletingId(null); }
  };

  const openEdit = (place: PlaceRow) => { setEditPlace(place); setShowPanel(true); };
  const openNew = () => { setEditPlace(null); setShowPanel(true); };

  const summary = summaryData?.summary || {};

  const SortBtn = ({ col }: { col: string }) => {
    const active = sort.col === col;
    return (
      <button onClick={() => setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))} className="ml-1 inline-flex">
        {active ? (sort.dir === 'asc' ? <ChevronUp size={11} className="text-brand-blue" /> : <ChevronDown size={11} className="text-brand-blue" />) : <ChevronDown size={11} className="text-muted opacity-40" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Places & Content Manager</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Create and manage all destination content — hotels, restaurants, beaches, attractions, activities, and more. Mobile and web consume this data.
            </p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-blue px-4 py-2 rounded-lg hover:bg-brand-blue-dark shrink-0">
            <Plus size={15} /> Add Place
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<MapPinned size={18} />} label="Total Places" value={summary.total || places.length} sub={`${summary.active || 0} active`} />
        <Stat icon={<CheckCircle2 size={18} />} label="Verified" value={(summary.total || 0) - (summary.unverified || 0)} sub="Admin-reviewed" />
        <Stat icon={<ImageOff size={18} />} label="Missing Images" value={summary.missingImages || 0} sub="Needs media" />
        <Stat icon={<Star size={18} />} label="Featured" value={places.filter(p => p.featured).length || '—'} sub="Promoted places" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
        <div className="grid grid-cols-[1fr_160px_180px_140px_auto] gap-2 mb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted" />
            <input
              value={filters.q}
              onChange={e => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') loadPlaces(); }}
              placeholder="Search by name…"
              className="w-full border border-hairline rounded-lg pl-8 pr-3 py-2 text-sm"
            />
          </div>
          <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All categories</option>
            {PLACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filters.island} onChange={e => setFilters({ ...filters, island: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All islands</option>
            {islands.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={loadPlaces} disabled={loading} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60 whitespace-nowrap">
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-body">
            <input type="checkbox" checked={filters.featured} onChange={e => setFilters({ ...filters, featured: e.target.checked })} className="rounded" />
            Featured only
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-body">
            <input type="checkbox" checked={filters.partnered} onChange={e => setFilters({ ...filters, partnered: e.target.checked })} className="rounded" />
            Partner-linked only
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            <select value={sort.col} onChange={e => setSort({ col: e.target.value, dir: 'desc' })} className="border border-hairline rounded-lg px-2 py-1.5 text-xs bg-white">
              {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))} className="px-2 py-1.5 rounded-md border border-hairline text-xs text-body hover:bg-surface">
              {sort.dir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink tracking-tight">
            Places <span className="text-muted font-normal">({places.length})</span>
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading places…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-surface/50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">
                    Place <SortBtn col="name" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Category</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Island</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">
                    Rating <SortBtn col="rating" />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Gallery</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Active</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Featured</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Badges</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {places.map(place => (
                  <tr key={place.id} className="border-b border-hairline last:border-0 hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{place.name}</div>
                      <div className="text-[11px] text-muted">
                        {!place.primary_image_url && <span className="text-status-warning">No image · </span>}
                        {place.slug || 'no slug'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body capitalize">
                      {PLACE_CATEGORIES.find(c => c.value === place.category)?.label || place.category}
                    </td>
                    <td className="px-4 py-3 text-body">{place.island_name || <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-body">
                      {place.rating ? (
                        <span className="flex items-center gap-1"><Star size={11} className="text-brand-gold" />{place.rating} <span className="text-muted text-[11px]">({place.review_count})</span></span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${place.gallery_count > 0 ? 'text-ink' : 'text-muted'}`}>
                        {place.gallery_count} {place.gallery_count === 1 ? 'img' : 'imgs'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => quickUpdate(place.id, place.is_active ? { action: 'hide' } : { action: 'show' })}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${place.is_active && place.status === 'active' ? 'bg-status-success-bg text-status-success' : 'bg-surface text-muted'}`}
                        title={place.is_active ? 'Click to hide' : 'Click to activate'}
                      >
                        {place.is_active && place.status === 'active' ? <Eye size={11} /> : <EyeOff size={11} />}
                        {place.is_active && place.status === 'active' ? 'Live' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => quickUpdate(place.id, { action: 'toggle_featured' })}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${place.featured ? 'bg-brand-gold-light text-status-warning' : 'bg-surface text-muted'}`}
                        title="Toggle featured"
                      >
                        <Star size={11} />
                        {place.featured ? 'Featured' : 'Normal'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {place.is_verified && <Badge tone="green">Verified</Badge>}
                        {place.sponsored && <Badge tone="purple">Sponsored</Badge>}
                        {place.partner_count > 0 && <Badge tone="blue">{place.partner_count}P</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(place)}
                          className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => archivePlace(place.id)}
                          disabled={deletingId === place.id}
                          className="p-1.5 rounded-md border border-hairline text-muted hover:text-status-danger hover:border-status-danger disabled:opacity-40"
                          title="Archive place"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {places.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <AlertTriangle size={28} className="mx-auto text-muted mb-2" />
                      <div className="text-sm text-muted">No places match the current filters.</div>
                      <button onClick={openNew} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
                        <Plus size={13} /> Create the first place
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
        <PlacePanel
          place={editPlace}
          islands={islands}
          partners={partners}
          onClose={() => setShowPanel(false)}
          onSaved={loadPlaces}
        />
      )}
    </div>
  );
}
