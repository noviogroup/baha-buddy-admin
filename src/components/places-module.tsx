'use client';

import { AlertTriangle, Database, MapPinned } from 'lucide-react';

export function PlacesModule() {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Places</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Manage the destination inventory across Google Places, TripAdvisor, legacy curated data, photos, reviews, and the future canonical place system.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-warning bg-status-warning-bg px-3 py-1 rounded-full">
            <AlertTriangle size={13} /> Foundation required
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2"><Database size={16} className="text-brand-blue" /><h3 className="text-sm font-semibold text-ink">Source inventory</h3></div>
          <p className="text-sm text-body">TripAdvisor, Google Places, and legacy tables need to be reconciled into one canonical place layer.</p>
        </div>
        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2"><MapPinned size={16} className="text-brand-blue" /><h3 className="text-sm font-semibold text-ink">Canonical places</h3></div>
          <p className="text-sm text-body">The app should eventually read from canonical places instead of source-specific tables.</p>
        </div>
        <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-status-warning" /><h3 className="text-sm font-semibold text-ink">Next step</h3></div>
          <p className="text-sm text-body">Create place and source mapping tables, then backfill TripAdvisor and Google Places in separate migrations.</p>
        </div>
      </div>
    </div>
  );
}
