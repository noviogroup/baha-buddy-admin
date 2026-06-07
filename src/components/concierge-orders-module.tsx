'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, DollarSign, FileText, RefreshCw, UserCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

type ConciergeOrder = {
  id: string;
  offer_type: string;
  price_usd: number | string | null;
  status: string;
  payment_status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_metadata?: Record<string, unknown> | null;
  source: string | null;
  traveler_name: string | null;
  traveler_email: string | null;
  travel_dates: string | null;
  destination_interests: string | null;
  party_size: string | null;
  budget_range: string | null;
  notes: string | null;
  assigned_team_member?: string | null;
  internal_notes?: string | null;
  final_itinerary?: string | null;
  delivered_plan_url: string | null;
  delivered_at?: string | null;
  created_at: string;
};

type ConciergeResponse = {
  orders: ConciergeOrder[];
  summary: Record<string, number>;
};

const statusOptions = ['selected', 'checkout_started', 'paid', 'details_needed', 'in_review', 'needs_info', 'in_progress', 'itinerary_proposed', 'delivered', 'cancelled', 'refunded', 'payment_failed'];

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'delivered'
    ? 'bg-status-success-bg text-status-success'
    : status === 'refunded' || status === 'payment_failed' || status === 'cancelled'
      ? 'bg-status-danger-bg text-status-danger'
      : status === 'checkout_started' || status === 'selected' || status === 'details_needed'
        ? 'bg-brand-blue-light text-brand-blue-dark'
        : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{status.replace('_', ' ')}</span>;
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

function MetadataBlock({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const entries = Object.entries(metadata || {});
  if (entries.length === 0) return <div className="text-xs text-muted">No Stripe metadata captured.</div>;
  return (
    <div className="grid grid-cols-1 gap-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 text-xs">
          <span className="font-semibold text-body">{key}</span>
          <span className="text-muted text-right break-all">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ConciergeOrdersModule() {
  const [filters, setFilters] = useState({ status: 'all', payment_status: 'all', offer_type: 'all', source: 'all' });
  const [selected, setSelected] = useState<ConciergeOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const url = `/api/concierge-orders?status=${filters.status}&payment_status=${filters.payment_status}&offer_type=${filters.offer_type}&source=${filters.source}&limit=100`;
  const { data, loading, error, reload } = useApi<ConciergeResponse>(url);

  const updateOrder = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/concierge-orders', { method: 'PATCH', body: JSON.stringify({ id: selected.id, ...patch }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Update failed: ${res.status}`);
      const json = await res.json();
      setSelected(json.order || selected);
      await reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Concierge orders unavailable</h3><p className="text-sm text-body">{error || 'The concierge orders API did not return data.'}</p></div>;

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Concierge Orders Queue</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">Track account-based checkout, paid orders, trip details, itinerary proposal, fulfillment, and delivery.</p>
          </div>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue"><RefreshCw size={13} className="inline mr-1" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<FileText size={18} />} label="Orders" value={s.total || 0} sub={`${s.checkout_started || 0} checkout · ${s.in_review || 0} review`} />
        <Stat icon={<DollarSign size={18} />} label="Paid Revenue" value={money(s.revenue || 0)} sub="Paid checkout revenue" />
        <Stat icon={<UserCheck size={18} />} label="Delivered" value={s.delivered || 0} sub={`${s.itinerary_proposed || 0} proposed`} />
        <Stat icon={<AlertTriangle size={18} />} label="Issues" value={(s.refunded || 0) + (s.payment_failed || 0) + (s.cancelled || 0)} sub="Refunds, failures, cancellations" />
      </div>

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
        <div className="grid grid-cols-[170px_170px_210px_180px] gap-2">
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All status</option>{statusOptions.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select>
          <select value={filters.payment_status} onChange={e => setFilters({ ...filters, payment_status: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select>
          <select value={filters.offer_type} onChange={e => setFilters({ ...filters, offer_type: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All offers</option><option value="quick_review">Quick Review</option><option value="concierge_trip_plan">Concierge Trip Plan</option><option value="full_planning_support">Full Planning Support</option></select>
          <select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} className="border border-hairline rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All sources</option><option value="concierge_page">Concierge page</option><option value="hero_cta">Hero CTA</option><option value="pricing_cta">Pricing CTA</option></select>
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline baha-gradient-card flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-brand-blue mb-1">Order detail</div>
              <h3 className="text-lg font-display font-bold text-ink capitalize">{selected.offer_type.replace(/_/g, ' ')} · {money(selected.price_usd)}</h3>
              <div className="text-xs text-body mt-1">{selected.traveler_name || 'Unnamed traveler'} · {selected.traveler_email || 'No email'}</div>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="p-5 grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="border border-hairline rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Stripe reconciliation</div>
                <div className="text-sm text-body"><strong>Session:</strong> {selected.stripe_checkout_session_id || '—'}</div>
                <div className="text-sm text-body mt-1"><strong>Payment intent:</strong> {selected.stripe_payment_intent_id || '—'}</div>
                <div className="text-sm text-body mt-1"><strong>Source:</strong> {selected.source || '—'}</div>
              </div>
              <div className="border border-hairline rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">Stripe metadata</div>
                <MetadataBlock metadata={selected.stripe_metadata} />
              </div>
              <div className="border border-hairline rounded-xl p-4 text-sm text-body space-y-1">
                <div><strong>Travel dates:</strong> {selected.travel_dates || '—'}</div>
                <div><strong>Group size:</strong> {selected.party_size || '—'}</div>
                <div><strong>Budget:</strong> {selected.budget_range || '—'}</div>
                <div><strong>Islands:</strong> {selected.destination_interests || '—'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <select value={selected.status} onChange={e => updateOrder({ status: e.target.value })} disabled={saving} className="w-full border border-hairline rounded-lg px-3 py-2 text-sm bg-white">{statusOptions.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select>
              <input defaultValue={selected.assigned_team_member || ''} onBlur={e => updateOrder({ assigned_team_member: e.target.value })} placeholder="Assigned team member" className="w-full border border-hairline rounded-lg px-3 py-2 text-sm" />
              <input defaultValue={selected.delivered_plan_url || ''} onBlur={e => updateOrder({ delivered_plan_url: e.target.value })} placeholder="Delivered plan URL" className="w-full border border-hairline rounded-lg px-3 py-2 text-sm" />
              <textarea defaultValue={selected.internal_notes || ''} onBlur={e => updateOrder({ internal_notes: e.target.value })} placeholder="Internal notes" className="w-full border border-hairline rounded-lg px-3 py-2 text-sm min-h-20" />
              <textarea defaultValue={selected.final_itinerary || ''} onBlur={e => updateOrder({ final_itinerary: e.target.value })} placeholder="Final itinerary / delivered plan text" className="w-full border border-hairline rounded-lg px-3 py-2 text-sm min-h-24" />
              <button onClick={() => updateOrder({ status: 'delivered' })} disabled={saving} className="px-4 py-2 rounded-lg bg-status-success text-white text-sm font-semibold"><CheckCircle2 size={14} className="inline mr-1" /> Mark Delivered</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline"><h3 className="text-sm font-semibold text-ink">Order queue</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Order</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Offer</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Traveler</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Amount</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Assigned</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Created</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id} className={`border-b border-hairline last:border-0 hover:bg-surface/50 ${selected?.id === order.id ? 'bg-brand-blue-light/60' : ''}`}><td className="px-4 py-3"><div className="font-mono text-xs text-ink">{order.id.slice(0, 8)}…</div><div className="text-[11px] text-muted">{order.stripe_checkout_session_id || 'No Stripe session'}</div></td><td className="px-4 py-3 capitalize text-body">{order.offer_type.replace(/_/g, ' ')}</td><td className="px-4 py-3"><div className="font-semibold text-ink">{order.traveler_name || 'Unnamed'}</div><div className="text-[11px] text-muted">{order.traveler_email || 'No email'}</div></td><td className="px-4 py-3 font-semibold text-ink">{money(order.price_usd)}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td><td className="px-4 py-3 text-body">{order.assigned_team_member || '—'}</td><td className="px-4 py-3 text-xs text-muted">{new Date(order.created_at).toLocaleDateString()}</td><td className="px-4 py-3"><button onClick={() => setSelected(order)} className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-semibold text-body hover:bg-surface">Detail</button></td></tr>)}{data.orders.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">No concierge orders yet. Paid Stripe checkouts will appear here.</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}
