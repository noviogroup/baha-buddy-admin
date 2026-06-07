'use client';

import { AlertTriangle, ArrowRight, Flame, MessageSquare, Target, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type Lead = {
  user: {
    id: string;
    display_name: string | null;
    email: string | null;
    country: string | null;
    city: string | null;
    party_type: string | null;
    party_size: number | null;
  };
  score: number;
  priority: 'hot' | 'warm' | 'watch';
  signals: string[];
  suggestedAction: string;
  stats: {
    trips: number;
    activeTrips: number;
    chatThreads: number;
    bookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    estimatedBudget: number;
    latestActivityAt: string;
  };
  latestTrip: {
    id: string;
    name: string | null;
    status: string | null;
    islands: string[] | null;
  } | null;
};

type HighIntentResponse = {
  leads: Lead[];
  summary: {
    total: number;
    hot: number;
    warm: number;
    watch: number;
    pendingBookings: number;
    estimatedBudget: number;
  };
};

function money(value: number) {
  return `$${(value || 0).toLocaleString()}`;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PriorityBadge({ priority }: { priority: Lead['priority'] }) {
  const cls = priority === 'hot'
    ? 'bg-status-danger-bg text-status-danger'
    : priority === 'warm'
      ? 'bg-status-warning-bg text-status-warning'
      : 'bg-brand-blue/10 text-brand-blue-dark';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{priority}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const width = Math.min(100, score);
  return (
    <div className="w-28 h-2 bg-surface rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${width}%` }} />
    </div>
  );
}

export function HighIntentModule() {
  const { data, loading, error } = useApi<HighIntentResponse>('/api/high-intent');

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="skeleton h-3 w-24 mb-3" /><div className="skeleton h-8 w-24" /></div>)}
        </div>
        <div className="bg-white rounded-xl border border-hairline h-96 shadow-card"><div className="p-5"><div className="skeleton h-4 w-40 mb-6" /><div className="skeleton h-72 w-full" /></div></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">High-intent queue unavailable</h3>
        <p className="text-sm text-body">{error || 'The high-intent API did not return data.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">High-Intent Traveler Queue</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Surfaces travelers most likely to convert based on saved trips, budget estimates, booking activity, chat activity, onboarding completion, and group/family signals.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-danger bg-status-danger-bg px-3 py-1 rounded-full">
            <Flame size={13} /> Conversion queue
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Qualified leads</div><div className="text-2xl font-display font-bold text-ink">{data.summary.total}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Hot</div><div className="text-2xl font-display font-bold text-status-danger">{data.summary.hot}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Pending bookings</div><div className="text-2xl font-display font-bold text-ink">{data.summary.pendingBookings}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Est. budget</div><div className="text-2xl font-display font-bold text-ink">{money(data.summary.estimatedBudget)}</div></div>
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline flex items-center gap-2">
          <Target size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-ink tracking-tight">Traveler leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Traveler</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Priority</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Score</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Signals</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Suggested Action</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Latest</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map(lead => (
                <tr key={lead.user.id} className="border-b border-hairline last:border-0 hover:bg-surface/50 align-top">
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="font-semibold text-ink">{lead.user.display_name || lead.user.email || 'Unnamed traveler'}</div>
                    <div className="text-[11px] text-muted">{lead.user.email || 'No email'}{lead.user.city || lead.user.country ? ` · ${[lead.user.city, lead.user.country].filter(Boolean).join(', ')}` : ''}</div>
                    <div className="text-[11px] text-body mt-1 flex items-center gap-1.5"><Users size={12} /> {lead.user.party_type || 'unknown'} · {lead.user.party_size || 1} traveler(s)</div>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={lead.priority} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><ScoreBar score={lead.score} /><span className="font-semibold text-ink">{lead.score}</span></div>
                  </td>
                  <td className="px-4 py-3 max-w-[360px]">
                    <div className="flex flex-wrap gap-1.5">
                      {lead.signals.slice(0, 5).map(signal => <span key={signal} className="text-[10px] px-2 py-0.5 bg-surface rounded-full text-body">{signal}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body max-w-[260px]"><div className="flex items-start gap-1.5"><ArrowRight size={13} className="mt-0.5 text-brand-blue" />{lead.suggestedAction}</div></td>
                  <td className="px-4 py-3 text-xs text-body min-w-[170px]">
                    <div>{timeAgo(lead.stats.latestActivityAt)}</div>
                    <div className="text-muted mt-1 flex items-center gap-1"><MessageSquare size={12} /> {lead.stats.chatThreads} chats · {lead.stats.trips} trips</div>
                    {lead.latestTrip && <div className="text-muted mt-1">Trip: {lead.latestTrip.name || 'Untitled'}</div>}
                  </td>
                </tr>
              ))}
              {data.leads.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No high-intent travelers yet. As users create trips, chat, and start bookings, they will appear here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
