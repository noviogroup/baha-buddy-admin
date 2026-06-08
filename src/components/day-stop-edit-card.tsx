'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type DayStop = {
  id: string;
  stop_order: number;
  name: string;
  stop_type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  google_place_id?: string | null;
  tripadvisor_location_id?: string | null;
  suggested_duration_minutes: number;
  description: string | null;
  baha_tip: string | null;
  is_required?: boolean;
  kid_friendly?: boolean;
  bathroom_available?: boolean;
  food_available?: boolean;
};

type Props = {
  stop: DayStop;
  isFirst: boolean;
  isLast: boolean;
  onSaved: (stop: DayStop) => void;
  onRefresh: () => void;
};

function issuesFor(stop: DayStop) {
  const issues: string[] = [];
  if (!stop.latitude || !stop.longitude) issues.push('coordinates');
  if (!stop.suggested_duration_minutes) issues.push('duration');
  if (!stop.description) issues.push('description');
  if (!stop.google_place_id && !stop.tripadvisor_location_id) issues.push('source');
  return issues;
}

export function DayStopEditCard({ stop, isFirst, isLast, onSaved, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const issues = issuesFor(stop);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      stop_order: Number(form.get('stop_order') || stop.stop_order),
      name: String(form.get('name') || ''),
      stop_type: String(form.get('stop_type') || 'attraction'),
      address: String(form.get('address') || '') || null,
      latitude: Number(form.get('latitude') || 0),
      longitude: Number(form.get('longitude') || 0),
      google_place_id: String(form.get('google_place_id') || '') || null,
      tripadvisor_location_id: String(form.get('tripadvisor_location_id') || '') || null,
      suggested_duration_minutes: Number(form.get('suggested_duration_minutes') || 20),
      description: String(form.get('description') || '') || null,
      baha_tip: String(form.get('baha_tip') || '') || null,
      is_required: form.get('is_required') === 'on',
      kid_friendly: form.get('kid_friendly') === 'on',
      bathroom_available: form.get('bathroom_available') === 'on',
      food_available: form.get('food_available') === 'on',
    };

    const res = await apiFetch(`/api/day-stops/${stop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok && json.stop) onSaved(json.stop);
  }

  async function move(direction: 'up' | 'down') {
    setSaving(true);
    await apiFetch(`/api/day-stops/${stop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stop_order: direction === 'up' ? stop.stop_order - 1 : stop.stop_order + 1 }),
    });
    setSaving(false);
    onRefresh();
  }

  return (
    <form onSubmit={save} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => setOpen(!open)} className="font-semibold text-brand-blue hover:underline">
            {stop.stop_order}. {stop.name}
          </button>
          <div className="text-xs text-muted">{stop.stop_type} · {stop.suggested_duration_minutes} min · {stop.latitude}, {stop.longitude}</div>
        </div>
        <div className="flex gap-1">
          <button type="button" disabled={isFirst || saving} onClick={() => move('up')} className="rounded border border-hairline px-2 py-1 text-xs disabled:opacity-40">Up</button>
          <button type="button" disabled={isLast || saving} onClick={() => move('down')} className="rounded border border-hairline px-2 py-1 text-xs disabled:opacity-40">Down</button>
        </div>
      </div>

      {issues.length > 0 && <div className="mt-3 rounded-lg bg-status-warning-bg p-2 text-xs font-semibold text-status-warning">Needs: {issues.join(', ')}</div>}

      {open && (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase text-muted">Order<input name="stop_order" type="number" defaultValue={stop.stop_order} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
            <label className="text-xs font-bold uppercase text-muted">Name<input name="name" defaultValue={stop.name} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
            <label className="text-xs font-bold uppercase text-muted">Type<input name="stop_type" defaultValue={stop.stop_type} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
            <label className="text-xs font-bold uppercase text-muted">Duration<input name="suggested_duration_minutes" type="number" defaultValue={stop.suggested_duration_minutes} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          </div>
          <label className="text-xs font-bold uppercase text-muted">Address<input name="address" defaultValue={stop.address || ''} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase text-muted">Latitude<input name="latitude" type="number" step="0.0000001" defaultValue={stop.latitude} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
            <label className="text-xs font-bold uppercase text-muted">Longitude<input name="longitude" type="number" step="0.0000001" defaultValue={stop.longitude} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase text-muted">Google Place ID<input name="google_place_id" defaultValue={stop.google_place_id || ''} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
            <label className="text-xs font-bold uppercase text-muted">Tripadvisor ID<input name="tripadvisor_location_id" defaultValue={stop.tripadvisor_location_id || ''} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          </div>
          <label className="text-xs font-bold uppercase text-muted">Description<textarea name="description" defaultValue={stop.description || ''} rows={2} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          <label className="text-xs font-bold uppercase text-muted">Baha Buddy tip<textarea name="baha_tip" defaultValue={stop.baha_tip || ''} rows={2} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm normal-case font-normal text-body" /></label>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-body">
            <label><input name="is_required" type="checkbox" defaultChecked={stop.is_required ?? true} /> Required</label>
            <label><input name="kid_friendly" type="checkbox" defaultChecked={Boolean(stop.kid_friendly)} /> Kid friendly</label>
            <label><input name="bathroom_available" type="checkbox" defaultChecked={Boolean(stop.bathroom_available)} /> Bathroom</label>
            <label><input name="food_available" type="checkbox" defaultChecked={Boolean(stop.food_available)} /> Food</label>
          </div>
          <button disabled={saving} className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save stop'}</button>
        </div>
      )}
    </form>
  );
}
