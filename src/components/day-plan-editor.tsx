'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { DayStopAutofill } from '@/components/day-stop-autofill';

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

type DayStop = { id: string; stop_order: number; name: string; stop_type: string; address: string | null; latitude: number; longitude: number; suggested_duration_minutes: number; description: string | null; baha_tip: string | null };

function parseList(value: string) { return value.split(',').map(item => item.trim()).filter(Boolean); }
function listValue(value?: string[] | null) { return Array.isArray(value) ? value.join(', ') : ''; }

export function DayPlanEditor({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [stops, setStops] = useState<DayStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStop, setAddingStop] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [planRes, stopsRes] = await Promise.all([apiFetch(`/api/day-plans/${planId}`), apiFetch(`/api/day-plans/${planId}/stops`)]);
    const planJson = await planRes.json();
    const stopsJson = await stopsRes.json();
    setPlan(planJson.plan || null);
    setStops(stopsJson.stops || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [planId]);

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
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
    const res = await apiFetch(`/api/day-plans/${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMessage(json.error || 'Unable to save guide.'); return; }
    setPlan(json.plan);
    setMessage('Guide saved.');
  }

  async function addStop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddingStop(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const source = String(form.get('source') || 'manual');
    const sourceId = String(form.get('source_id') || '');
    const payload = {
      stop_order: Number(form.get('stop_order') || stops.length + 1),
      name: String(form.get('name') || ''),
      stop_type: String(form.get('stop_type') || 'attraction'),
      address: String(form.get('address') || '') || null,
      latitude: Number(form.get('latitude') || 0),
      longitude: Number(form.get('longitude') || 0),
      google_place_id: String(form.get('google_place_id') || '') || null,
      suggested_duration_minutes: Number(form.get('suggested_duration_minutes') || 20),
      description: String(form.get('description') || '') || null,
      baha_tip: String(form.get('baha_tip') || '') || null,
      kid_friendly: form.get('kid_friendly') === 'on',
      metadata: { source, source_id: sourceId || null },
    };
    const res = await apiFetch(`/api/day-plans/${planId}/stops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setAddingStop(false);
    if (!res.ok) { setMessage(json.error || 'Unable to add stop.'); return; }
    (event.currentTarget as HTMLFormElement).reset();
    setStops(current => [...current, json.stop].sort((a, b) => a.stop_order - b.stop_order));
    setMessage('Stop added.');
  }

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">Loading guide…</div>;
  if (!plan) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">Guide not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><Link href="/" className="text-xs font-bold text-brand-blue hover:underline">← Back to Command Center</Link><h1 className="mt-4 text-2xl font-display font-bold text-ink tracking-tight">Guide Editor</h1><p className="mt-2 text-sm text-body">Edit the guide overview, pricing, timing, stops, and live-guide readiness from one place.</p><div className="mt-4 flex gap-2 text-xs font-bold"><a href="#overview" className="rounded-lg bg-white px-3 py-2 text-brand-blue">Overview</a><a href="#stops" className="rounded-lg bg-white px-3 py-2 text-brand-blue">Stops</a></div></div>
      {message && <div className="rounded-xl border border-hairline bg-white p-4 text-sm font-semibold text-body shadow-card">{message}</div>}
      <form id="overview" onSubmit={savePlan} className="flex flex-col gap-5"><div className="grid grid-cols-2 gap-5"><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Title</span><input name="title" defaultValue={plan.title} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Slug</span><input name="slug" defaultValue={plan.slug} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Island</span><input name="island" defaultValue={plan.island} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Area</span><input name="area" defaultValue={plan.area} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label></div><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Short description</span><textarea name="short_description" defaultValue={plan.short_description || ''} rows={3} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Full description</span><textarea name="full_description" defaultValue={plan.full_description || ''} rows={5} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><div className="grid grid-cols-3 gap-5"><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Base price</span><input name="base_price" type="number" step="0.01" defaultValue={plan.base_price} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Personalized price</span><input name="personalized_price" type="number" step="0.01" defaultValue={plan.personalized_price} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Concierge price</span><input name="concierge_price" type="number" step="0.01" defaultValue={plan.concierge_price || ''} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label></div><div className="grid grid-cols-3 gap-5"><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Min minutes</span><input name="duration_min_minutes" type="number" defaultValue={plan.duration_min_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Max minutes</span><input name="duration_max_minutes" type="number" defaultValue={plan.duration_max_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Return buffer minutes</span><input name="default_return_buffer_minutes" type="number" defaultValue={plan.default_return_buffer_minutes} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label></div><div className="grid grid-cols-2 gap-5"><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Traveler types</span><input name="traveler_types" defaultValue={listValue(plan.traveler_types)} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Interests</span><input name="interests" defaultValue={listValue(plan.interests)} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Mobility level</span><input name="mobility_level" defaultValue={plan.mobility_level} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label><label className="bg-white rounded-xl border border-hairline p-4 shadow-card"><span className="text-xs font-bold uppercase text-muted">Budget level</span><input name="budget_level" defaultValue={plan.budget_level} className="mt-2 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label></div><div className="bg-white rounded-xl border border-hairline p-4 shadow-card flex items-center justify-between gap-4"><label className="flex items-center gap-2 text-sm font-semibold text-body"><input name="supports_live_guide" type="checkbox" defaultChecked={plan.supports_live_guide} /> Supports Live Guide</label><select name="status" defaultValue={plan.status} className="rounded-lg border border-hairline px-3 py-2 text-sm"><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div><button disabled={saving} className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save guide'}</button></div></form>
      <section id="stops" className="grid gap-5 lg:grid-cols-[1fr_420px]"><div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden"><div className="p-5 border-b border-hairline"><h2 className="text-xl font-display font-bold text-ink">Stops</h2><p className="mt-1 text-sm text-body">These stops power the timeline, route preview, and future live guide.</p></div><div className="divide-y divide-hairline">{stops.map(stop => <div key={stop.id} className="p-4"><div className="font-semibold text-ink">{stop.stop_order}. {stop.name}</div><div className="text-xs text-muted">{stop.stop_type} · {stop.suggested_duration_minutes} min · {stop.latitude}, {stop.longitude}</div>{stop.description && <p className="mt-2 text-sm text-body">{stop.description}</p>}{stop.baha_tip && <p className="mt-2 text-xs font-semibold text-brand-blue">Tip: {stop.baha_tip}</p>}</div>)}{stops.length === 0 && <div className="p-8 text-center text-sm text-muted">No stops yet. Search Google/Tripadvisor and add the first route stop on the right.</div>}</div></div><form data-day-stop-form="true" onSubmit={addStop} className="bg-white rounded-xl border border-hairline p-5 shadow-card h-fit"><h3 className="text-lg font-display font-bold text-ink">Add stop</h3><p className="mt-1 text-xs text-muted">Search first, then adjust fields if needed.</p><div className="mt-4 grid gap-3"><DayStopAutofill /><input type="hidden" name="google_place_id" /><input type="hidden" name="source" /><input type="hidden" name="source_id" /><label className="text-xs font-bold uppercase text-muted">Order<input name="stop_order" type="number" defaultValue={stops.length + 1} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Name<input name="name" required className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Type<input name="stop_type" defaultValue="attraction" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Address<input name="address" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold uppercase text-muted">Latitude<input name="latitude" type="number" step="0.0000001" required className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Longitude<input name="longitude" type="number" step="0.0000001" required className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label></div><label className="flex items-center gap-2 text-sm font-semibold text-body"><input name="kid_friendly" type="checkbox" /> Kid friendly</label><label className="text-xs font-bold uppercase text-muted">Duration minutes<input name="suggested_duration_minutes" type="number" defaultValue={20} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Description<textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><label className="text-xs font-bold uppercase text-muted">Baha Buddy tip<textarea name="baha_tip" rows={2} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label><button disabled={addingStop} className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{addingStop ? 'Adding…' : 'Add stop'}</button></div></form></section>
    </div>
  );
}
