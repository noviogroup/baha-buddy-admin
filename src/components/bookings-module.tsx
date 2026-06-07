'use client';

import { useState } from 'react';
import { AlertTriangle, CreditCard, DollarSign, FileText, RefreshCw, WalletCards } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { BookingDetailPanel } from '@/components/booking-detail-panel';

type BookingRow = {
  id: string;
  user_id?: string | null;
  trip_id?: string | null;
  booking_type: string | null;
  provider: string | null;
  amount: number | string | null;
  gross_booking_value?: number | string | null;
  net_revenue?: number | string | null;
  partner_payout_amount?: number | string | null;
  gross_margin_after_payout?: number | string | null;
  payout_status?: string | null;
  partner_name?: string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  updated_at?: string;
  stripe_payment_intent_id: string | null;
  reference_id: string | null;
  paid_at?: string | null;
};

type BookingsResponse = { bookings: BookingRow[]; summary: Record<string, number> };

function money(value: unknown, currency = 'USD') {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  const amount = Number.isFinite(n) ? n : 0;
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="flex items-center gap-2 mb-2"><span className="text-brand-blue">{icon}</span><span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span></div><div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>{sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}</div>;
}

function StatusBadge({ status }: { status: string | null }) {
  const value = status || 'unknown';
  const cls = value === 'confirmed' ? 'bg-status-success-bg text-status-success' : value === 'failed' || value === 'cancelled' || value === 'refunded' ? 'bg-status-danger-bg text-status-danger' : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{value}</span>;
}

function PayoutBadge({ status }: { status?: string | null }) {
  const value = status || 'not_applicable';
  const cls = value === 'paid' ? 'bg-status-success-bg text-status-success' : value === 'pending' || value === 'approved' ? 'bg-status-warning-bg text-status-warning' : 'bg-surface text-muted';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{value.replace('_', ' ')}</span>;
}

export function BookingsModule() {
  const [filters, setFilters] = useState({ status: 'all', type: 'all', provider: 'all', payout_status: 'all' });
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const url = `/api/bookings?status=${filters.status}&type=${filters.type}&provider=${filters.provider}&payout_status=${filters.payout_status}&limit=100`;
  const { data, loading, error, reload } = useApi<BookingsResponse>(url);

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Bookings unavailable</h3><p className="text-sm text-body">{error || 'The bookings API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Booking Operations</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Track booking status, gross value, net revenue, partner payouts, margin after payout, payment references, and provider performance.</p></div><button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue"><RefreshCw size={13} className="inline mr-1" /> Refresh</button></div></div>

      <div className="grid grid-cols-4 gap-3"><Stat icon={<FileText size={18} />} label="Bookings" value={s.total || 0} sub={`${s.pending || 0} pending · ${s.confirmed || 0} confirmed`} /><Stat icon={<DollarSign size={18} />} label="Gross Booking Value" value={money(s.grossBookingValue || 0)} sub="Traveler-facing value" /><Stat icon={<CreditCard size={18} />} label="Net Revenue" value={money(s.netRevenue || s.confirmedRevenue || 0)} sub="Baha Buddy retained revenue" /><Stat icon={<WalletCards size={18} />} label="Partner Payouts" value={money(s.partnerPayouts || 0)} sub={`${money(s.marginAfterPayout || 0)} margin after payout`} /></div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card"><div className="grid grid-cols-[160px_160px_160px_180px] gap-2"><select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All status</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select><select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All types</option><option value="hotel">Hotel</option><option value="flight">Flight</option><option value="activity">Activity</option><option value="visa">Visa</option><option value="concierge">Concierge</option></select><select value={filters.provider} onChange={e => setFilters({ ...filters, provider: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All providers</option><option value="stripe">Stripe</option><option value="duffel">Duffel</option><option value="liteapi">LiteAPI</option><option value="viator">Viator</option><option value="manual">Manual</option></select><select value={filters.payout_status} onChange={e => setFilters({ ...filters, payout_status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All payouts</option><option value="not_applicable">No payout</option><option value="pending">Pending payout</option><option value="approved">Approved payout</option><option value="paid">Paid</option><option value="cancelled">Cancelled payout</option></select></div></div>

      {selected && <BookingDetailPanel booking={selected} onClose={() => setSelected(null)} onChanged={reload} />}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Booking list</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Booking</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Category</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Provider</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Gross / Net</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Payout</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{data.bookings.map(booking => <tr key={booking.id} className={`border-b border-hairline last:border-0 hover:bg-surface/50 ${selected?.id === booking.id ? 'bg-brand-blue-light/60' : ''}`}><td className="px-4 py-3"><div className="font-mono text-xs text-ink">{booking.id.slice(0, 8)}…</div><div className="text-[11px] text-muted">{booking.stripe_payment_intent_id || booking.reference_id || 'No external ref'}</div></td><td className="px-4 py-3 capitalize text-body">{booking.booking_type || 'unknown'}</td><td className="px-4 py-3 capitalize text-body">{booking.provider || '—'}{booking.partner_name ? <div className="text-[11px] text-muted">{booking.partner_name}</div> : null}</td><td className="px-4 py-3"><div className="font-semibold text-ink">{money(booking.gross_booking_value ?? booking.amount, booking.currency || 'USD')}</div><div className="text-[11px] text-muted">Net {money(booking.net_revenue ?? booking.amount, booking.currency || 'USD')}</div></td><td className="px-4 py-3"><div className="font-semibold text-ink">{money(booking.partner_payout_amount || 0, booking.currency || 'USD')}</div><PayoutBadge status={booking.payout_status} /></td><td className="px-4 py-3"><StatusBadge status={booking.status} /></td><td className="px-4 py-3"><button onClick={() => setSelected(booking)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface">Detail</button></td></tr>)}{data.bookings.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">No bookings found yet.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
