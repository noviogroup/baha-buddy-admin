'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, DollarSign, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type PaymentRow = {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  booking_type: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  payment_status: string | null;
  provider_status: string | null;
  source_surface: string | null;
  provider_reference: string | null;
  failure_state: string | null;
  reconciled: boolean;
  stripe_payment_intent_id: string | null;
  booking_reference: string | null;
  external_reference: string | null;
  trip_item_id: string | null;
  trip_item_type: string | null;
  trip_item_name: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

type PaymentsResponse = {
  payments: PaymentRow[];
  summary: Record<string, number>;
  byOffer: { label: string; count: number; revenue: number; captured: number }[];
  bySource: { label: string; count: number; revenue: number; captured: number }[];
  byProviderStatus: { label: string; count: number; revenue: number; captured: number }[];
};

function money(value: unknown, currency = 'USD') {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  const amount = Number.isFinite(n) ? n : 0;
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clean(value?: string | null) {
  return (value || 'unknown').replace(/_/g, ' ');
}

function receiptNo(id: string) {
  return `BB-${String(id).slice(0, 8).toUpperCase()}`;
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | number; sub?: string }) {
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

function StatusBadge({ status, kind = 'payment' }: { status?: string | null; kind?: 'payment' | 'provider' }) {
  const value = status || 'unknown';
  const cls = value === 'paid' || value === 'confirmed'
    ? 'bg-status-success-bg text-status-success'
    : value === 'refunded' || value === 'failed' || value === 'cancelled'
      ? 'bg-status-danger-bg text-status-danger'
      : 'bg-status-warning-bg text-status-warning';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {kind}: {clean(value)}
    </span>
  );
}

function FailureBadge({ state }: { state?: string | null }) {
  const value = state || 'none';
  if (value === 'none') return <span className="text-xs text-muted">No recovery issue</span>;
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-status-danger-bg text-status-danger text-[11px] font-bold uppercase tracking-wide">
      {clean(value)}
    </span>
  );
}

function PaymentDetail({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline bg-surface/50 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Canonical payment reconciliation</div>
          <h3 className="text-lg font-display font-bold text-ink capitalize">
            {clean(payment.booking_type)} · {money(payment.amount, payment.currency || 'USD')}
          </h3>
          <div className="text-xs text-body mt-1">
            Receipt {receiptNo(payment.id)} · {new Date(payment.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={payment.payment_status} />
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-white/70" aria-label="Close payment detail">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-3 gap-4 text-sm">
        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Traveler and trip</div>
          <div className="font-semibold text-ink">{payment.trip_item_name || 'Booking item'}</div>
          <div className="text-body mt-1">Trip: {payment.trip_id || 'No trip linked'}</div>
          <div className="text-xs text-muted mt-2">User ID: {payment.user_id || 'No user ref'}</div>
        </div>
        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Payment and provider</div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={payment.payment_status} />
            <StatusBadge status={payment.provider_status} kind="provider" />
          </div>
          <div className="mt-3">
            <FailureBadge state={payment.failure_state} />
          </div>
        </div>
        <div className="border border-hairline rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">References</div>
          <div className="font-mono text-xs text-ink break-all">PI: {payment.stripe_payment_intent_id || 'None'}</div>
          <div className="font-mono text-xs text-muted break-all mt-2">Provider: {payment.provider_reference || 'None'}</div>
          <div className="text-xs text-muted mt-2">Source: {payment.source_surface || 'unknown'}</div>
        </div>
      </div>

      <div className="px-5 pb-5 grid grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Receipt:</span> {receiptNo(payment.id)}</div>
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Provider:</span> {payment.provider || 'unknown'}</div>
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Trip item:</span> {payment.trip_item_id || 'not linked'}</div>
        <div className="rounded-lg bg-surface p-3"><span className="font-bold text-ink">Reconciled:</span> {payment.reconciled ? 'yes' : 'no'}</div>
      </div>
    </div>
  );
}

export function PaymentsModule() {
  const [filters, setFilters] = useState({ payment_status: 'all', booking_type: 'all', provider_status: 'all', source: 'all' });
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const url = `/api/payments?payment_status=${filters.payment_status}&booking_type=${filters.booking_type}&provider_status=${filters.provider_status}&source=${filters.source}&limit=100`;
  const { data, loading, error, reload } = useApi<PaymentsResponse>(url);

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Payments unavailable</h3><p className="text-sm text-body">{error || 'The payments API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Payments & Receipts</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Reconcile canonical bookings across flights, stays, activities, and concierge. Payment status, provider status, source surface, and local save state stay separate.
            </p>
          </div>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue">
            <RefreshCw size={13} className="inline mr-1" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<DollarSign size={18} />} label="Recognized Revenue" value={money(s.paidRevenue || 0)} sub={`${s.reconciled || 0} reconciled bookings`} />
        <Stat icon={<CreditCard size={18} />} label="Captured Payments" value={money(s.capturedAmount || 0)} sub={`${s.paid || 0} paid payment rows`} />
        <Stat icon={<CheckCircle2 size={18} />} label="Reconciliation" value={`${s.reconciled || 0}/${s.total || 0}`} sub={`${s.provider_confirmed || 0} provider confirmed`} />
        <Stat icon={<RotateCcw size={18} />} label="Refunds and Issues" value={s.issues || 0} sub={`${s.refunded || 0} refunded · ${s.provider_failed || 0} provider failed`} />
      </div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
        <div className="grid grid-cols-[170px_180px_190px_170px] gap-2">
          <select aria-label="Payment status" value={filters.payment_status} onChange={e => setFilters({ ...filters, payment_status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <select aria-label="Booking type" value={filters.booking_type} onChange={e => setFilters({ ...filters, booking_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All booking types</option>
            <option value="hotel">Hotel</option>
            <option value="flight">Flight</option>
            <option value="activity">Activity</option>
            <option value="concierge">Concierge</option>
          </select>
          <select aria-label="Provider status" value={filters.provider_status} onChange={e => setFilters({ ...filters, provider_status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All provider states</option>
            <option value="confirmed">Provider confirmed</option>
            <option value="pending">Provider pending</option>
            <option value="failed">Provider failed</option>
            <option value="cancelled">Provider cancelled</option>
          </select>
          <select aria-label="Source surface" value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All sources</option>
            <option value="mobile">Mobile</option>
            <option value="web">Web</option>
            <option value="chat">Chat</option>
            <option value="admin">Admin</option>
            <option value="concierge">Concierge</option>
          </select>
        </div>
      </div>

      {selected && <PaymentDetail payment={selected} onClose={() => setSelected(null)} />}

      <div className="grid grid-cols-3 gap-4">
        <PaymentBreakdown title="Revenue by booking type" rows={data.byOffer} />
        <PaymentBreakdown title="Revenue by source" rows={data.bySource} />
        <PaymentBreakdown title="Provider status" rows={data.byProviderStatus} />
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Canonical payment records</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Booking</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Type</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Amount</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Payment</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Provider</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Source</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Recovery</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map(payment => (
                <tr key={payment.id} className={`border-b border-hairline last:border-0 hover:bg-surface/50 ${selected?.id === payment.id ? 'bg-brand-blue-light/60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{payment.trip_item_name || 'Booking item'}</div>
                    <div className="font-mono text-[11px] text-muted">{receiptNo(payment.id)} · {payment.provider_reference || payment.stripe_payment_intent_id || 'No external ref'}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-body">{clean(payment.booking_type)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{money(payment.amount, payment.currency || 'USD')}</td>
                  <td className="px-4 py-3"><StatusBadge status={payment.payment_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={payment.provider_status} kind="provider" /></td>
                  <td className="px-4 py-3 capitalize text-body">{payment.source_surface || 'unknown'}</td>
                  <td className="px-4 py-3"><FailureBadge state={payment.failure_state} /></td>
                  <td className="px-4 py-3"><button onClick={() => setSelected(payment)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface">Detail</button></td>
                </tr>
              ))}
              {data.payments.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">No canonical payment records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaymentBreakdown({ title, rows }: { title: string; rows: { label: string; count: number; revenue: number; captured: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
      <h3 className="text-sm font-semibold text-ink mb-3">{title}</h3>
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between gap-3 text-sm">
            <span className="capitalize text-body">{clean(row.label)} · {row.count}</span>
            <span className="font-semibold text-ink">{money(row.revenue)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No canonical booking payments yet.</p>}
      </div>
    </div>
  );
}
