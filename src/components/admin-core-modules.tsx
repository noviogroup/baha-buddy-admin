'use client';

import { useState } from 'react';
import { AlertTriangle, BarChart3, Bot, CreditCard, FileText, HelpCircle, MapPinned, MessageSquare, RefreshCw, Send, Users, Compass, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

function titleCase(value: unknown) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function money(value: unknown, currency = 'USD') {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  const amount = (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'USD' ? `$${amount}` : `${currency} ${amount}`;
}

function Shell({ title, description, icon, children, onRefresh }: { title: string; description: string; icon: any; children: any; onRefresh?: () => void }) {
  return <div className="flex flex-col gap-5"><div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">{icon}</div><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">{title}</h2><p className="text-sm text-body max-w-3xl leading-relaxed">{description}</p></div></div>{onRefresh && <button onClick={onRefresh} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue"><RefreshCw size={13} className="inline mr-1" /> Refresh</button>}</div></div>{children}</div>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-bold tracking-wider uppercase mb-2">{label}</div><div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>{sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}</div>;
}

function ErrorCard({ label, error }: { label: string; error?: string | null }) {
  return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">{label} unavailable</h3><p className="text-sm text-body">{error || 'The API did not return data.'}</p></div>;
}

function LoadingCard() { return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>; }

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: any[][]; empty: string }) {
  return <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50">{headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">{h}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={idx} className="border-b border-hairline last:border-0 hover:bg-surface/50">{row.map((cell, i) => <td key={i} className="px-4 py-3 text-body align-top">{cell}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-muted">{empty}</td></tr>}</tbody></table></div></div>;
}

export function TravelersModule() {
  const { data, loading, error, reload } = useApi<any>('/api/users?limit=100');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Travelers" error={error} />;
  const users = data.users || [];
  const completed = users.filter((u: any) => u.onboarding_completed || u.profile_completed).length;
  const summary = data.summary || {};

  return (
    <Shell title="Travelers" description="View traveler accounts, profile completion, location signals, lifecycle readiness, and canonical booking health." icon={<Users size={19} />} onRefresh={reload}>
      {data.bookingNote && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.bookingNote}</div>}

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Travelers" value={data.total || users.length} sub={`${users.length} loaded`} />
        <Stat label="Completed profiles" value={completed} sub={`${Math.max(users.length - completed, 0)} incomplete`} />
        <Stat label="Travelers with bookings" value={summary.travelersWithBookings ?? 0} sub={`${money(summary.capturedPayments || 0)} captured`} />
        <Stat label="Booking issues" value={summary.travelersWithBookingIssues ?? 0} sub={`${money(summary.recognizedRevenue || 0)} recognized`} />
      </div>

      <SimpleTable
        headers={['Traveler','Location','Profile','Bookings','Booking health','Created']}
        rows={users.map((u: any) => {
          const booking = u.booking_summary || {};
          const sources = Array.isArray(booking.sources) && booking.sources.length ? booking.sources.join(', ') : 'unknown source';
          const providers = Array.isArray(booking.providers) && booking.providers.length ? booking.providers.join(', ') : 'unknown provider';
          const bookingTypes = Array.isArray(booking.bookingTypes) && booking.bookingTypes.length ? booking.bookingTypes.join(', ') : 'no booking types';

          return [
            <div key="traveler"><div className="font-semibold text-ink">{u.display_name || 'Unnamed'}</div><div className="text-[11px] text-muted">{u.email || u.id}</div></div>,
            [u.city, u.country].filter(Boolean).join(', ') || '—',
            u.onboarding_completed || u.profile_completed ? 'Complete' : 'Incomplete',
            <div key="bookings">
              <div className="font-semibold text-ink">{booking.total || 0} bookings · {booking.tripCount || 0} trips</div>
              <div className="text-[11px] text-muted">{money(booking.recognizedRevenue || 0)} recognized · {money(booking.capturedPayments || 0)} captured</div>
              <div className="text-[11px] text-muted capitalize">{bookingTypes}</div>
            </div>,
            <div key="booking-health">
              <div className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${booking.issues ? 'bg-status-danger-bg text-status-danger' : booking.total ? 'bg-status-success-bg text-status-success' : 'bg-surface text-muted'}`}>
                {booking.issues ? `${booking.issues} issue${booking.issues === 1 ? '' : 's'}` : booking.total ? 'No booking issues' : 'No bookings'}
              </div>
              <div className="mt-1 text-[11px] text-muted">{booking.paymentPaid || 0}/{booking.total || 0} paid · {booking.providerConfirmed || 0} confirmed · {booking.providerPending || 0} pending · {booking.providerFailed || 0} failed</div>
              <div className="text-[11px] text-muted capitalize">{providers} · {sources}</div>
              {(booking.p0Issues || 0) > 0 && <div className="mt-1 text-[11px] font-semibold text-status-danger">{booking.p0Issues} P0 recovery issue{booking.p0Issues === 1 ? '' : 's'}</div>}
            </div>,
            u.created_at ? new Date(u.created_at).toLocaleDateString() : '—',
          ];
        })}
        empty="No travelers found."
      />
    </Shell>
  );
}

export function TripsModule() {
  const { data, loading, error, reload } = useApi<any>('/api/trips?limit=100');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Trips" error={error} />;
  const trips = data.trips || [];
  const active = trips.filter((t: any) => t.status === 'active' || t.status === 'planned').length;
  const summary = data.summary || {};

  return (
    <Shell title="Trips" description="Monitor saved trips, active itineraries, abandoned plans, islands, traveler progress, and canonical booking health." icon={<Compass size={19} />} onRefresh={reload}>
      {data.bookingNote && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.bookingNote}</div>}

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Trips" value={data.total || trips.length} sub={`${trips.length} loaded`} />
        <Stat label="Active/planned" value={active} sub={`${Math.max(trips.length - active, 0)} draft/other`} />
        <Stat label="Trips with bookings" value={summary.tripsWithBookings ?? 0} sub={`${money(summary.capturedPayments || 0)} captured`} />
        <Stat label="Booking issues" value={summary.tripsWithBookingIssues ?? 0} sub={`${money(summary.recognizedRevenue || 0)} recognized`} />
      </div>

      <SimpleTable
        headers={['Trip','Traveler','Status','Bookings','Booking health','Created']}
        rows={trips.map((t: any) => {
          const booking = t.booking_summary || {};
          const sources = Array.isArray(booking.sources) && booking.sources.length ? booking.sources.join(', ') : 'unknown source';
          const providers = Array.isArray(booking.providers) && booking.providers.length ? booking.providers.join(', ') : 'unknown provider';
          const bookingTypes = Array.isArray(booking.bookingTypes) && booking.bookingTypes.length ? booking.bookingTypes.join(', ') : 'no booking types';

          return [
            <div key="trip"><div className="font-semibold text-ink">{t.name || 'Untitled trip'}</div><div className="text-[11px] text-muted">{t.id}</div></div>,
            t.users?.display_name || t.users?.email || t.user_id || '—',
            titleCase(t.status),
            <div key="bookings">
              <div className="font-semibold text-ink">{booking.total || 0} bookings</div>
              <div className="text-[11px] text-muted">{money(booking.recognizedRevenue || 0)} recognized · {money(booking.capturedPayments || 0)} captured</div>
              <div className="text-[11px] text-muted capitalize">{bookingTypes}</div>
            </div>,
            <div key="booking-health">
              <div className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${booking.issues ? 'bg-status-danger-bg text-status-danger' : booking.total ? 'bg-status-success-bg text-status-success' : 'bg-surface text-muted'}`}>
                {booking.issues ? `${booking.issues} issue${booking.issues === 1 ? '' : 's'}` : booking.total ? 'No booking issues' : 'No bookings'}
              </div>
              <div className="mt-1 text-[11px] text-muted">{booking.paymentPaid || 0}/{booking.total || 0} paid · {booking.providerConfirmed || 0} confirmed · {booking.providerPending || 0} pending · {booking.providerFailed || 0} failed</div>
              <div className="text-[11px] text-muted capitalize">{providers} · {sources}</div>
              {(booking.p0Issues || 0) > 0 && <div className="mt-1 text-[11px] font-semibold text-status-danger">{booking.p0Issues} P0 recovery issue{booking.p0Issues === 1 ? '' : 's'}</div>}
            </div>,
            t.created_at ? new Date(t.created_at).toLocaleDateString() : '—',
          ];
        })}
        empty="No trips found."
      />
    </Shell>
  );
}

export function DestinationIntelligenceModule() {
  const { data, loading, error, reload } = useApi<any>('/api/places/summary');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Destination Intelligence" error={error} />;
  const s = data.summary || {};
  return <Shell title="Destination Intelligence" description="Understand destination supply and early demand signals by island, category, source, and curation gaps." icon={<MapPinned size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Canonical places" value={s.total || 0} /><Stat label="Active" value={s.active || 0} /><Stat label="Unverified" value={s.unverified || 0} /><Stat label="Missing images" value={s.missingImages || 0} /></div><div className="grid grid-cols-2 gap-4"><SimpleTable headers={['Island','Places']} rows={(data.byIsland || []).map((r: any) => [r.label, r.count])} empty="No island data yet." /><SimpleTable headers={['Category','Places']} rows={(data.byCategory || []).map((r: any) => [titleCase(r.label), r.count])} empty="No category data yet." /></div></Shell>;
}

export function ContentPerformanceModule() {
  const { data, loading, error, reload } = useApi<any>('/api/activity-feed');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Content Performance" error={error} />;
  const feed = data.feed || [];
  const counts = feed.reduce((acc: any, item: any) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {});
  return <Shell title="Content Performance" description="Early activity attribution surface for content, chat, bookings, trips, and traveler engagement until full content-event tracking is live." icon={<FileText size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Recent activity" value={feed.length} sub="Last 24h feed" /><Stat label="Chat signals" value={counts.chat_message || 0} /><Stat label="Trips created" value={counts.trip_created || 0} /><Stat label="Bookings" value={counts.booking || 0} /></div><SimpleTable headers={['Activity','Type','When']} rows={feed.map((f: any) => [<div key="activity"><div className="font-semibold text-ink">{f.title}</div><div className="text-[11px] text-muted">{f.subtitle}</div></div>, titleCase(f.type), f.timestamp ? new Date(f.timestamp).toLocaleString() : '—'])} empty="No recent activity yet." /></Shell>;
}

export function ChatModule() {
  const { data, loading, error, reload } = useApi<any>('/api/chat-threads');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Chat & AI" error={error} />;
  const threads = data.threads || [];
  return <Shell title="Chat & AI" description="Review recent Buddy threads, traveler context, linked trips, and chat-to-trip/concierge signals." icon={<Bot size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Recent threads" value={threads.length} /><Stat label="Linked trips" value={threads.filter((t: any) => t.trip_id || t.trips).length} /><Stat label="Open conversations" value={threads.filter((t: any) => t.status !== 'closed').length} /><Stat label="Needs review" value={threads.filter((t: any) => t.needs_review).length} /></div><SimpleTable headers={['Thread','Traveler','Trip','Updated']} rows={threads.map((t: any) => [<div key="thread"><div className="font-semibold text-ink">{t.title || 'Buddy conversation'}</div><div className="text-[11px] text-muted">{t.id}</div></div>, t.users?.display_name || t.users?.email || t.user_id || '—', t.trips?.name || t.trip_id || '—', t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'])} empty="No chat threads found." /></Shell>;
}

export function CommunicationsModule() {
  const { data, loading, error, reload } = useApi<any>('/api/communications?limit=100');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleResend = async (eventId: string) => {
    setResendingId(eventId);
    setNotice(null);
    try {
      const res = await apiFetch('/api/communications', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Resend failed');
      setNotice('Transactional email resend queued.');
      reload();
    } catch (err: any) {
      setNotice(err.message || 'Resend failed');
    } finally {
      setResendingId(null);
    }
  };

  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Communications" error={error} />;
  const events = data.events || [];
  const summary = data.summary || {};

  return (
    <Shell title="Communications" description="Review transactional communication events, email/push/in-app deliveries, provider errors, and audited safe resends." icon={<MessageSquare size={19} />} onRefresh={reload}>
      {data.note && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}
      {notice && <div className="bg-brand-blue-light text-brand-blue rounded-xl border border-hairline p-4 text-sm font-semibold">{notice}</div>}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Events" value={summary.total ?? events.length} sub={`${events.length} loaded`} />
        <Stat label="Sent" value={summary.sent ?? 0} />
        <Stat label="Failed" value={summary.failed ?? 0} />
        <Stat label="Email failures" value={summary.emailFailures ?? 0} sub="Eligible for safe resend" />
      </div>

      <SimpleTable
        headers={['Event','Traveler','Deliveries','Route','Created','Action']}
        rows={events.map((event: any) => {
          const deliveries = Array.isArray(event.deliveries) ? event.deliveries : [];
          const canResend = Boolean(event.can_resend_email);
          return [
            <div key="event">
              <div className="font-semibold text-ink">{event.title || titleCase(event.type)}</div>
              <div className="text-[11px] text-muted">{titleCase(event.type)} · {titleCase(event.status)}</div>
              <div className="font-mono text-[11px] text-muted">{event.id}</div>
            </div>,
            <div key="traveler">
              <div className="font-semibold text-ink">{event.user?.display_name || event.user?.email || 'Traveler'}</div>
              <div className="font-mono text-[11px] text-muted">{event.user_id}</div>
            </div>,
            <div key="deliveries" className="flex flex-col gap-1">
              {deliveries.map((delivery: any) => (
                <span key={delivery.id} className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${delivery.status === 'sent' ? 'bg-status-success-bg text-status-success' : delivery.status === 'failed' ? 'bg-status-danger-bg text-status-danger' : 'bg-surface text-muted'}`}>
                  {delivery.channel}: {delivery.status}
                </span>
              ))}
              {deliveries.length === 0 && <span className="text-xs text-muted">No deliveries logged</span>}
            </div>,
            event.route || '—',
            event.created_at ? new Date(event.created_at).toLocaleString() : '—',
            canResend ? (
              <button key="resend" onClick={() => handleResend(event.id)} disabled={resendingId === event.id} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-body hover:border-brand-blue disabled:opacity-60" title="Resend failed transactional email">
                <Send size={13} />
                {resendingId === event.id ? 'Sending' : 'Resend email'}
              </button>
            ) : <span key="no-action" className="text-xs text-muted">—</span>,
          ];
        })}
        empty="No communication events found."
      />
    </Shell>
  );
}

export function BillingModule() {
  const { data, loading, error, reload } = useApi<any>('/api/billing');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Billing & APIs" error={error} />;
  const s = data.summary || {};
  const bookings = s.bookings || {};
  const credits = data.credits || [];
  return (
    <Shell title="Billing & APIs" description="Monitor AI/API cost, credit balances, provider health, and canonical booking revenue context." icon={<CreditCard size={19} />} onRefresh={reload}>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="AI cost today" value={money(s.aiCostToday || 0)} />
        <Stat label="AI cost month" value={money(s.aiCostMonth || 0)} />
        <Stat label="API cost month" value={money(s.apiCostMonth || 0)} />
        <Stat label="Total cost month" value={money(s.totalCostMonth || 0)} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Recognized revenue" value={money(s.revenueMonth || 0)} sub="Canonical bookings only" />
        <Stat label="Gross booking value" value={money(s.grossBookingValueMonth || 0)} sub={`${bookings.total || 0} monthly bookings`} />
        <Stat label="Captured payments" value={money(s.capturedPaymentsMonth || 0)} sub={`${bookings.paymentPaid || 0} paid payment rows`} />
        <Stat label="Booking issues" value={bookings.issues || 0} sub={`${bookings.providerFailed || 0} provider failed, ${bookings.providerPending || 0} pending`} />
      </div>

      {s.revenueSource === 'canonical_bookings' && (
        <div className="rounded-xl border border-hairline bg-surface p-4 text-sm text-body">
          Revenue is calculated from reconciled canonical booking rows. Legacy Stripe summary views are not used for revenue recognition here.
        </div>
      )}

      {data.needsMigration && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}
      <SimpleTable
        headers={['Service','Key status','Balance','Monthly usage','Plan']}
        rows={credits.map((c: any) => [c.service, titleCase(c.api_key_status), c.credit_balance ?? '—', c.current_month_usage ?? '—', c.plan_tier || '—'])}
        empty="No API credit status rows yet."
      />
    </Shell>
  );
}

export function SupportModule() {
  const { data, loading, error, reload } = useApi<any>('/api/support');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Support" error={error} />;
  const tickets = data.tickets || [];
  const bookingIssues = data.bookingIssues || [];
  const summary = data.summary || {};

  return (
    <Shell title="Support" description="Manage traveler support tickets, booking issues, Concierge follow-up, and internal response status." icon={<HelpCircle size={19} />} onRefresh={reload}>
      {data.note && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}
      {data.bookingIssueNote && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.bookingIssueNote}</div>}

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Tickets" value={summary.tickets ?? tickets.length} sub={`${summary.openTickets ?? tickets.filter((t: any) => t.status === 'open').length} open`} />
        <Stat label="In progress" value={summary.inProgressTickets ?? tickets.filter((t: any) => t.status === 'in_progress').length} sub={`${summary.resolvedTickets ?? tickets.filter((t: any) => t.status === 'resolved').length} resolved`} />
        <Stat label="Booking issues" value={summary.bookingIssues ?? bookingIssues.length} sub={`${summary.canonicalBookingsReviewed ?? 0} canonical rows reviewed`} />
        <Stat label="P0 booking issues" value={summary.p0BookingIssues ?? 0} sub={`${summary.paymentCapturedProviderFailed ?? 0} payment captured/provider failed`} />
      </div>

      <section aria-label="Support booking recovery queue" className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-hairline bg-surface/50">
          <div className="text-[11px] uppercase tracking-wider font-bold text-status-danger mb-1">Canonical booking recovery</div>
          <h3 className="text-lg font-display font-bold text-ink tracking-tight">Provider and payment issues</h3>
          <p className="mt-1 text-sm text-body">Support uses canonical bookings plus trip items here. Audit/provider payload tables remain secondary evidence, not the operational source of truth.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Booking</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Traveler</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Payment / Provider</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Recovery</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Next action</th>
              </tr>
            </thead>
            <tbody>
              {bookingIssues.map((issue: any) => (
                <tr key={issue.id} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{issue.trip_item_name || titleCase(issue.booking_type)}</div>
                    <div className="font-mono text-[11px] text-muted">{issue.id?.slice?.(0, 8) || issue.id} · {issue.provider_reference || issue.stripe_payment_intent_id || 'No external ref'}</div>
                    <div className="mt-1 text-[11px] text-muted capitalize">{issue.provider || 'unknown provider'} · {issue.source_surface || 'unknown source'} · {money(issue.amount, issue.currency || 'USD')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-ink">{issue.user_id || 'No user linked'}</div>
                    <div className="text-[11px] text-muted">Trip: {issue.trip_id || 'No trip linked'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-status-warning">Payment: {titleCase(issue.payment_status)}</span>
                      <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-status-warning">Provider: {titleCase(issue.provider_status)}</span>
                      <span className="text-[11px] text-muted">Local: {titleCase(issue.status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className="rounded-full bg-status-danger-bg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-status-danger">{issue.recovery?.priority || 'P?'}</span>
                      <span className="font-semibold text-ink">{issue.recovery?.label || titleCase(issue.failure_state)}</span>
                      <span className="text-xs leading-5 text-body">{issue.recovery?.summary || 'Review booking state before traveler follow-up.'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body">
                    <div className="max-w-sm text-xs leading-5">{issue.recovery?.nextAction || 'Review payment, provider, and local state.'}</div>
                  </td>
                </tr>
              ))}
              {bookingIssues.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">No canonical booking issues need Support action.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <SimpleTable
        headers={['Ticket','Traveler','Status','Messages','Created']}
        rows={tickets.map((t: any) => [
          <div key="ticket"><div className="font-semibold text-ink">{t.subject || 'Support request'}</div><div className="text-[11px] text-muted">{t.id}</div></div>,
          t.users?.display_name || t.users?.email || t.user_id || '—',
          titleCase(t.status),
          Array.isArray(t.support_messages) ? t.support_messages.length : 0,
          t.created_at ? new Date(t.created_at).toLocaleDateString() : '—',
        ])}
        empty="No support tickets yet."
      />
    </Shell>
  );
}

export function AuditModule() {
  const { data, loading, error, reload } = useApi<any>('/api/audit-log?limit=50');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Audit Log" error={error} />;
  const entries = data.entries || [];
  return <Shell title="Audit Log" description="Review admin activity, role changes, order updates, payment actions, PII access, and operational accountability." icon={<ShieldCheck size={19} />} onRefresh={reload}>{data.note && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}<div className="grid grid-cols-4 gap-3"><Stat label="Entries" value={data.total || entries.length} /><Stat label="Loaded" value={entries.length} /><Stat label="Admins" value={(data.filters?.admins || []).length} /><Stat label="Actions" value={(data.filters?.actions || []).length} /></div><SimpleTable headers={['Action','Admin','Entity','When']} rows={entries.map((e: any) => [<div key="action"><div className="font-semibold text-ink">{titleCase(e.action)}</div><div className="text-[11px] text-muted">{e.id}</div></div>, e.admin_email || e.admin_id || '—', `${e.entity_type || '—'} ${e.entity_id || ''}`, e.created_at ? new Date(e.created_at).toLocaleString() : '—'])} empty="No audit entries yet." /></Shell>;
}
