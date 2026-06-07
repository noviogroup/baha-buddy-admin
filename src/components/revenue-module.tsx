'use client';

import { AlertTriangle, BarChart3, CircleDollarSign, CreditCard, DollarSign, Receipt, TrendingUp, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '@/lib/use-api';

type RevenueSummary = {
  summary: {
    revenueToday: number;
    revenueThisMonth: number;
    grossBookingValue: number;
    estimatedNetRevenue: number;
    aiCostToday: number;
    aiCostMonth: number;
    apiCostMonth: number;
    revenuePerUser: number;
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    failedBookings: number;
    cancelledBookings: number;
    refundedBookings: number;
    paidUsers: number;
  };
  breakdowns: {
    byCategory: { label: string; count: number; gross: number; paid: number }[];
    byProvider: { label: string; count: number; gross: number; paid: number }[];
    byStatus: { label: string; count: number; gross: number; paid: number }[];
  };
  notes: string[];
};

const money = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RevenueCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline flex flex-col gap-2 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-brand-blue">{icon}</span>
        <span className="text-[11px] text-muted font-medium tracking-wider uppercase">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-ink tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; count: number; gross: number; paid: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
      <div className="px-5 py-3 border-b border-hairline">
        <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface/50">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Label</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Count</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Gross</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">No data yet</td></tr>
            ) : rows.map(row => (
              <tr key={row.label} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                <td className="px-4 py-3 font-semibold text-ink capitalize">{row.label.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-body">{row.count}</td>
                <td className="px-4 py-3 text-body">{money(row.gross)}</td>
                <td className="px-4 py-3 text-body">{money(row.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RevenueModule() {
  const { data, loading, error } = useApi<RevenueSummary>('/api/revenue/summary');

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="skeleton h-3 w-24 mb-3" /><div className="skeleton h-8 w-32" /></div>)}
        </div>
        <div className="bg-white rounded-xl border border-hairline h-72 shadow-card"><div className="p-5"><div className="skeleton h-4 w-40 mb-6" /><div className="skeleton h-48 w-full" /></div></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Revenue data unavailable</h3>
        <p className="text-sm text-body">{error || 'The revenue summary API did not return data.'}</p>
      </div>
    );
  }

  const s = data.summary;
  const chartData = data.breakdowns.byCategory.length > 0
    ? data.breakdowns.byCategory
    : [
      { label: 'flight', count: 0, gross: 0, paid: 0 },
      { label: 'hotel', count: 0, gross: 0, paid: 0 },
      { label: 'activity', count: 0, gross: 0, paid: 0 },
      { label: 'concierge', count: 0, gross: 0, paid: 0 },
    ];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Revenue Command Center</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Tracks booking revenue, AI costs, gross booking value, and early monetization signals. This is the starting point before adding concierge, partner, sponsored campaign, and visa referral revenue streams.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
            <TrendingUp size={13} /> Live API
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <RevenueCard icon={<DollarSign size={18} />} label="Revenue Today" value={money(s.revenueToday)} sub="Confirmed or paid bookings" />
        <RevenueCard icon={<CircleDollarSign size={18} />} label="Revenue This Month" value={money(s.revenueThisMonth)} sub="Paid revenue recognized" />
        <RevenueCard icon={<CreditCard size={18} />} label="Gross Booking Value" value={money(s.grossBookingValue)} sub={`${s.totalBookings} bookings this month`} />
        <RevenueCard icon={<Zap size={18} />} label="AI Cost This Month" value={money(s.aiCostMonth)} sub={`${money(s.aiCostToday)} today`} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <RevenueCard icon={<Receipt size={18} />} label="Estimated Net" value={money(s.estimatedNetRevenue)} sub="Revenue minus AI cost only" />
        <RevenueCard icon={<UsersIcon />} label="Paid Users" value={s.paidUsers} sub={`${money(s.revenuePerUser)} revenue/user`} />
        <RevenueCard icon={<BarChart3 size={18} />} label="Confirmed Bookings" value={s.confirmedBookings} sub={`${s.pendingBookings} pending, ${s.failedBookings} failed`} />
        <RevenueCard icon={<AlertTriangle size={18} />} label="Refunds/Cancels" value={s.cancelledBookings + s.refundedBookings} sub={`${s.cancelledBookings} cancelled, ${s.refundedBookings} refunded`} />
      </div>

      {data.notes.length > 0 && (
        <div className="bg-status-warning-bg border border-status-warning/20 rounded-xl p-4 text-sm text-status-warning">
          <div className="font-semibold mb-2">Revenue foundation notes</div>
          <ul className="list-disc ml-5 space-y-1">
            {data.notes.map(note => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink tracking-tight">Revenue by Category</h3>
          <span className="text-[11px] text-muted">Gross vs paid</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.replace(/_/g, ' ')} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip formatter={(v: number) => money(Number(v))} />
            <Bar dataKey="gross" fill="#2E78D2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" fill="#16A34A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <BreakdownTable title="By Category" rows={data.breakdowns.byCategory} />
        <BreakdownTable title="By Provider" rows={data.breakdowns.byProvider} />
        <BreakdownTable title="By Status" rows={data.breakdowns.byStatus} />
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
