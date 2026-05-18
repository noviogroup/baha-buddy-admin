'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Calendar, MapPin, DollarSign, MessageSquare, Hotel,
  Plane, Activity, AlertTriangle, ShieldCheck, ExternalLink, Clock,
  CheckCircle, FileText, Plus, Minus, Hash,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { Badge, Section, TH, timeAgo } from '@/lib/ui-primitives';
import { CancelBookingsModal } from '@/components/cancel-bookings-modal';

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING DETAIL — Phase 2 #18 + #19 (unified)
// One page handles flight / accommodation / activity bookings. The Overview
// tab dispatches a type-specific sub-component; the other three tabs (Trip
// Context, Audit, Admin) are identical regardless of booking type.
//
// Currency formatting goes through fmt$() — see the lesson learned in the
// User Detail page about edit_file's $${...} collision.
// ═══════════════════════════════════════════════════════════════════════════

const DOLLAR = '$';
const fmt$ = (n: number) => DOLLAR + n.toLocaleString();

type Tab = 'overview' | 'trip' | 'audit' | 'admin';

interface BookingDetailResponse {
  booking: any;
  trip: any | null;
  owner: any | null;
  auditLog: any[];
  error?: string;
}

const BOOKING_TYPE_ICON = {
  flight:        <Plane size={14} />,
  accommodation: <Hotel size={14} />,
  activity:      <Activity size={14} />,
};

const BOOKING_TYPE_LABEL = {
  flight:        'Flight',
  accommodation: 'Accommodation',
  activity:      'Activity',
};

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, loading, error, reload } = useApi<BookingDetailResponse>(`/api/booking-detail?id=${params.id}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface/40 font-body">
        <BookingHeader loading />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Section title="">
            <div className="p-4">
              <div className="skeleton h-6 w-1/3 mb-4" />
              <div className="skeleton h-4 w-2/3 mb-2" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          </Section>
        </div>
      </div>
    );
  }

  if (error || !data?.booking) {
    return (
      <div className="min-h-screen bg-surface/40 font-body flex items-center justify-center">
        <div className="bg-white rounded-xl border border-hairline shadow-card p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto text-status-danger mb-3" />
          <h2 className="text-lg font-display font-bold text-ink mb-2">Booking not found</h2>
          <p className="text-sm text-body mb-4">{error || 'No booking with this ID exists.'}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { booking, trip, owner, auditLog } = data;
  const type = (booking.booking_type || 'flight') as 'flight' | 'accommodation' | 'activity';
  const isTerminal = ['cancelled', 'refunded'].includes(booking.status);

  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: BOOKING_TYPE_ICON[type] },
    { id: 'trip',     label: 'Trip',     icon: <Calendar size={14} />, count: trip ? 1 : 0 },
    { id: 'audit',    label: 'Audit',    icon: <FileText size={14} />, count: auditLog.length },
    { id: 'admin',    label: 'Admin',    icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-surface/40 font-body">
      <BookingHeader
        type={type}
        status={booking.status}
        amount={parseFloat(booking.amount)}
        currency={booking.currency || 'USD'}
        supplierRef={booking.supplier_ref}
        bookingId={booking.id}
        createdAt={booking.created_at}
      />

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
        {tab === 'overview' && <OverviewTab booking={booking} />}
        {tab === 'trip'     && <TripContextTab trip={trip} owner={owner} />}
        {tab === 'audit'    && <AuditTab auditLog={auditLog} />}
        {tab === 'admin'    && (
          <AdminTab
            booking={booking}
            isTerminal={isTerminal}
            onCancel={() => setCancelOpen(true)}
          />
        )}
      </div>

      <CancelBookingsModal
        open={cancelOpen}
        bookings={[booking]}
        title={`Cancel ${BOOKING_TYPE_LABEL[type].toLowerCase()} booking`}
        onClose={() => setCancelOpen(false)}
        onComplete={reload}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Header banner — booking type icon, status, amount, supplier ref
// ───────────────────────────────────────────────────────────────────────────
function BookingHeader({
  type, status, amount, currency, supplierRef, bookingId, createdAt, loading,
}: {
  type?: 'flight' | 'accommodation' | 'activity';
  status?: string;
  amount?: number;
  currency?: string;
  supplierRef?: string;
  bookingId?: string;
  createdAt?: string;
  loading?: boolean;
}) {
  const title = type ? `${BOOKING_TYPE_LABEL[type]} booking` : 'Loading…';
  return (
    <div className="bg-sidebar-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white mb-3 font-medium uppercase tracking-wider">
          <ChevronLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-brand-blue/20 flex items-center justify-center shrink-0">
              {type && <span className="text-white">{BOOKING_TYPE_ICON[type]}</span>}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight mb-1">{title}</h1>
              {!loading && typeof amount === 'number' && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                  <span className="text-lg font-display font-bold text-white">{fmt$(amount)}</span>
                  <span className="text-zinc-400">{currency}</span>
                  {createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Booked {timeAgo(createdAt)}
                    </span>
                  )}
                </div>
              )}
              {!loading && bookingId && (
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-zinc-400 font-mono">
                  <span title="Booking ID">id: {bookingId}</span>
                  {supplierRef && <span title="Supplier reference">supplier: {supplierRef}</span>}
                </div>
              )}
            </div>
          </div>
          {status && <Badge status={status} />}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Overview tab — type-aware
// ───────────────────────────────────────────────────────────────────────────
function OverviewTab({ booking }: { booking: any }) {
  const type = booking.booking_type as 'flight' | 'accommodation' | 'activity';
  const meta = booking.metadata || {};

  return (
    <div className="flex flex-col gap-4">
      {/* Status timeline — common across all types */}
      <Section title="Booking timeline">
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <TimelineCell label="Created"   value={booking.created_at} icon={<Plus size={12} />} />
          <TimelineCell label="Paid"      value={booking.paid_at}    icon={<DollarSign size={12} />} successWhenSet />
          <TimelineCell label="Cancelled" value={booking.cancelled_at} icon={<Minus size={12} />} dangerWhenSet />
          <TimelineCell label="Updated"   value={booking.updated_at} icon={<Clock size={12} />} />
        </div>
      </Section>

      {/* Type-specific details */}
      {type === 'flight'        && <FlightOverview meta={meta} />}
      {type === 'accommodation' && <AccommodationOverview meta={meta} />}
      {type === 'activity'      && <ActivityOverview meta={meta} />}

      {/* Cancellation context — only if cancelled */}
      {booking.status === 'cancelled' && (
        <Section title="Cancellation">
          <div className="p-5 flex flex-col gap-2">
            <div className="text-sm text-body">
              <span className="text-muted text-[11px] uppercase tracking-wider block mb-1">Reason</span>
              {booking.cancellation_reason || <span className="text-muted italic">No reason recorded</span>}
            </div>
            {booking.cancelled_by_admin_id && (
              <div className="text-[11px] text-muted">
                Cancelled by admin <code className="font-mono bg-surface px-1 py-0.5 rounded">{booking.cancelled_by_admin_id.slice(0, 8)}…</code>
                {booking.cancelled_at && <span> at {new Date(booking.cancelled_at).toLocaleString()}</span>}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Raw metadata for debugging */}
      {Object.keys(meta).length > 0 && (
        <Section title="Cached supplier metadata">
          <div className="p-5">
            <details>
              <summary className="text-xs text-muted cursor-pointer hover:text-body">
                Show raw JSON ({Object.keys(meta).length} fields)
              </summary>
              <pre className="mt-3 text-[10px] bg-surface rounded p-3 overflow-x-auto font-mono text-body">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </details>
          </div>
        </Section>
      )}
    </div>
  );
}

function TimelineCell({
  label, value, icon, successWhenSet, dangerWhenSet,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  successWhenSet?: boolean;
  dangerWhenSet?: boolean;
}) {
  const set = !!value;
  const tone = set
    ? (successWhenSet ? 'text-status-success' : dangerWhenSet ? 'text-status-danger' : 'text-ink')
    : 'text-muted';
  return (
    <div className="bg-surface rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={tone}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</span>
      </div>
      <div className={`text-xs font-medium ${tone}`}>
        {set ? (
          <span title={new Date(value!).toLocaleString()}>{timeAgo(value!)}</span>
        ) : (
          <span className="italic">Not yet</span>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Flight-specific overview — segments, passengers, cabin class
// ───────────────────────────────────────────────────────────────────────────
function FlightOverview({ meta }: { meta: any }) {
  const segments = meta.segments || meta.slices || [];
  const passengers = meta.passengers || [];
  const airline = meta.airline || meta.carrier;
  const cabin = meta.cabin_class || meta.cabin;

  return (
    <>
      <Section title="Flight details" action={<Plane size={14} className="text-muted" />}>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <FieldCell label="Origin"        value={meta.origin || meta.origin_iata} />
          <FieldCell label="Destination"   value={meta.destination || meta.destination_iata} />
          <FieldCell label="Airline"       value={airline} />
          <FieldCell label="Cabin class"   value={cabin} />
          <FieldCell label="Departure"     value={meta.departure ? new Date(meta.departure).toLocaleString() : null} />
          <FieldCell label="Arrival"       value={meta.arrival ? new Date(meta.arrival).toLocaleString() : null} />
          <FieldCell label="Duration"      value={meta.duration} />
          <FieldCell label="Stops"         value={typeof meta.stops === 'number' ? `${meta.stops} stop${meta.stops === 1 ? '' : 's'}` : null} />
        </div>
      </Section>

      {segments.length > 0 && (
        <Section title={`Segments (${segments.length})`} action={<Hash size={14} className="text-muted" />}>
          <div className="divide-y divide-hairline">
            {segments.map((s: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-ink text-sm">
                    {s.origin || s.from || '?'} → {s.destination || s.to || '?'}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {s.departure && <span>Dep {new Date(s.departure).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                    {s.arrival && <span> · Arr {new Date(s.arrival).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted">
                  {s.flight_number && <div className="font-mono">{s.flight_number}</div>}
                  {s.aircraft && <div>{s.aircraft}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {passengers.length > 0 && (
        <Section title={`Passengers (${passengers.length})`}>
          <div className="divide-y divide-hairline">
            {passengers.map((p: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink text-sm">
                    {p.given_name || p.first_name} {p.family_name || p.last_name}
                  </div>
                  <div className="text-[11px] text-muted">{p.type || 'adult'}{p.dob ? ` · DOB ${p.dob}` : ''}</div>
                </div>
                {p.seat && <span className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded">{p.seat}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {segments.length === 0 && passengers.length === 0 && (
        <Section title="Flight metadata">
          <div className="p-5 text-sm text-body">
            <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3 text-xs">
              <strong>No cached Duffel data on this booking.</strong> Segments, passengers, and seat assignments come from the Duffel API. Phase 5 (#33 — Edge Function health monitoring) wires the real Duffel pull so this section populates automatically.
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Accommodation-specific overview
// ───────────────────────────────────────────────────────────────────────────
function AccommodationOverview({ meta }: { meta: any }) {
  const guests = meta.guests || [];
  const nights = meta.check_in && meta.check_out
    ? Math.round((new Date(meta.check_out).getTime() - new Date(meta.check_in).getTime()) / 86400000)
    : null;

  return (
    <>
      <Section title="Stay details" action={<Hotel size={14} className="text-muted" />}>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <FieldCell label="Property"     value={meta.property_name || meta.hotel_name} />
          <FieldCell label="Island"       value={meta.island} />
          <FieldCell label="Room type"    value={meta.room_type} />
          <FieldCell label="Rate plan"    value={meta.rate_plan} />
          <FieldCell label="Check-in"     value={meta.check_in ? new Date(meta.check_in).toLocaleDateString() : null} />
          <FieldCell label="Check-out"    value={meta.check_out ? new Date(meta.check_out).toLocaleDateString() : null} />
          <FieldCell label="Nights"       value={nights} />
          <FieldCell label="Guests"       value={meta.guest_count || guests.length || null} />
        </div>
      </Section>

      {(meta.cancellation_policy || meta.refundable !== undefined) && (
        <Section title="Cancellation policy">
          <div className="p-5 flex flex-col gap-2">
            {meta.refundable !== undefined && (
              <div className={`inline-flex items-center gap-2 text-sm font-medium ${meta.refundable ? 'text-status-success' : 'text-status-danger'}`}>
                {meta.refundable ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {meta.refundable ? 'Refundable' : 'Non-refundable'}
              </div>
            )}
            {meta.cancellation_policy && (
              <p className="text-xs text-body">{meta.cancellation_policy}</p>
            )}
          </div>
        </Section>
      )}

      {guests.length > 0 && (
        <Section title={`Guests (${guests.length})`}>
          <div className="divide-y divide-hairline">
            {guests.map((g: any, i: number) => (
              <div key={i} className="px-5 py-3">
                <div className="font-semibold text-ink text-sm">
                  {g.given_name || g.first_name} {g.family_name || g.last_name}
                </div>
                <div className="text-[11px] text-muted">{g.type || 'adult'}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!meta.property_name && !meta.hotel_name && (
        <Section title="Hotel metadata">
          <div className="p-5 text-sm text-body">
            <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3 text-xs">
              <strong>No cached LiteAPI data on this booking.</strong> Property name, room type, and cancellation policy come from the LiteAPI sandbox/production API. Phase 5 wires the real LiteAPI pull.
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Activity-specific overview
// ───────────────────────────────────────────────────────────────────────────
function ActivityOverview({ meta }: { meta: any }) {
  return (
    <>
      <Section title="Experience details" action={<Activity size={14} className="text-muted" />}>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <FieldCell label="Title"        value={meta.title || meta.product_name} />
          <FieldCell label="Operator"     value={meta.operator || meta.supplier_name} />
          <FieldCell label="Island"       value={meta.island || meta.location} />
          <FieldCell label="Date"         value={meta.activity_date ? new Date(meta.activity_date).toLocaleDateString() : null} />
          <FieldCell label="Start time"   value={meta.start_time} />
          <FieldCell label="Duration"     value={meta.duration} />
          <FieldCell label="Participants" value={meta.participant_count || meta.guests} />
          <FieldCell label="Meeting point" value={meta.meeting_point} />
        </div>
      </Section>

      {!meta.title && !meta.product_name && (
        <Section title="Activity metadata">
          <div className="p-5 text-sm text-body">
            <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3 text-xs">
              <strong>No cached Viator data on this booking.</strong> Activity title, operator, meeting point come from the Viator Merchant API. Activation pending the Viator sandbox key (see project memory) — once that lands, this section populates.
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

function FieldCell({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</span>
      <span className="text-sm text-ink font-medium">{value ?? <span className="text-muted font-normal">—</span>}</span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Trip context tab — owner + linked trip
// ───────────────────────────────────────────────────────────────────────────
function TripContextTab({ trip, owner }: { trip: any; owner: any }) {
  if (!trip) {
    return (
      <Section title="Trip context">
        <div className="px-5 py-12 text-center text-sm text-muted">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          This booking isn&apos;t linked to a trip (the trip may have been deleted).
        </div>
      </Section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="Trip">
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link href={`/trips/${trip.id}`} className="font-semibold text-ink text-base hover:text-brand-blue inline-flex items-center gap-1">
              {trip.name} <ExternalLink size={12} />
            </Link>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
              {trip.date_start && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(trip.date_start).toLocaleDateString()}
                  {trip.date_end && ` – ${new Date(trip.date_end).toLocaleDateString()}`}
                </span>
              )}
              {(trip.islands || []).length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {trip.islands.join(', ')}
                </span>
              )}
            </div>
          </div>
          <Badge status={trip.status} />
        </div>
      </Section>

      {owner && (
        <Section title="Owner">
          <div className="p-5 flex items-start justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue-dark font-bold text-sm">
                {(owner.display_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <Link href={`/users/${owner.id}`} className="font-semibold text-ink hover:text-brand-blue inline-flex items-center gap-1">
                  {owner.display_name || 'Unknown'} <ExternalLink size={11} />
                </Link>
                <div className="text-[11px] text-muted">
                  {owner.email || <span className="italic">Anonymous</span>}
                  {owner.country && <span> · {owner.city ? `${owner.city}, ` : ''}{owner.country}</span>}
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Audit tab — chronological list of admin actions on this booking
// ───────────────────────────────────────────────────────────────────────────
function AuditTab({ auditLog }: { auditLog: any[] }) {
  if (auditLog.length === 0) {
    return (
      <Section title="Audit history">
        <div className="px-5 py-12 text-center text-sm text-muted">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          No admin actions on this booking yet.
        </div>
      </Section>
    );
  }
  return (
    <Section title={`Audit history (${auditLog.length})`}>
      <div className="divide-y divide-hairline">
        {auditLog.map((entry: any) => (
          <div key={entry.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-ink">{entry.action}</span>
                  <span className="text-[10px] text-muted font-mono">{entry.admin_email}</span>
                </div>
                {entry.metadata?.reason && (
                  <p className="text-xs text-body italic">&ldquo;{entry.metadata.reason}&rdquo;</p>
                )}
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-[10px] text-muted cursor-pointer hover:text-body">Show metadata</summary>
                    <pre className="mt-1 text-[10px] bg-surface rounded p-2 overflow-x-auto font-mono">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <div className="text-[11px] text-muted whitespace-nowrap text-right">
                <div title={new Date(entry.created_at).toLocaleString()}>{timeAgo(entry.created_at)}</div>
                {entry.ip_address && <div className="font-mono opacity-60">{entry.ip_address}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Admin tab — single Cancel button (the modal is rendered at page level)
// ───────────────────────────────────────────────────────────────────────────
function AdminTab({
  booking, isTerminal, onCancel,
}: {
  booking: any;
  isTerminal: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Admin actions">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-body">
            Privileged actions on this booking. All actions are logged to the audit trail with the admin&apos;s identity, IP, and before/after state.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={onCancel}
              disabled={isTerminal}
              className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                isTerminal
                  ? 'border-hairline bg-surface text-muted cursor-not-allowed'
                  : 'border-status-danger/30 bg-status-danger-bg text-status-danger hover:border-status-danger'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} />
                <span className="font-semibold">Cancel booking</span>
              </div>
              <div className="text-[11px]">
                {isTerminal ? `Already ${booking.status}` : `Cancels this ${booking.booking_type} booking (${fmt$(parseFloat(booking.amount))})`}
              </div>
            </button>
            <button disabled className="px-4 py-3 rounded-lg border border-hairline bg-surface text-muted text-sm font-medium cursor-not-allowed text-left">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} />
                <span className="font-semibold">Resend confirmation email</span>
              </div>
              <div className="text-[11px]">Re-fires booking confirmation via Zoho Mail (Phase 3)</div>
            </button>
          </div>
        </div>
      </Section>

      <Section title="Quick references">
        <div className="p-5 text-xs text-body flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted">Booking ID:</span>
            <code className="font-mono bg-surface px-2 py-0.5 rounded text-[11px]">{booking.id}</code>
          </div>
          {booking.supplier_ref && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Supplier ref:</span>
              <code className="font-mono bg-surface px-2 py-0.5 rounded text-[11px]">{booking.supplier_ref}</code>
            </div>
          )}
          {booking.trip_id && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Trip:</span>
              <Link href={`/trips/${booking.trip_id}`} className="text-brand-blue hover:underline inline-flex items-center gap-1">
                {booking.trip_id.slice(0, 8)}… <ExternalLink size={11} />
              </Link>
            </div>
          )}
          <a
            href={`/?page=audit&entity_type=booking&entity_id=${booking.id}`}
            className="inline-flex items-center gap-1 text-brand-blue hover:underline mt-1"
          >
            View global audit log for this booking <ExternalLink size={11} />
          </a>
        </div>
      </Section>
    </div>
  );
}
