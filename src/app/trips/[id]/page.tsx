'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Calendar, MapPin, Users as UsersIcon, DollarSign,
  MessageSquare, Hotel, Plane, Activity, Compass, AlertTriangle,
  ShieldCheck, Mail, ExternalLink, Clock,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { CHART, Badge, Section, TH, timeAgo } from '@/lib/ui-primitives';
import { CancelBookingsModal } from '@/components/cancel-bookings-modal';
import type { TripAccommodationRow } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════════════
// TRIP DETAIL — Phase 2 #17
// Full-page drill-down for a single trip. Tabs:
//   1. Itinerary  — day-by-day timeline (accommodations + flights + activities)
//   2. Budget     — confirmed-booking spend by category vs. estimate
//   3. Bookings   — full bookings list scoped to this trip
//   4. Chat       — chat_threads filtered to this trip
//   5. People     — owner + collaborators
//   6. Admin      — privileged actions (cancel, mark fraud) — Phase 2 #20-21
//
// The page is a standalone route at /trips/[id]. It doesn't inherit the
// dashboard sidebar — instead it has a brand-bar header with a Back to Trips
// link. This is intentional: the detail surface gives the full viewport over
// to the data being inspected.
// ═══════════════════════════════════════════════════════════════════════════

const DOLLAR = '$';
const fmt$ = (n: number) => DOLLAR + n.toLocaleString();
const fmtMoney = (value: unknown, currency = 'USD') => {
  const amount = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return `${DOLLAR}${Number.isFinite(amount) ? amount.toLocaleString() : '0'} ${currency}`;
};
const shortId = (value?: string | null) => (value ? `${value.slice(0, 14)}${value.length > 14 ? '...' : ''}` : null);

type Tab = 'itinerary' | 'budget' | 'bookings' | 'chat' | 'people' | 'admin';

type AdminTripAccommodation = TripAccommodationRow & {
  hotel_name?: string | null;
  cost?: number | string | null;
};

interface TripDetailResponse {
  trip: any;
  bookings: any[];
  threads: any[];
  collaborators: any[];
  accommodations: AdminTripAccommodation[];
  flights: any[];
  activities: any[];
  budget: { byCategory: Record<string, number>; totalSpent: number; estimate: number; delta: number };
  tablesStatus: Record<string, boolean>;
  error?: string;
}

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('itinerary');

  const { data, loading, error, reload } = useApi<TripDetailResponse>(`/api/trip-detail?id=${params.id}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface/40 font-body">
        <TripHeader name="Loading…" loading />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Section title="">
            <div className="p-4">
              <div className="skeleton h-6 w-1/3 mb-4" />
              <div className="skeleton h-4 w-2/3 mb-2" />
              <div className="skeleton h-4 w-1/2 mb-2" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </Section>
        </div>
      </div>
    );
  }

  if (error || !data?.trip) {
    return (
      <div className="min-h-screen bg-surface/40 font-body flex items-center justify-center">
        <div className="bg-white rounded-xl border border-hairline shadow-card p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto text-status-danger mb-3" />
          <h2 className="text-lg font-display font-bold text-ink mb-2">Trip not found</h2>
          <p className="text-sm text-body mb-4">{error || 'No trip with this ID exists, or it has been deleted.'}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { trip, bookings, threads, collaborators, accommodations, flights, activities, budget, tablesStatus } = data;
  const dateLabel = trip.date_start
    ? `${new Date(trip.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${trip.date_end ? ` – ${new Date(trip.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
    : 'No dates set';

  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'itinerary', label: 'Itinerary', icon: <Calendar size={14} />, count: accommodations.length + flights.length + activities.length },
    { id: 'budget',    label: 'Budget',    icon: <DollarSign size={14} /> },
    { id: 'bookings',  label: 'Bookings',  icon: <Hotel size={14} />, count: bookings.length },
    { id: 'chat',      label: 'Chat',      icon: <MessageSquare size={14} />, count: threads.length },
    { id: 'people',    label: 'People',    icon: <UsersIcon size={14} />, count: 1 + collaborators.length },
    { id: 'admin',     label: 'Admin',     icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-surface/40 font-body">
      <TripHeader
        name={trip.name}
        status={trip.status}
        dateLabel={dateLabel}
        islands={trip.islands || []}
        owner={trip.users?.display_name}
        ownerEmail={trip.users?.email}
        partySize={trip.party_config?.adults || 0}
      />

      {/* Tab bar */}
      <div className="bg-white border-b border-hairline sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-brand-blue text-brand-blue-dark'
                      : 'border-transparent text-muted hover:text-body'
                  }`}
                >
                  <span className={active ? 'text-brand-blue' : 'opacity-70'}>{t.icon}</span>
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-brand-blue/10 text-brand-blue-dark' : 'bg-surface text-muted'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'itinerary' && (
          <ItineraryTab
            accommodations={accommodations}
            flights={flights}
            activities={activities}
            dateStart={trip.date_start}
            dateEnd={trip.date_end}
            tablesStatus={tablesStatus}
          />
        )}
        {tab === 'budget' && <BudgetTab budget={budget} bookings={bookings} />}
        {tab === 'bookings' && <BookingsTab bookings={bookings} reload={reload} />}
        {tab === 'chat' && <ChatTab threads={threads} />}
        {tab === 'people' && <PeopleTab owner={trip.users} collaborators={collaborators} />}
        {tab === 'admin' && <AdminTab tripId={trip.id} tripName={trip.name} bookings={bookings} reload={reload} />}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Header banner
// ───────────────────────────────────────────────────────────────────────────
function TripHeader({
  name, status, dateLabel, islands, owner, ownerEmail, partySize, loading,
}: {
  name: string;
  status?: string;
  dateLabel?: string;
  islands?: string[];
  owner?: string;
  ownerEmail?: string;
  partySize?: number;
  loading?: boolean;
}) {
  return (
    <div className="bg-sidebar-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white mb-3 font-medium uppercase tracking-wider">
          <ChevronLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight mb-1">{name}</h1>
            {!loading && (
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                {dateLabel && <span className="flex items-center gap-1"><Calendar size={13} /> {dateLabel}</span>}
                {!!partySize && <span className="flex items-center gap-1"><UsersIcon size={13} /> {partySize} travelers</span>}
                {owner && (
                  <span className="flex items-center gap-1" title={ownerEmail}>
                    Owner: <span className="font-semibold text-white">{owner}</span>
                  </span>
                )}
              </div>
            )}
            {!!islands?.length && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {islands.map((isl, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] bg-white/10 text-white px-2 py-0.5 rounded-full font-medium">
                    <MapPin size={10} /> {isl}
                  </span>
                ))}
              </div>
            )}
          </div>
          {status && <Badge status={status} />}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Itinerary tab — day-by-day timeline
// ───────────────────────────────────────────────────────────────────────────
function ItineraryTab({
  accommodations, flights, activities, dateStart, dateEnd, tablesStatus,
}: {
  accommodations: AdminTripAccommodation[]; flights: any[]; activities: any[];
  dateStart?: string; dateEnd?: string;
  tablesStatus: Record<string, boolean>;
}) {
  const isEmpty = !accommodations.length && !flights.length && !activities.length;
  const missingTables = ['accommodations', 'flights', 'activities'].filter(k => tablesStatus[k] === false);

  const activitiesByDay = new Map<number, any[]>();
  activities.forEach(a => {
    const d = a.day_number ?? 0;
    if (!activitiesByDay.has(d)) activitiesByDay.set(d, []);
    activitiesByDay.get(d)!.push(a);
  });
  const dayNumbers = Array.from(activitiesByDay.keys()).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      {missingTables.length > 0 && (
        <Section title="Itinerary tables not yet migrated">
          <div className="p-5 text-sm text-body">
            <p className="mb-2">The following trip-related tables don&apos;t exist yet in Supabase:</p>
            <ul className="list-disc list-inside text-muted ml-2">
              {missingTables.map(t => <li key={t}>trip_{t}</li>)}
            </ul>
            <p className="mt-3 text-[12px]">These tables get populated by the Baha Buddy mobile app as trips are planned. Until then, this tab will show whatever <code className="bg-surface px-1 py-0.5 rounded text-xs">bookings</code> have been recorded.</p>
          </div>
        </Section>
      )}

      {flights.length > 0 && (
        <Section title={`Flights (${flights.length})`} action={<Plane size={14} className="text-muted" />}>
          <div className="divide-y divide-hairline">
            {flights.map((f: any, i: number) => (
              <div key={f.id || i} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-ink">{f.route || `${f.origin_iata || '?'} → ${f.destination_iata || '?'}`}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {f.departure && <span>Dep: {new Date(f.departure).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                    {f.arrival && <span> · Arr: {new Date(f.arrival).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-ink">{fmt$(parseFloat(f.cost || 0))}</div>
                  <Badge status={f.status || 'pending'} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {accommodations.length > 0 && (
        <Section title={`Accommodations (${accommodations.length})`} action={<Hotel size={14} className="text-muted" />}>
          <div className="divide-y divide-hairline">
            {accommodations.map((a, i) => {
              const currency = a.currency || 'USD';
              const total = a.total_price ?? a.cost ?? 0;
              const identityRows = [
                ['Place ID', a.place_id],
                ['LiteAPI hotel', a.liteapi_hotel_id],
                ['Rate', a.liteapi_rate_id],
                ['Prebook', a.liteapi_prebook_id],
                ['Booking ref', a.booking_reference],
              ].filter(([, value]) => Boolean(value));

              return (
                <div key={a.id || i} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink">{a.name || a.hotel_name || 'Stay'}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {a.check_in && <span>{new Date(a.check_in).toLocaleDateString()}</span>}
                      {a.check_out && <span> → {new Date(a.check_out).toLocaleDateString()}</span>}
                      {a.nights ? <span className="ml-2">· {a.nights} night{a.nights === 1 ? '' : 's'}</span> : null}
                      {a.guests ? <span className="ml-2">· {a.guests} guest{a.guests === 1 ? '' : 's'}</span> : null}
                      {a.price_per_night ? <span className="ml-2">· {fmtMoney(a.price_per_night, currency)}/night</span> : null}
                    </div>
                    {identityRows.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {identityRows.map(([label, value]) => (
                          <div key={label} className="rounded-md bg-surface px-2 py-1">
                            <div className="text-[9px] uppercase tracking-wider text-muted font-semibold">{label}</div>
                            <div className="text-[11px] font-mono text-body truncate" title={String(value)}>{shortId(String(value))}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-ink">{fmtMoney(total, currency)}</div>
                    <Badge status={a.status || 'pending'} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {dayNumbers.length > 0 && (
        <Section title={`Day-by-day activities (${activities.length})`} action={<Activity size={14} className="text-muted" />}>
          <div className="divide-y divide-hairline">
            {dayNumbers.map(d => {
              const dayItems = activitiesByDay.get(d) || [];
              const dayDate = dateStart && d > 0
                ? new Date(new Date(dateStart).getTime() + (d - 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : null;
              return (
                <div key={d} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">Day {d}</span>
                    {dayDate && <span className="text-[11px] text-muted">{dayDate}</span>}
                  </div>
                  <div className="flex flex-col gap-1 ml-3 border-l-2 border-hairline pl-3">
                    {dayItems.map((a: any, i: number) => (
                      <div key={a.id || i} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-ink font-medium">{a.title || a.activity_id || 'Activity'}</span>
                          {a.time_slot && <span className="text-[11px] text-muted ml-2">{a.time_slot}</span>}
                        </div>
                        {a.status && <Badge status={a.status} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {isEmpty && missingTables.length === 0 && (
        <Section title="Itinerary">
          <div className="px-5 py-12 text-center text-muted text-sm">
            <Compass size={32} className="mx-auto mb-2 opacity-50" />
            No itinerary items yet. As the user plans this trip, accommodations, flights, and day-by-day activities will appear here.
          </div>
        </Section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Budget tab — category breakdown
// ───────────────────────────────────────────────────────────────────────────
function BudgetTab({ budget, bookings }: { budget: TripDetailResponse['budget']; bookings: any[] }) {
  const categories: { key: string; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'accommodation', label: 'Accommodations', color: CHART.brandBlue, icon: <Hotel size={14} /> },
    { key: 'flight',        label: 'Flights',        color: CHART.brandGold, icon: <Plane size={14} /> },
    { key: 'activity',      label: 'Activities',     color: CHART.success,   icon: <Activity size={14} /> },
    { key: 'other',         label: 'Other',          color: CHART.muted,     icon: <DollarSign size={14} /> },
  ];

  const max = Math.max(budget.totalSpent, budget.estimate, 1);
  const overBudget = budget.estimate > 0 && budget.totalSpent > budget.estimate;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Budget summary">
        <div className="p-5 grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-lg px-4 py-3">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Estimate</div>
            <div className="text-2xl font-display font-bold text-ink">{fmt$(budget.estimate)}</div>
            <div className="text-[11px] text-muted mt-0.5">Set during trip planning</div>
          </div>
          <div className="bg-surface rounded-lg px-4 py-3">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Spent</div>
            <div className="text-2xl font-display font-bold text-ink">{fmt$(budget.totalSpent)}</div>
            <div className="text-[11px] text-muted mt-0.5">From confirmed bookings only</div>
          </div>
          <div className={`rounded-lg px-4 py-3 ${overBudget ? 'bg-status-danger-bg' : 'bg-status-success-bg'}`}>
            <div className="text-[10px] uppercase tracking-wider mb-1 text-muted">{overBudget ? 'Over by' : 'Remaining'}</div>
            <div className={`text-2xl font-display font-bold ${overBudget ? 'text-status-danger' : 'text-status-success'}`}>
              {fmt$(Math.abs(budget.delta))}
            </div>
            <div className="text-[11px] text-muted mt-0.5">{budget.estimate > 0 ? `${Math.round((budget.totalSpent / budget.estimate) * 100)}% of estimate` : 'No estimate'}</div>
          </div>
        </div>
      </Section>

      <Section title="Spend by category">
        <div className="p-5 flex flex-col gap-3">
          {categories.map(c => {
            const v = budget.byCategory[c.key] || 0;
            return (
              <div key={c.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-sm text-body font-medium">
                    <span style={{ color: c.color }}>{c.icon}</span>
                    {c.label}
                  </span>
                  <span className="text-sm font-bold text-ink">{fmt$(v)}</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(v / max) * 100}%`, background: c.color }} />
                </div>
              </div>
            );
          })}
          {budget.totalSpent === 0 && (
            <div className="text-center text-sm text-muted py-4">
              No confirmed bookings yet. The chart will populate as bookings are confirmed.
            </div>
          )}
        </div>
      </Section>

      {bookings.length > 0 && (
        <Section title={`All bookings on this trip (${bookings.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-hairline"><TH>Type</TH><TH>Amount</TH><TH>Status</TH><TH>Created</TH></tr></thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-hairline hover:bg-surface/50">
                    <td className="px-4 py-2.5 flex items-center gap-1 text-body text-xs">
                      {b.booking_type === 'accommodation' ? <Hotel size={12} /> : b.booking_type === 'flight' ? <Plane size={12} /> : <Activity size={12} />}
                      {b.booking_type}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-ink">{fmt$(parseFloat(b.amount))}</td>
                    <td className="px-4 py-2.5"><Badge status={b.status} /></td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Bookings tab
// ───────────────────────────────────────────────────────────────────────────
function BookingsTab({ bookings, reload }: { bookings: any[]; reload: () => void }) {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  return (
    <>
      <Section title={`Bookings on this trip (${bookings.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>Type</TH><TH>Amount</TH><TH>Status</TH><TH>Supplier Ref</TH><TH>Paid At</TH><TH>Created</TH><TH>Actions</TH></tr></thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">No bookings on this trip yet</td></tr>
              ) : bookings.map((b: any) => {
                const isTerminal = ['cancelled', 'refunded'].includes(b.status);
                return (
                  <tr key={b.id} className="border-b border-hairline hover:bg-surface/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/bookings/${b.id}`} className="inline-flex items-center gap-1 text-[11px] text-body hover:text-brand-blue group">
                        {b.booking_type === 'accommodation' ? <Hotel size={12} /> : b.booking_type === 'flight' ? <Plane size={12} /> : <Activity size={12} />}
                        <span className="group-hover:underline">{b.booking_type}</span>
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 ml-0.5" />
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-ink">{fmt$(parseFloat(b.amount))} <span className="text-[10px] text-muted font-normal">{b.currency || 'USD'}</span></td>
                    <td className="px-4 py-2.5"><Badge status={b.status} /></td>
                    <td className="px-4 py-2.5 text-[11px] text-muted font-mono">{b.supplier_ref ? `${b.supplier_ref.slice(0, 16)}…` : '—'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{b.paid_at ? new Date(b.paid_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      {isTerminal ? (
                        <span className="text-[10px] text-muted">—</span>
                      ) : (
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="px-2 py-1 rounded-md bg-status-danger-bg text-status-danger text-[11px] font-semibold hover:bg-status-danger hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <CancelBookingsModal
        open={selectedBooking !== null}
        bookings={selectedBooking ? [selectedBooking] : []}
        title={selectedBooking ? `Cancel ${selectedBooking.booking_type} booking` : ''}
        onClose={() => setSelectedBooking(null)}
        onComplete={reload}
      />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Chat tab — threads filtered to this trip
// ───────────────────────────────────────────────────────────────────────────
function ChatTab({ threads }: { threads: any[] }) {
  return (
    <Section title={`Chat threads on this trip (${threads.length})`}>
      <div className="divide-y divide-hairline">
        {threads.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted text-sm">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            No chat threads associated with this trip
          </div>
        ) : threads.map((t: any) => (
          <Link key={t.id} href={`/?thread=${t.id}`} className="flex items-start justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink mb-0.5">{t.users?.display_name || 'User'}</div>
              <div className="text-xs text-muted truncate">{t.last_message_preview || 'No messages'}</div>
            </div>
            <div className="text-[11px] text-muted whitespace-nowrap ml-3 flex items-center gap-1">
              <Clock size={11} /> {timeAgo(t.updated_at)}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// People tab — owner + collaborators
// ───────────────────────────────────────────────────────────────────────────
function PeopleTab({ owner, collaborators }: { owner: any; collaborators: any[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Owner">
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue-dark font-bold text-sm">
            {owner?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-ink">{owner?.display_name || 'Unknown'}</div>
            {owner?.email && <div className="text-[11px] text-muted flex items-center gap-1"><Mail size={10} /> {owner.email}</div>}
            {owner?.city && <div className="text-[11px] text-muted">{owner.city}, {owner.country}</div>}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/10 text-brand-blue-dark uppercase tracking-wider">Owner</span>
        </div>
      </Section>

      <Section title={`Collaborators (${collaborators.length})`}>
        {collaborators.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">No collaborators on this trip yet</div>
        ) : (
          <div className="divide-y divide-hairline">
            {collaborators.map((c: any) => (
              <div key={c.id || c.user_id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-body font-bold text-xs">
                  {c.users?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-ink text-sm">{c.users?.display_name || 'Unknown'}</div>
                  {c.users?.email && <div className="text-[10px] text-muted">{c.users.email}</div>}
                </div>
                <div className="text-[10px] text-muted text-right">
                  <div>{c.role || 'collaborator'}</div>
                  {c.accepted_at ? (
                    <span className="text-status-success font-medium">Accepted {timeAgo(c.accepted_at)}</span>
                  ) : c.invited_at ? (
                    <span className="text-status-warning font-medium">Invited {timeAgo(c.invited_at)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Admin tab — privileged actions (cancel, mark fraud) — Phase 2 #20-21
// ───────────────────────────────────────────────────────────────────────────
function AdminTab({
  tripId, tripName, bookings, reload,
}: {
  tripId: string;
  tripName: string;
  bookings: any[];
  reload: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const cancellable = bookings.filter((b: any) => !['cancelled', 'refunded'].includes(b.status));
  const cancellableTotal = cancellable.reduce((s: number, b: any) => s + (parseFloat(b.amount) || 0), 0);
  const buttonSubtitle = cancellable.length === 0
    ? 'No active bookings to cancel'
    : `Cancels ${cancellable.length} active booking${cancellable.length === 1 ? '' : 's'} (${fmt$(cancellableTotal)})`;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Admin actions">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-body">
            Privileged actions on this trip. All actions are logged to the audit trail with the admin&apos;s identity, IP, and before/after state.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => setModalOpen(true)}
              disabled={cancellable.length === 0}
              className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                cancellable.length === 0
                  ? 'border-hairline bg-surface text-muted cursor-not-allowed'
                  : 'border-status-danger/30 bg-status-danger-bg text-status-danger hover:border-status-danger'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} />
                <span className="font-semibold">Cancel trip</span>
              </div>
              <div className="text-[11px]">{buttonSubtitle}</div>
            </button>
            <button disabled className="px-4 py-3 rounded-lg border border-hairline bg-surface text-muted text-sm font-medium cursor-not-allowed text-left">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} />
                <span className="font-semibold">Mark as fraud</span>
              </div>
              <div className="text-[11px]">Flags trip and freezes all related bookings (Phase 3)</div>
            </button>
          </div>
        </div>
      </Section>

      <Section title="Quick references">
        <div className="p-5 text-xs text-body flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted">Trip ID:</span>
            <code className="font-mono bg-surface px-2 py-0.5 rounded text-[11px]">{tripId}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Name:</span>
            <span className="font-semibold text-ink">{tripName}</span>
          </div>
          <a
            href={`/?page=audit&entity_type=trip&entity_id=${tripId}`}
            className="inline-flex items-center gap-1 text-brand-blue hover:underline mt-1"
          >
            View audit log for this trip <ExternalLink size={11} />
          </a>
        </div>
      </Section>

      <CancelBookingsModal
        open={modalOpen}
        bookings={cancellable}
        title={`Cancel trip — ${tripName}`}
        onClose={() => setModalOpen(false)}
        onComplete={reload}
      />
    </div>
  );
}
