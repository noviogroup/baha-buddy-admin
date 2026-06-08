'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

type DayPlan = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  island: string;
  area: string;
  traveler_types: string[];
  interests: string[];
  duration_min_minutes: number;
  duration_max_minutes: number;
  mobility_level: string;
  budget_level: string;
  base_price: number;
  personalized_price: number;
  concierge_price: number | null;
  default_return_buffer_minutes: number;
  supports_live_guide: boolean;
  status: string;
};

function parseList(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function listValue(value?: string[] | null) {
  return Array.isArray(value) ? value.join(', ') : '';
}

export function DayPlanEditor({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await apiFetch(`/api/day-plans/${planId}`);
      const json = await res.json();
      setPlan(json.plan || null);
      setLoading(false);
    }
    load();
  }, [planId]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    setSaving(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get('title') || ''),
      slug: String(form.get('slug') || ''),
      short_description: String(form.get('short_description') || ''),
      full_description: String(form.get('full_description') || ''),
      island: String(form.get('island') || 'New Providence'),
      area: String(form.get('area') || 'Nassau'),
      traveler_types: parseList(String(form.get('traveler_types') || '')),
      interests: parseList(String(form.get('interests') || '')),
      duration_min_minutes: Number(form.get('duration_min_minutes') || 180),
      duration_max_minutes: Number(form.get('duration_max_minutes') || 360),
      mobility_level: String(form.get('mobility_level') || 'moderate'),
      budget_level: String(form.get('budget_level') || 'moderate'),
      base_price: Number(form.get('base_price') || 9.99),
      personalized_price: Number(form.get('personalized_price') || 19.99),
      concierge_price: Number(form.get('concierge_price') || 0) || null,
      default_return_buffer_minutes: Number(form.get('default_return_buffer_minutes') || 90),
      supports_live_guide: form.get('supports_live_guide') === 'on',
      status: String(form.get('status') || 'draft'),
    };

    const res = await apiFetch(`/api/day-plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(json.error || 'Unable to save plan.');
      return;
    }

    setPlan(json.plan);
    setMessage('Plan saved.');
  }

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">Loading plan…</div>;
  if (!plan) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">Plan not found.</div>;

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <Link href="/" className="text-xs font-bold text-brand-blue hover:underline">← Back to Command Center</Link>
        <h1 className="mt-4 text-2xl font-display font-bold text-ink tracking-tight">Edit Guided Day Plan</h1>
        <p className="mt-2 text-sm text-body">Update the plan overview, pricing, timing, and publish readiness.</p>
      </div>

      {message && <div className="rounded-xl border border-hairline bg-white p-4 text-sm font-semibold text-body shadow-card">{message}</div>}

      <div className="grid grid-cols-2 gap-5">
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Title</span><input name="title" defaultValue={plan.title} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Slug</span><input name="slug" defaultValue={plan.slug} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Island</span><input name="island" defaultValue={plan.island} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Area</span><input name="area" defaultValue={plan.area} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
      </div>

      <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Short description</span><textarea name="short_description" defaultValue={plan.short_description || ''} rows={3} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
      <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Full description</span><textarea name="full_description" defaultValue={plan.full_description || ''} rows={5} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>

      <div className="grid grid-cols-3 gap-5">
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Base price</span><input name="base_price" type="number" step="0.01" defaultValue={plan.base_price} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Personalized price</span><input name="personalized_price" type="number" step="0.01" defaultValue={plan.personalized_price} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Concierge price</span><input name="concierge_price" type="number" step="0.01" defaultValue={plan.concierge_price || ''} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Min minutes</span><input name="duration_min_minutes" type="number" defaultValue={plan.duration_min_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Max minutes</span><input name="duration_max_minutes" type="number" defaultValue={plan.duration_max_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Return buffer minutes</span><input name="default_return_buffer_minutes" type="number" defaultValue={plan.default_return_buffer_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Traveler types</span><input name="traveler_types" defaultValue={listValue(plan.traveler_types)} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Interests</span><input name="interests" defaultValue={listValue(plan.interests)} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Mobility level</span><input name="mobility_level" defaultValue={plan.mobility_level} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
        <label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Budget level</span><input name="budget_level" defaultValue={plan.budget_level} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
      </div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-body"><input name="supports_live_guide" type="checkbox" defaultChecked={plan.supports_live_guide} /> Supports Live Guide</label>
        <select name="status" defaultValue={plan.status} className="rounded-lg border border-hairline px-3 py-2 text-sm"><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select>
      </div>

      <div className="flex items-center gap-3"><button disabled={saving} className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save plan'}</button><Link href={`/day-plans/${plan.id}/stops`} className="rounded-lg border border-hairline bg-white px-5 py-2.5 text-sm font-bold text-body">Manage stops</Link></div>
    </form>
  );
}
