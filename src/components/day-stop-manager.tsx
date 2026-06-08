'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { DayStopEditCard } from '@/components/day-stop-edit-card';

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

function sortStops(stops: DayStop[]) {
  return [...stops].sort((a, b) => a.stop_order - b.stop_order);
}

export function DayStopManager({ planId }: { planId: string }) {
  const [stops, setStops] = useState<DayStop[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStops() {
    setLoading(true);
    const res = await apiFetch(`/api/day-plans/${planId}/stops`);
    const json = await res.json();
    setStops(sortStops(json.stops || []));
    setLoading(false);
  }

  useEffect(() => {
    loadStops();
  }, [planId]);

  if (loading) return <div className="rounded-xl border border-hairline bg-white p-5 shadow-card">Loading stops…</div>;

  return (
    <div className="rounded-xl border border-hairline bg-white shadow-card overflow-hidden">
      <div className="p-5 border-b border-hairline">
        <h2 className="text-xl font-display font-bold text-ink">Edit Stops</h2>
        <p className="mt-1 text-sm text-body">Expand any stop to edit details. Use Up/Down to adjust ordering.</p>
      </div>
      <div className="divide-y divide-hairline">
        {sortStops(stops).map((stop, index) => (
          <DayStopEditCard
            key={stop.id}
            stop={stop}
            isFirst={index === 0}
            isLast={index === stops.length - 1}
            onSaved={(updated) => setStops(current => sortStops(current.map(item => item.id === updated.id ? updated : item)))}
            onRefresh={loadStops}
          />
        ))}
        {stops.length === 0 && <div className="p-8 text-center text-sm text-muted">No stops yet. Add stops from the Guide Editor.</div>}
      </div>
    </div>
  );
}
