'use client';

import { AlertTriangle, BriefcaseBusiness, Handshake, MapPinned, Target } from 'lucide-react';
import { useApi } from '@/lib/use-api';

type PartnerRow = {
  id: string;
  name: string;
  partner_type: string;
  tier: string;
  status: string;
  island_name: string | null;
  linked_places: number;
  total_leads: number;
  converted_leads: number;
  campaigns: number;
  campaign_revenue: number;
};

type PartnersResponse = {
  summary: Record<string, number>;
  byTier: { label: string; count: number }[];
  byType: { label: string; count: number }[];
  byIsland: { label: string; count: number }[];
  partners: PartnerRow[];
};

function money(value: number) {
  return `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active'
    ? 'bg-status-success-bg text-status-success'
    : status === 'prospect'
      ? 'bg-brand-blue-light text-brand-blue-dark'
      : 'bg-status-warning-bg text-status-warning';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}

export function PartnersModule() {
  const { data, loading, error } = useApi<PartnersResponse>('/api/partners/summary');

  if (loading) {
    return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-28 w-full" /></div>;
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Partners unavailable</h3>
        <p className="text-sm text-body">{error || 'The partners summary API did not return data.'}</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Partner Ecosystem</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Manage hotels, restaurants, tour operators, transportation providers, guides, sponsors, campaigns, referrals, and linked canonical places.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue bg-brand-blue-light px-3 py-1 rounded-full">
            <Handshake size={13} /> Foundation live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<BriefcaseBusiness size={18} />} label="Partners" value={s.total || 0} sub={`${s.active || 0} active · ${s.prospect || 0} prospects`} />
        <Stat icon={<MapPinned size={18} />} label="Linked Places" value={s.linkedPlaces || 0} sub="Connected to canonical places" />
        <Stat icon={<Target size={18} />} label="Leads" value={s.totalLeads || 0} sub={`${s.convertedLeads || 0} converted`} />
        <Stat icon={<Handshake size={18} />} label="Campaign Revenue" value={money(s.campaignRevenue || 0)} sub={`${s.campaigns || 0} campaigns`} />
      </div>

      {data.partners.length === 0 && (
        <div className="bg-brand-gold-light border border-brand-gold/30 rounded-xl p-4 text-sm text-status-warning">
          <div className="font-semibold mb-1">Partner tables are ready</div>
          <p>No partner records exist yet. The next step is partner onboarding/import, then linking partners to canonical places.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline">
          <h3 className="text-sm font-semibold text-ink tracking-tight">Partner roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Partner</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Type</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Tier</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Places</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Leads</th>
              </tr>
            </thead>
            <tbody>
              {data.partners.map(partner => (
                <tr key={partner.id} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3"><div className="font-semibold text-ink">{partner.name}</div><div className="text-[11px] text-muted">{partner.island_name || 'No island assigned'}</div></td>
                  <td className="px-4 py-3 capitalize text-body">{partner.partner_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 capitalize text-body">{partner.tier}</td>
                  <td className="px-4 py-3"><StatusBadge status={partner.status} /></td>
                  <td className="px-4 py-3 text-body">{partner.linked_places || 0}</td>
                  <td className="px-4 py-3 text-body">{partner.total_leads || 0}</td>
                </tr>
              ))}
              {data.partners.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No partners yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
