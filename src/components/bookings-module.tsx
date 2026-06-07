'use client';

import { AlertTriangle, CreditCard, DollarSign, FileText, RefreshCw } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type BookingRow = {
  id: string;
  booking_type: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
  reference_id: string | null;
};

type BookingsResponse = {
  bookings: BookingRow[];
  summary: Record<string, number>;
};

function money(value: unknown, currency = 'USD') {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  const amount = Number.isFinite(n) ? n : 0;
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand-blue">{icon}</span>
        <span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const value = status || 'unknown';
  const cls = value === 'confirmed' ? 'bg-status-success-bg text-status-success' : value === 'failed' || value === 'cancelled' || value === 'refunded' ? 'bg-status-danger-bg text-status-danger' : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{value}</span>;
}

export function BookingsModule() {
  const { data, loading, error, reload } = useApi<BookingsResponse>('/api/bookings?limit=100');

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Bookings unavailable</h3>
        <p className="text-sm text-body">{error || 'The bookings API did not return data.'}</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Booking Operations</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">Track booking status, booking category, providers, payment references, gross booking value, confirmed revenue, and failed/cancelled bookings.</p>
          </div>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue">
            <RefreshCw size={13} className="inline mr-1" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<FileText size={18} />} label="Bookings" value={s.total || 0} sub={`${s.pending || 0} pending · ${s.confirmed || 0} confirmed`} />
        <Stat icon={<DollarSign size={18} />} label="Gross Booking Value" value={money(s.grossBookingValue || 0)} sub="All listed bookings" />
        <Stat icon={<CreditCard size={18} />} label="Confirmed Revenue" value={money(s.confirmedRevenue || 0)} sub="Confirmed or paid" />
        <Stat icon={<AlertTriangle size={18} />} label="Failed / Cancelled" value={(s.failed || 0) + (s.cancelled || 0) + (s.refunded || 0)} sub={`${s.failed || 0} failed · ${s.cancelled || 0} cancelled`} />
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Booking list</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Booking</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Category</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Provider</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Amount</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map(booking => (
                <tr key={booking.id} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3"><div className="font-mono text-xs text-ink">{booking.id.slice(0, 8)}…</div><div className="text-[11px] text-muted">{booking.stripe_payment_intent_id || booking.reference_id || 'No external ref'}</div></td>
                  <td className="px-4 py-3 capitalize text-body">{booking.booking_type || 'unknown'}</td>
                  <td className="px-4 py-3 capitalize text-body">{booking.provider || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{money(booking.amount, booking.currency || 'USD')}</td>
                  <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(booking.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.bookings.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No bookings found yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
