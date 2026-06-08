'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { DEFAULT_HEADER_IMAGE_SEEDS, slugifyHeaderScope, type DefaultHeaderImageRecord, type DefaultHeaderType } from '@/lib/default-header-catalog';

const HEADER_TYPE_LABELS: Record<DefaultHeaderType, string> = {
  global: 'Global',
  island: 'Island',
  itinerary_category: 'Itinerary Category',
  business_type: 'Business / Experience',
  empty_state: 'Empty State',
};

const EMPTY_FORM: DefaultHeaderImageRecord = {
  title: '',
  description: '',
  header_type: 'island',
  scope_key: '',
  island: '',
  category: '',
  business_type: '',
  desktop_image_url: '',
  mobile_image_url: '',
  card_image_url: '',
  app_detail_image_url: '',
  alt_text: '',
  is_active: true,
  sort_order: 100,
};

export function DefaultMediaLibraryModule() {
  const [headers, setHeaders] = useState<DefaultHeaderImageRecord[]>(DEFAULT_HEADER_IMAGE_SEEDS);
  const [activeType, setActiveType] = useState<DefaultHeaderType | 'all'>('all');
  const [form, setForm] = useState<DefaultHeaderImageRecord>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHeaders = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await apiFetch('/api/default-header-images');
      const data = await res.json();
      setHeaders((data.headers && data.headers.length > 0) ? data.headers : DEFAULT_HEADER_IMAGE_SEEDS);
      if (data.warning) setNotice(`Using built-in catalog until migration is active: ${data.warning}`);
      else if (data.seeded) setNotice('Using built-in starter catalog. Save a record to persist it in Supabase.');
    } catch (error: any) {
      setHeaders(DEFAULT_HEADER_IMAGE_SEEDS);
      setNotice(`Using built-in starter catalog: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHeaders(); }, []);
  useEffect(() => {
    const handler = () => loadHeaders();
    window.addEventListener('admin:refresh', handler);
    return () => window.removeEventListener('admin:refresh', handler);
  }, []);

  const filtered = useMemo(() => {
    const list = activeType === 'all' ? headers : headers.filter(header => header.header_type === activeType);
    return [...list].sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
  }, [headers, activeType]);

  const stats = useMemo(() => headers.reduce<Record<string, number>>((acc, header) => {
    acc.total += 1;
    acc[header.header_type] = (acc[header.header_type] || 0) + 1;
    if (header.is_active) acc.active += 1;
    return acc;
  }, { total: 0, active: 0 }), [headers]);

  const beginEdit = (header: DefaultHeaderImageRecord) => {
    setSelectedId(header.id || null);
    setForm({ ...EMPTY_FORM, ...header });
    setNotice(null);
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field: keyof DefaultHeaderImageRecord, value: string | boolean | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const saveHeader = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const scopeSource = form.header_type === 'global'
        ? 'global'
        : form.header_type === 'island'
          ? form.island || form.scope_key
          : form.header_type === 'itinerary_category'
            ? form.category || form.scope_key
            : form.header_type === 'business_type'
              ? form.business_type || form.scope_key
              : form.scope_key || form.title;

      const payload = {
        ...form,
        scope_key: slugifyHeaderScope(scopeSource),
        sort_order: Number(form.sort_order || 100),
      };

      const res = await apiFetch('/api/default-header-images', {
        method: selectedId ? 'PATCH' : 'POST',
        body: JSON.stringify(selectedId ? { ...payload, id: selectedId } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save header image');
      await loadHeaders();
      resetForm();
      setNotice('Header image saved.');
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteHeader = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this default header image?')) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/default-header-images?id=${selectedId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete header image');
      await loadHeaders();
      resetForm();
      setNotice('Header image deleted.');
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-6 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-blue text-xs uppercase tracking-widest font-bold mb-2"><ImageIcon size={16} /> Default Media Library</div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">Manage Page Headers</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">Create the fallback image system for global pages, islands, itinerary categories, business types, and empty states. Client pages use: custom image → category default → island default → global default.</p>
          </div>
          <button onClick={resetForm} className="px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-bold flex items-center gap-2"><Plus size={15} /> New Header</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Total headers" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Islands" value={stats.island || 0} />
        <Stat label="Categories" value={stats.itinerary_category || 0} />
      </div>

      {notice && <div className="rounded-xl border border-brand-gold/30 bg-brand-gold-light/40 px-4 py-3 text-sm text-ink">{notice}</div>}

      <div className="grid grid-cols-[1fr_420px] gap-5 items-start">
        <section className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
          <div className="p-4 border-b border-hairline flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'global', 'island', 'itinerary_category', 'business_type', 'empty_state'] as const).map(type => (
                <button key={type} onClick={() => setActiveType(type)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeType === type ? 'bg-brand-blue text-white' : 'bg-surface text-body hover:bg-brand-blue-light'}`}>
                  {type === 'all' ? 'All' : HEADER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <button onClick={loadHeaders} disabled={loading} className="px-3 py-1.5 rounded-lg border border-hairline text-xs flex items-center gap-1.5"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filtered.map(header => (
              <button key={`${header.header_type}-${header.scope_key}-${header.id || 'seed'}`} onClick={() => beginEdit(header)} className={`text-left rounded-xl border overflow-hidden bg-white hover:shadow-card transition ${selectedId && selectedId === header.id ? 'border-brand-blue' : 'border-hairline'}`}>
                <div className="aspect-[16/7] bg-surface relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={header.card_image_url || header.desktop_image_url} alt={header.alt_text} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 rounded-full bg-black/55 text-white text-[10px] px-2 py-1 font-bold backdrop-blur-sm">{HEADER_TYPE_LABELS[header.header_type]}</div>
                  {!header.is_active && <div className="absolute top-2 right-2 rounded-full bg-white/90 text-ink text-[10px] px-2 py-1 font-bold">Inactive</div>}
                </div>
                <div className="p-3">
                  <h3 className="font-display font-bold text-ink text-sm truncate">{header.title}</h3>
                  <p className="text-xs text-muted mt-1 truncate">{header.island || header.category || header.business_type || header.scope_key}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="bg-white rounded-xl border border-hairline shadow-card p-5 sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-ink">{selectedId ? 'Edit Header' : 'New Header'}</h3>
            {selectedId && <button onClick={deleteHeader} disabled={saving} className="text-status-danger hover:bg-red-50 rounded-lg p-2"><Trash2 size={16} /></button>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={form.title} onChange={v => updateField('title', v)} className="col-span-2" />
            <label className="text-xs font-bold text-muted col-span-2">Type<select value={form.header_type} onChange={e => updateField('header_type', e.target.value as DefaultHeaderType)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink"><option value="global">Global</option><option value="island">Island</option><option value="itinerary_category">Itinerary Category</option><option value="business_type">Business / Experience</option><option value="empty_state">Empty State</option></select></label>
            <Field label="Island" value={form.island || ''} onChange={v => updateField('island', v)} />
            <Field label="Category" value={form.category || ''} onChange={v => updateField('category', v)} />
            <Field label="Business Type" value={form.business_type || ''} onChange={v => updateField('business_type', v)} />
            <Field label="Sort" type="number" value={String(form.sort_order || 100)} onChange={v => updateField('sort_order', Number(v))} />
            <Field label="Desktop image URL" value={form.desktop_image_url} onChange={v => updateField('desktop_image_url', v)} className="col-span-2" />
            <Field label="Mobile crop URL" value={form.mobile_image_url || ''} onChange={v => updateField('mobile_image_url', v)} className="col-span-2" />
            <Field label="Card thumbnail URL" value={form.card_image_url || ''} onChange={v => updateField('card_image_url', v)} className="col-span-2" />
            <Field label="App detail image URL" value={form.app_detail_image_url || ''} onChange={v => updateField('app_detail_image_url', v)} className="col-span-2" />
            <Field label="Alt text" value={form.alt_text} onChange={v => updateField('alt_text', v)} className="col-span-2" />
            <label className="col-span-2 flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={form.is_active} onChange={e => updateField('is_active', e.target.checked)} /> Active</label>
          </div>

          <div className="mt-4 rounded-lg bg-surface p-3 text-xs text-muted leading-relaxed">Recommended sizes: Desktop 1920×720, Mobile 1080×1350, Card 800×600, App detail 1200×800.</div>
          <button onClick={saveHeader} disabled={saving} className="mt-4 w-full bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Save size={15} /> {saving ? 'Saving…' : 'Save Header'}</button>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">{label}</div><div className="text-2xl font-display font-bold text-ink">{value}</div></div>;
}

function Field({ label, value, onChange, className = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; className?: string; type?: string }) {
  return <label className={`text-xs font-bold text-muted ${className}`}>{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink" /></label>;
}
