'use client';

import { useState } from 'react';
import { AlertTriangle, CreditCard, DollarSign, FileText, RefreshCw, RotateCcw } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type PaymentRow = {
  id: string;
  user_id: string | null;
  offer_type: string | null;
  price_usd: number | string | null;
  status: string | null;
  payment_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  source: string | null;
  traveler_name: string | null;
  traveler_email: string | null;
  created_at: string;
};

type PaymentsResponse = {
  payments: PaymentRow[];
  summary: Record<string, number>;
  byOffer: { label: string; count: number; revenue: number }[];
  bySource: { label: string; count: number; revenue: number }[];
};

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clean(value?: string | null) {
  return (value || 'unknown').replace(/_/g, ' ');
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="flex items-center gap-2 mb-2"><span className="text-brand-blue">{icon}</span><span className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</span></div><div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>{sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}</div>;
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || 'unknown';
  const cls = value === 'paid' ? 'bg-status-success-bg text-status-success' : value === 'refunded' || value === 'failed' ? 'bg-status-danger-bg text-status-danger' : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{clean(value)}</span>;
}

export function PaymentsModule() {
  const [filters, setFilters] = useState({ payment_status: 'all', offer_type: 'all', source: 'all' });
  const url = `/api/payments?payment_status=${filters.payment_status}&offer_type=${filters.offer_type}&source=${filters.source}&limit=100`;
  const { data, loading, error, reload } = useApi<PaymentsResponse>(url);

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Payments unavailable</h3><p className="text-sm text-body">{error || 'The payments API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Payments & Receipts</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Reconcile Concierge payments, Stripe references, customer receipts, paid revenue, refunds, and source attribution.</p></div><button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue"><RefreshCw size={13} className="inline mr-1" /> Refresh</button></div></div>

      <div className="grid grid-cols-4 gap-3"><Stat icon={<DollarSign size={18} />} label="Paid Revenue" value={money(s.paidRevenue || 0)} sub={`${s.paid || 0} paid orders`} /><Stat icon={<FileText size={18} />} label="Payments" value={s.total || 0} sub={`${s.unpaid || 0} unpaid · ${s.failed || 0} failed`} /><Stat icon={<RotateCcw size={18} />} label="Refunded" value={money(s.refundedRevenue || 0)} sub={`${s.refunded || 0} refunded orders`} /><Stat icon={<CreditCard size={18} />} label="Reconciliation" value={(s.paid || 0) + (s.refunded || 0)} sub="Stripe-linked records" /></div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card"><div className="grid grid-cols-[170px_210px_180px] gap-2"><select value={filters.payment_status} onChange={e => setFilters({ ...filters, payment_status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select><select value={filters.offer_type} onChange={e => setFilters({ ...filters, offer_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All offers</option><option value="quick_review">Quick Review</option><option value="concierge_trip_plan">Concierge Trip Plan</option><option value="full_planning_support">Full Planning Support</option></select><select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All sources</option><option value="concierge_page">Concierge page</option><option value="hero_cta">Hero CTA</option><option value="pricing_cta">Pricing CTA</option></select></div></div>

      <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-xl border border-hairline p-4 shadow-card"><h3 className="text-sm font-semibold text-ink mb-3">Revenue by offer</h3><div className="space-y-2">{data.byOffer.map(row => <div key={row.label} className="flex justify-between text-sm"><span className="capitalize text-body">{clean(row.label)} · {row.count}</span><span className="font-semibold text-ink">{money(row.revenue)}</span></div>)}{data.byOffer.length === 0 && <p className="text-sm text-muted">No offer revenue yet.</p>}</div></div><div className="bg-white rounded-xl border border-hairline p-4 shadow-card"><h3 className="text-sm font-semibold text-ink mb-3">Revenue by source</h3><div className="space-y-2">{data.bySource.map(row => <div key={row.label} className="flex justify-between text-sm"><span className="capitalize text-body">{clean(row.label)} · {row.count}</span><span className="font-semibold text-ink">{money(row.revenue)}</span></div>)}{data.bySource.length === 0 && <p className="text-sm text-muted">No source revenue yet.</p>}</div></div></div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Payment records</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Customer</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Offer</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Amount</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Payment</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Stripe Refs</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Source</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Created</th></tr></thead><tbody>{data.payments.map(payment => <tr key={payment.id} className="border-b border-hairline last:border-0 hover:bg-surface/50"><td className="px-4 py-3"><div className="font-semibold text-ink">{payment.traveler_name || 'Unnamed'}</div><div className="text-[11px] text-muted">{payment.traveler_email || payment.user_id || 'No customer ref'}</div></td><td className="px-4 py-3 capitalize text-body">{clean(payment.offer_type)}</td><td className="px-4 py-3 font-semibold text-ink">{money(payment.price_usd)}</td><td className="px-4 py-3"><StatusBadge status={payment.payment_status} /></td><td className="px-4 py-3"><div className="font-mono text-[11px] text-ink">{payment.stripe_checkout_session_id || 'No session'}</div><div className="font-mono text-[11px] text-muted">{payment.stripe_payment_intent_id || 'No PI'}</div></td><td className="px-4 py-3 text-body">{payment.source || '—'}</td><td className="px-4 py-3 text-xs text-muted">{new Date(payment.created_at).toLocaleDateString()}</td></tr>)}{data.payments.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">No payment records yet.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
