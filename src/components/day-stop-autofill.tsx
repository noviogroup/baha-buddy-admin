'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';

type PlaceResult = {
  source: 'google' | 'tripadvisor';
  source_id: string;
  google_place_id?: string;
  tripadvisor_location_id?: string;
  name: string;
  stop_type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating?: number | null;
  review_count?: number | null;
  description?: string | null;
  kid_friendly?: boolean;
  metadata?: Record<string, unknown>;
};

function setInput(form: HTMLFormElement, name: string, value: unknown) {
  const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field) return;
  field.value = value === null || value === undefined ? '' : String(value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export function DayStopAutofill() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function searchPlaces() {
    if (query.trim().length < 2) {
      setResults([]);
      setMessage('Type at least 2 characters.');
      return;
    }

    setLoading(true);
    setMessage(null);
    const res = await apiFetch(`/api/day-places/search?q=${encodeURIComponent(query.trim())}&island=nassau`);
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error || 'Unable to search places.');
      return;
    }

    setResults(json.places || []);
    if ((json.places || []).length === 0) setMessage('No matching places found.');
  }

  function usePlace(place: PlaceResult) {
    const form = document.querySelector('[data-day-stop-form="true"]') as HTMLFormElement | null;
    if (!form) return;

    setInput(form, 'name', place.name);
    setInput(form, 'stop_type', place.stop_type || 'attraction');
    setInput(form, 'address', place.address || '');
    setInput(form, 'latitude', place.latitude ?? '');
    setInput(form, 'longitude', place.longitude ?? '');
    setInput(form, 'google_place_id', place.google_place_id || '');
    setInput(form, 'source', place.source);
    setInput(form, 'source_id', place.source_id);
    setInput(form, 'description', place.description || '');

    if (place.kid_friendly) {
      const kidField = form.elements.namedItem('kid_friendly') as HTMLInputElement | null;
      if (kidField) kidField.checked = true;
    }

    setMessage(`${place.name} added to the stop form.`);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface/40 p-4">
      <div className="text-xs font-bold uppercase text-muted">Search Google / Tripadvisor</div>
      <div className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchPlaces(); } }}
          placeholder="Queen's Staircase, Junkanoo Beach, Fish Fry..."
          className="min-w-0 flex-1 rounded-lg border border-hairline px-3 py-2 text-sm"
        />
        <button type="button" onClick={searchPlaces} disabled={loading} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {message && <p className="mt-2 text-xs font-semibold text-body">{message}</p>}

      {results.length > 0 && (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-hairline bg-white">
          {results.map((place) => (
            <button
              key={`${place.source}-${place.source_id}`}
              type="button"
              onClick={() => usePlace(place)}
              className="block w-full border-b border-hairline px-3 py-3 text-left hover:bg-surface/60 last:border-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{place.name}</div>
                  <div className="text-xs text-muted">{place.address || 'No address'} · {place.stop_type}</div>
                </div>
                <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-bold uppercase text-body">{place.source}</div>
              </div>
              {(place.rating || place.review_count) && (
                <div className="mt-1 text-xs text-muted">Rating {place.rating || '—'} · {place.review_count || 0} reviews</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
