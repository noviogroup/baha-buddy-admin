'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Compass, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api-client';

type GuidedDayPlan = {
  id: string;
  title: string;
  slug: string;
  area: string;
  island: string;
  status: string;
  mobility_level: string;
  budget_level: string;
  duration_min_minutes: number;
  duration_max_minutes: number;
  base_price: number;
  personalized_price: number;
  concierge_price: number | null;
  supports_live_guide: boolean;
  stop_count?: number;
  updated_at: string;
};

type GuidedDayPlansResponse = { plans: GuidedDayPlan[]; total: number };

function money(value: unknown) { const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0)); return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`; }
function titleCase(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
function StatusBadge({ status }: { status: string }) { const tone = status === 'published' ? 'bg-status-success-bg text-status-success' : status === 'draft' ? 'bg-surface text-body' : 'bg-status-warning-bg text-status-warning'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{titleCase(status)}</span>; }

export function GuidedDayModule() {
  const { data, loading, error, reload } = useApi<GuidedDayPlansResponse>('/api/day-plans');
  const [savingId, setSavingId] = useState<string | null>(null);
  const plans = data?.plans || [];
  const published = plans.filter(plan => plan.status === 'published').length;
  const drafts = plans.filter(plan => plan.status === 'draft').length;
  const liveGuide = plans.filter(plan => plan.supports_live_guide).length;

  async function setStatus(planId: string, status: string) {
    setSavingId(planId);
    try {
      const res = await apiFetch(`/api/day-plans/${planId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error(`${res.status}`);
      await reload();
    } finally { setSavingId(null); }
  }

  if (loading) return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-52 mb-4" /><div className="skeleton h-32 w-full" /></div>;
  if (error) return <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card"><AlertTriangle size={38} className="mx-auto text-status-warning mb-3" /><h3 className="text-lg font-display font-bold text-ink mb-2">Guided Day Plans unavailable</h3><p className="text-sm text-body">{error}</p></div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center"><Compass size={19} /></div><div><h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Guided Day Plans</h2><p className="text-sm text-body max-w-3xl leading-relaxed">Manage Nassau cruise-day plans, live guide readiness, pricing, and publish status.</p></div></div><button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue"><RefreshCw size={13} className="inline mr-1" /> Refresh</button></div></div>
      <div className="grid grid-cols-4 gap-3"><div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-bold tracking-wider uppercase mb-2">Plans</div><div className="text-2xl font-display font-bold text-ink">{data?.total || plans.length}</div><div className="text-[11px] text-muted mt-1">Total records</div></div><div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-bold tracking-wider uppercase mb-2">Published</div><div className="text-2xl font-display font-bold text-status-success">{published}</div><div className="text-[11px] text-muted mt-1">Visible to traveler apps</div></div><div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-bold tracking-wider uppercase mb-2">Draft</div><div className="text-2xl font-display font-bold text-ink">{drafts}</div><div className="text-[11px] text-muted mt-1">Needs review</div></div><div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-bold tracking-wider uppercase mb-2">Live Guide</div><div className="text-2xl font-display font-bold text-brand-blue">{liveGuide}</div><div className="text-[11px] text-muted mt-1">Enabled plans</div></div></div>
      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-hairline bg-surface/50"><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Plan</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Stops</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Duration</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Pricing</th><th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th></tr></thead><tbody>{plans.map(plan => <tr key={plan.id} className="border-b border-hairline last:border-0 hover:bg-surface/50"><td className="px-4 py-3 align-top"><Link href={`/day-plans/${plan.id}/edit`} className="font-semibold text-brand-blue hover:underline">{plan.title}</Link><div className="text-[11px] text-muted">{plan.area}, {plan.island} · {plan.slug}</div></td><td className="px-4 py-3 align-top"><StatusBadge status={plan.status} /></td><td className="px-4 py-3 align-top text-body"><div className="font-semibold text-ink">{plan.stop_count || 0}</div><Link href={`/day-plans/${plan.id}/stops`} className="text-[11px] font-bold text-brand-blue hover:underline">Manage stops</Link></td><td className="px-4 py-3 align-top text-body">{Math.round(plan.duration_min_minutes / 60)}-{Math.round(plan.duration_max_minutes / 60)} hrs<br /><span className="text-[11px] text-muted">{titleCase(plan.mobility_level)} · {titleCase(plan.budget_level)}</span></td><td className="px-4 py-3 align-top text-body">{money(plan.base_price)} basic<br /><span className="text-[11px] text-muted">{money(plan.personalized_price)} personalized</span></td><td className="px-4 py-3 align-top"><div className="flex gap-2"><button disabled={savingId === plan.id || plan.status === 'published'} onClick={() => setStatus(plan.id, 'published')} className="px-2.5 py-1 rounded-lg border border-hairline text-[11px] font-bold text-status-success disabled:opacity-40">Publish</button><button disabled={savingId === plan.id || plan.status === 'draft'} onClick={() => setStatus(plan.id, 'draft')} className="px-2.5 py-1 rounded-lg border border-hairline text-[11px] font-bold text-body disabled:opacity-40">Draft</button></div></td></tr>)}{plans.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No guided day plans found.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
