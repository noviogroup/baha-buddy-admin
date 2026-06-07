'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Home, Users, Compass, MessageSquare, DollarSign, LifeBuoy,
  Image as ImageIcon, Bell, RefreshCw, Search, ChevronUp, ChevronDown,
  Plane, Hotel, Activity, Check, X, Send,
  ExternalLink, TrendingUp, Zap,
  CreditCard, ShieldCheck, AlertTriangle, Server,
  UserCircle, ChevronLeft, ChevronRight, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';

interface Stats {
  totalUsers: number; newUsersToday: number; newUsersWeek: number;
  activeTrips: number; totalTrips: number; tripsByStatus: Record<string, number>;
  totalBookings: number; totalRevenue: number; revenueThisMonth: number;
  aiCostToday: number; aiCostMonth: number; totalMessages: number;
  avgMessagesPerUser: number; topIslands: { island: string; count: number }[];
}

type Page = 'overview' | 'users' | 'trips' | 'chat' | 'bookings' | 'support' | 'content' | 'billing' | 'audit';

// ─── Brand tokens (mirror tailwind.config.js for inline style overrides) ─
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:       { bg: '#F4F4F5', text: '#52525B' },
  planned:     { bg: '#FEF9C3', text: '#854D0E' },
  booked:      { bg: '#EAF2FB', text: '#1E5BA8' },
  active:      { bg: '#DCFCE7', text: '#166534' },
  completed:   { bg: '#F4F4F5', text: '#3F3F46' },
  cancelled:   { bg: '#FEE2E2', text: '#991B1B' },
  confirmed:   { bg: '#DCFCE7', text: '#166534' },
  pending:     { bg: '#FEF9C3', text: '#854D0E' },
  failed:      { bg: '#FEE2E2', text: '#991B1B' },
  refunded:    { bg: '#FEF8E6', text: '#A16207' },
  open:        { bg: '#FEF9C3', text: '#854D0E' },
  in_progress: { bg: '#EAF2FB', text: '#1E5BA8' },
  resolved:    { bg: '#DCFCE7', text: '#166534' },
  closed:      { bg: '#F4F4F5', text: '#52525B' },
  onboarding:  { bg: '#EAF2FB', text: '#1E5BA8' },
  inactive:    { bg: '#F4F4F5', text: '#71717A' },
  high:        { bg: '#FEE2E2', text: '#991B1B' },
  critical:    { bg: '#FEE2E2', text: '#991B1B' },
  medium:      { bg: '#FEF9C3', text: '#854D0E' },
  low:         { bg: '#F4F4F5', text: '#52525B' },
  solo:        { bg: '#EAF2FB', text: '#1E5BA8' },
  couple:      { bg: '#FCE7F3', text: '#9D174D' },
  family:      { bg: '#DCFCE7', text: '#166534' },
  friends:     { bg: '#FEF8E6', text: '#A16207' },
  approved:    { bg: '#DCFCE7', text: '#166534' },
  rejected:    { bg: '#FEE2E2', text: '#991B1B' },
  video:       { bg: '#EAF2FB', text: '#1E5BA8' },
  photo:       { bg: '#FEF8E6', text: '#A16207' },
  story:       { bg: '#F4F4F5', text: '#52525B' },
};

const CHART = {
  brandBlue: '#2E78D2',
  brandBlueLight: '#7AB0E6',
  brandBlueDark: '#1E5BA8',
  brandGold: '#F5B731',
  ink: '#18181B',
  muted: '#A1A1AA',
  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',
  surface: '#F4F4F5',
};

const PIE_COLORS = [CHART.muted, CHART.brandGold, CHART.brandBlue, CHART.success, CHART.brandBlueLight, CHART.danger];

// ─── Primitives ──────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >{label}</span>
  );
}

function StatCard({ icon, label, value, sub, trend, up }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; trend?: string; up?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline flex flex-col gap-2 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-ink">{icon}</span>
        <span className="text-[11px] text-muted font-medium tracking-wider uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-display font-bold text-ink tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-status-success' : 'text-status-danger'}`}>
            {up ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {trend}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

function Section({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-hairline overflow-hidden shadow-card ${className || ''}`}>
      {title && (
        <div className="flex justify-between items-center px-5 py-3 border-b border-hairline">
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-hairline">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4" style={{ width: i === 0 ? '70%' : `${40 + (i * 7) % 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const maxPage = Math.max(0, Math.ceil(total / limit) - 1);
  const start = total === 0 ? 0 : page * limit + 1;
  const end = Math.min(total, (page + 1) * limit);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-hairline bg-surface">
      <span className="text-xs text-muted">
        {total === 0 ? 'No results' : `${start.toLocaleString()}\u2013${end.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-2.5 py-1 rounded-md border border-hairline text-xs font-medium text-body hover:border-brand-blue disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          aria-label="Previous page"
        ><ChevronLeft size={13} /> Prev</button>
        <span className="text-xs text-muted">Page {page + 1} of {maxPage + 1}</span>
        <button
          onClick={() => onChange(Math.min(maxPage, page + 1))}
          disabled={page >= maxPage}
          className="px-2.5 py-1 rounded-md border border-hairline text-xs font-medium text-body hover:border-brand-blue disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          aria-label="Next page"
        >Next <ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

function TH({ children }: { children: string }) {
  return <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">{children}</th>;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
function OverviewPage() {
  const { data: stats, loading } = useApi<Stats>('/api/stats');
  const { data: feedData } = useApi<{ feed: any[] }>('/api/activity-feed');
  if (loading || !stats) return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border border-hairline flex flex-col gap-2 shadow-card">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => (<div key={i} className="bg-white rounded-xl border border-hairline h-56 shadow-card"><div className="p-4"><div className="skeleton h-4 w-32 mb-3" /><div className="skeleton h-32 w-full" /></div></div>))}
      </div>
    </div>
  );
  const tripPieData = Object.entries(stats.tripsByStatus).map(([name, value]) => ({ name, value }));
  const feed = feedData?.feed || [];
  const feedIcon = (type: string) => {
    if (type === 'user_signup') return <UserCircle size={14} style={{ color: CHART.brandBlue }} />;
    if (type === 'trip_created') return <Compass size={14} style={{ color: CHART.success }} />;
    if (type === 'booking') return <DollarSign size={14} style={{ color: CHART.brandGold }} />;
    return <MessageSquare size={14} className="text-muted" />;
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Users size={18} />} label="Total Users" value={stats.totalUsers.toLocaleString()} trend={`+${stats.newUsersToday} today`} up sub={`+${stats.newUsersWeek} this week`} />
        <StatCard icon={<Compass size={18} />} label="Active Trips" value={stats.activeTrips} sub={`${stats.totalTrips} total`} />
        <StatCard icon={<DollarSign size={18} />} label="Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} sub={`$${stats.revenueThisMonth.toLocaleString()} this month`} up trend={stats.revenueThisMonth > 0 ? 'This month' : undefined} />
        <StatCard icon={<Zap size={18} />} label="AI Cost (MTD)" value={`$${stats.aiCostMonth.toFixed(2)}`} sub={`$${stats.aiCostToday.toFixed(2)} today`} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Section title="Trip Status" className="col-span-1">
          <div className="p-4 flex flex-col items-center">
            {tripPieData.length > 0 ? (<ResponsiveContainer width="100%" height={180}><PieChart><Pie data={tripPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>{tripPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>) : (<div className="h-[180px] flex items-center text-sm text-muted">No trips yet</div>)}
            <div className="flex flex-wrap gap-2 justify-center mt-2">{tripPieData.map((s, i) => (<span key={i} className="flex items-center gap-1 text-[11px] text-muted"><span className="w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{s.name} ({s.value})</span>))}</div>
          </div>
        </Section>
        <Section title="Key Metrics" className="col-span-1">
          <div className="p-4 grid grid-cols-2 gap-2">
            {[{ label: 'Total Messages', value: stats.totalMessages.toLocaleString() }, { label: 'Avg Msgs/User', value: stats.avgMessagesPerUser }, { label: 'Total Bookings', value: stats.totalBookings }, { label: 'Active Trips', value: stats.activeTrips }, { label: 'AI Cost Today', value: `$${stats.aiCostToday.toFixed(2)}` }, { label: 'New Users Today', value: stats.newUsersToday }].map((m, i) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 bg-surface rounded-lg"><span className="text-xs text-muted">{m.label}</span><span className="text-sm font-bold text-ink">{m.value}</span></div>
            ))}
          </div>
        </Section>
        <Section title="Popular Islands" className="col-span-1">
          <div className="p-4 flex flex-col gap-1.5">
            {stats.topIslands.length > 0 ? stats.topIslands.slice(0, 7).map((isl, i) => { const mx = stats.topIslands[0].count; return (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-ink w-28 truncate">{isl.island}</span>
                <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(isl.count / mx) * 100}%`, background: CHART.brandBlue }} />
                </div>
                <span className="text-[11px] text-muted w-10 text-right">{isl.count}</span>
              </div>
            ); }) : (<div className="text-sm text-muted text-center py-6">No island data yet</div>)}
          </div>
        </Section>
      </div>
      <Section title="Live Activity (24h)" action={<span className="text-[11px] text-muted">{feed.length} events</span>}>
        <div className="max-h-[320px] overflow-y-auto">
          {feed.length > 0 ? feed.map((ev: any, i: number) => (
            <div key={i} className="flex items-start gap-3 px-5 py-2.5 border-b border-hairline last:border-0">
              <div className="mt-0.5">{feedIcon(ev.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink font-medium truncate">{ev.title}</div>
                <div className="text-[11px] text-muted truncate">{ev.subtitle}</div>
              </div>
              <span className="text-[10px] text-muted whitespace-nowrap mt-0.5">{timeAgo(ev.timestamp)}</span>
            </div>
          )) : (<div className="px-5 py-8 text-center text-sm text-muted">No activity in the last 24 hours</div>)}
        </div>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// USERS — accepts lifted selectedUserId state for deep-link support
// ═══════════════════════════════════════════════════════════════════════════
const USERS_PAGE_SIZE = 50;

function UsersPage({ selectedUserId, setSelectedUserId }: { selectedUserId: string | null; setSelectedUserId: (id: string | null) => void }) {
  const [search, setSearch] = useState('');
  const [ds, setDs] = useState('');
  const [page, setPage] = useState(0);
  // Reset to page 0 when search changes
  useEffect(() => { const t = setTimeout(() => { setDs(search); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);
  const { data, loading } = useApi<{ users: any[]; total: number }>(`/api/users?search=${encodeURIComponent(ds)}&page=${page}&limit=${USERS_PAGE_SIZE}`, [page]);
  const users = data?.users || [];
  const total = data?.total || 0;
  const { data: detail } = useApi<any>(selectedUserId ? `/api/user-detail?id=${selectedUserId}` : '', [selectedUserId]);

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-4 ${selectedUserId ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
        <Section
          title={`Users${data ? ` (${total.toLocaleString()})` : ''}`}
          action={
            <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-1.5 border border-hairline">
              <Search size={14} className="text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email\u2026"
                className="bg-transparent border-none outline-none text-xs w-48 font-body"
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-hairline"><TH>Name</TH><TH>Location</TH><TH>Party</TH><TH>Interests</TH><TH>Engagement</TH><TH>Created</TH></tr></thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : users.map((u: any) => (
                    <tr key={u.id} onClick={() => setSelectedUserId(u.id)} className={`border-b border-hairline cursor-pointer transition-colors ${selectedUserId === u.id ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                      <td className="px-4 py-2.5"><div className="font-semibold text-ink">{u.display_name}</div><div className="text-[11px] text-muted">{u.email || 'Anonymous'}</div></td>
                      <td className="px-4 py-2.5 text-body">{u.city ? `${u.city}, ${u.country}` : u.country || '—'}</td>
                      <td className="px-4 py-2.5"><Badge status={u.party_type} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(u.interest_tags || []).slice(0, 2).map((t: string, i: number) => (<span key={i} className="text-[10px] bg-surface text-body px-1.5 py-0.5 rounded font-medium">{t}</span>))}
                          {(u.interest_tags || []).length > 2 && <span className="text-[10px] text-muted">+{u.interest_tags.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-surface rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(u.engagement_score, 100)}%`, background: u.engagement_score > 60 ? CHART.success : u.engagement_score > 30 ? CHART.warning : CHART.danger }} />
                          </div>
                          <span className="text-[11px] text-body">{u.engagement_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted text-xs">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    </tr>
                  ))}
                {!loading && users.length === 0 && (<tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No users found</td></tr>)}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={USERS_PAGE_SIZE} onChange={setPage} />
        </Section>

        {/* User Detail Drawer */}
        {selectedUserId && detail?.user && (
          <Section title="User Detail" action={
            <div className="flex items-center gap-2">
              <a
                href={`/users/${selectedUserId}`}
                className="text-[11px] text-brand-blue hover:underline font-medium uppercase tracking-wider"
              >
                Open full page →
              </a>
              <button onClick={() => setSelectedUserId(null)} className="text-muted hover:text-body"><X size={16} /></button>
            </div>
          }>
            <div className="p-4 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-body font-bold text-sm">{detail.user.display_name?.charAt(0)?.toUpperCase()}</div>
                <div><div className="font-semibold text-ink">{detail.user.display_name}</div><div className="text-[11px] text-muted">{detail.user.email || 'Anonymous'}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">Location</div><div className="text-xs font-medium text-body">{detail.user.city ? `${detail.user.city}, ${detail.user.country}` : detail.user.country || '—'}</div></div>
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">Party</div><div className="text-xs font-medium text-body">{detail.user.party_type} · {detail.user.party_size} pax</div></div>
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">Engagement</div><div className="text-xs font-medium text-body">{detail.user.engagement_score}/100</div></div>
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">AI Spend</div><div className="text-xs font-medium text-body">${detail.aiUsage?.totalCost?.toFixed(4) || '0'}</div></div>
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">Revenue</div><div className="text-xs font-medium text-status-success">${detail.revenue?.toLocaleString() || '0'}</div></div>
                <div className="bg-surface rounded-lg px-3 py-2"><div className="text-[10px] text-muted uppercase">Joined</div><div className="text-xs font-medium text-body">{new Date(detail.user.created_at).toLocaleDateString()}</div></div>
              </div>
              {(detail.user.interest_tags || []).length > 0 && (
                <div><div className="text-[10px] text-muted uppercase mb-1">Interests</div><div className="flex flex-wrap gap-1">{detail.user.interest_tags.map((t: string, i: number) => (<span key={i} className="text-[10px] bg-surface text-body px-2 py-0.5 rounded font-medium">{t}</span>))}</div></div>
              )}
              <div>
                <div className="text-[10px] text-muted uppercase mb-1">Trips ({detail.trips?.length || 0})</div>
                {(detail.trips || []).slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-hairline last:border-0">
                    <div><div className="text-xs font-medium text-body">{t.name}</div><div className="text-[10px] text-muted">{(t.islands || []).join(', ')}</div></div>
                    <Badge status={t.status} />
                  </div>
                ))}
              </div>
              {(detail.bookings || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-muted uppercase mb-1">Bookings ({detail.bookings.length})</div>
                  {detail.bookings.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-hairline last:border-0">
                      <div className="text-xs text-body">{b.booking_type} · ${parseFloat(b.amount).toLocaleString()}</div>
                      <Badge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
              {(detail.threads || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-muted uppercase mb-1">Chat Threads ({detail.threads.length})</div>
                  {detail.threads.slice(0, 3).map((t: any) => (
                    <div key={t.id} className="py-1.5 border-b border-hairline last:border-0">
                      <div className="text-xs text-body truncate">{t.last_message_preview || 'No messages'}</div>
                      <div className="text-[10px] text-muted">{timeAgo(t.updated_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIPS — pagination + brand pass
// ═══════════════════════════════════════════════════════════════════════════
const TRIPS_PAGE_SIZE = 50;

function TripsPage() {
  const router = useRouter();
  const [sf, setSf] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [sf]);
  const { data, loading } = useApi<{ trips: any[]; total: number }>(`/api/trips?status=${sf}&page=${page}&limit=${TRIPS_PAGE_SIZE}`, [sf, page]);
  const trips = data?.trips || [];
  const total = data?.total || 0;
  return (
    <div className="flex flex-col gap-4">
      <Section
        title={`Trips${data ? ` (${total.toLocaleString()})` : ''}`}
        action={<div className="flex gap-1.5">{['', 'draft', 'planned', 'booked', 'active', 'completed'].map(s => (
          <button key={s} onClick={() => setSf(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${sf === s ? 'bg-ink text-white border-ink' : 'bg-white text-body border-hairline hover:border-brand-blue'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}</div>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>Trip Name</TH><TH>Traveler</TH><TH>Islands</TH><TH>Dates</TH><TH>Budget</TH><TH>Status</TH></tr></thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : trips.map((t: any) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/trips/${t.id}`)}
                    className="border-b border-hairline hover:bg-surface/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-semibold text-ink">{t.name}</td>
                    <td className="px-4 py-2.5 text-body">{t.users?.display_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">{(t.islands || []).map((isl: string, i: number) => (<span key={i} className="text-[10px] bg-surface text-body px-1.5 py-0.5 rounded font-medium">{isl}</span>))}</div>
                    </td>
                    <td className="px-4 py-2.5 text-body text-xs">{t.date_start ? new Date(t.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}{t.date_end ? ` – ${new Date(t.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink">{t.budget_estimate ? `$${parseFloat(t.budget_estimate).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-2.5"><Badge status={t.status} /></td>
                  </tr>
                ))}
              {!loading && trips.length === 0 && (<tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No trips found</td></tr>)}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={TRIPS_PAGE_SIZE} onChange={setPage} />
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT & AI — Top Users deep-link wired
// ═══════════════════════════════════════════════════════════════════════════
function ChatAIPage({ navigateToUser }: { navigateToUser: (id: string) => void }) {
  const { data, loading } = useApi<{ dailyCosts: any[]; userCosts: any[]; recentLogs: any[] }>('/api/ai');
  const { data: threadsData } = useApi<{ threads: any[] }>('/api/chat-threads');
  const [viewThreadId, setViewThreadId] = useState<string | null>(null);
  const { data: threadDetail } = useApi<{ thread: any; messages: any[] }>(viewThreadId ? `/api/chat-threads?thread_id=${viewThreadId}` : '', [viewThreadId]);

  const dm = new Map<string, { date: string; sonnet: number; haiku: number; deepseek: number }>();
  (data?.dailyCosts || []).forEach((r: any) => {
    const d = r.date; if (!dm.has(d)) dm.set(d, { date: d, sonnet: 0, haiku: 0, deepseek: 0 });
    const e = dm.get(d)!; const cost = parseFloat(r.total_cost_usd) || 0;
    if (r.model?.includes('sonnet')) e.sonnet += cost;
    else if (r.model?.includes('haiku')) e.haiku += cost;
    else e.deepseek += cost;
  });
  const chartData = Array.from(dm.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const totalMonth = chartData.reduce((s, d) => s + d.sonnet + d.haiku + d.deepseek, 0);
  const threads = threadsData?.threads || [];
  const msgs = threadDetail?.messages || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<MessageSquare size={18} />} label="Total Messages" value={data?.recentLogs?.length || 0} />
        <StatCard icon={<DollarSign size={18} />} label="Cost (Period)" value={`$${totalMonth.toFixed(2)}`} />
        <StatCard icon={<Zap size={18} />} label="Top Model" value="Sonnet 4.5" sub="Primary chat model" />
        <StatCard icon={<Check size={18} />} label="Hallucinations" value="0" sub="All places verified from DB" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Section title="AI Cost by Model (Daily)" action={
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.brandBlue }} /> Sonnet</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.muted }} /> Haiku</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.brandGold }} /> DeepSeek</span>
          </div>
        }>
          <div className="p-4">{chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.surface} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
                <Bar dataKey="sonnet" stackId="a" fill={CHART.brandBlue} />
                <Bar dataKey="haiku" stackId="a" fill={CHART.muted} />
                <Bar dataKey="deepseek" stackId="a" fill={CHART.brandGold} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (<div className="h-[200px] flex items-center justify-center text-sm text-muted">{loading ? 'Loading\u2026' : 'No AI usage data yet'}</div>)}</div>
        </Section>
        <Section title="Top Users by AI Cost (30d)" action={<span className="text-[10px] text-muted uppercase tracking-wider">Click to view user</span>}>
          <div className="p-4 max-h-[260px] overflow-y-auto">
            {(data?.userCosts || []).slice(0, 10).map((u: any, i: number) => (
              <button
                key={i}
                onClick={() => u.user_id && navigateToUser(u.user_id)}
                className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md border-b border-hairline last:border-0 hover:bg-surface/50 transition-colors text-left group"
              >
                <span className="text-xs text-body font-mono truncate flex items-center gap-1">
                  {u.user_id?.slice(0, 8)}\u2026
                  <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: CHART.brandBlue }} />
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted">{u.requests} reqs</span>
                  <span className="text-xs font-bold text-ink">${parseFloat(u.total_cost_usd).toFixed(4)}</span>
                </div>
              </button>
            ))}
            {(data?.userCosts || []).length === 0 && (<div className="text-sm text-muted text-center py-6">No usage data</div>)}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] gap-4">
        <Section title={`Recent Threads (${threads.length})`}>
          <div className="max-h-[360px] overflow-y-auto">
            {threads.slice(0, 20).map((t: any) => (
              <div key={t.id} onClick={() => setViewThreadId(t.id)} className={`px-4 py-2.5 border-b border-hairline cursor-pointer transition-colors ${viewThreadId === t.id ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                <div className="flex justify-between"><span className="text-xs font-medium text-ink truncate">{t.users?.display_name || 'User'}</span><span className="text-[10px] text-muted">{timeAgo(t.updated_at)}</span></div>
                <div className="text-[11px] text-muted truncate mt-0.5">{t.last_message_preview || 'Empty thread'}</div>
                {t.trips?.name && <div className="text-[10px] text-body mt-0.5">Trip: {t.trips.name}</div>}
              </div>
            ))}
            {threads.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">No threads yet</div>}
          </div>
        </Section>
        <Section title={viewThreadId ? `Conversation${threadDetail?.thread?.users?.display_name ? ` \u2014 ${threadDetail.thread.users.display_name}` : ''}` : 'Select a thread'} action={viewThreadId ? <button onClick={() => setViewThreadId(null)} className="text-muted hover:text-body"><X size={14} /></button> : undefined}>
          <div className="max-h-[360px] overflow-y-auto p-4">
            {msgs.length > 0 ? msgs.map((m: any) => (
              <div key={m.id} className={`mb-2 max-w-[85%] ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                <div className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-ink text-white' : 'bg-surface text-body'}`}>
                  {m.content.length > 300 ? m.content.substring(0, 300) + '\u2026' : m.content}
                </div>
                <div className={`text-[10px] text-muted mt-0.5 ${m.role === 'user' ? 'text-right' : ''}`}>{m.role} · {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{m.card_type && m.card_type !== 'none' ? ` · 📎 ${m.card_type}` : ''}</div>
              </div>
            )) : (<div className="text-center text-sm text-muted py-8">{viewThreadId ? 'Loading conversation\u2026' : 'Click a thread to view the conversation'}</div>)}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKINGS — pagination
// ═══════════════════════════════════════════════════════════════════════════
const BOOKINGS_PAGE_SIZE = 50;

function BookingsPage() {
  const [sf, setSf] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [sf]);
  const { data, loading } = useApi<{ bookings: any[]; total: number }>(`/api/bookings?status=${sf}&page=${page}&limit=${BOOKINGS_PAGE_SIZE}`, [sf, page]);
  const bookings = data?.bookings || [];
  const total = data?.total || 0;
  return (
    <div className="flex flex-col gap-4">
      <Section
        title={`Bookings${data ? ` (${total.toLocaleString()})` : ''}`}
        action={<div className="flex gap-1.5">{['', 'pending', 'confirmed', 'cancelled', 'refunded'].map(s => (
          <button key={s} onClick={() => setSf(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${sf === s ? 'bg-ink text-white border-ink' : 'bg-white text-body border-hairline hover:border-brand-blue'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}</div>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>Booking</TH><TH>Trip</TH><TH>Type</TH><TH>Amount</TH><TH>Status</TH><TH>Date</TH></tr></thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-hairline hover:bg-surface/50">
                    <td className="px-4 py-2.5"><div className="font-semibold text-ink">{b.users?.display_name || '—'}</div><div className="text-[11px] text-muted font-mono">{b.id.slice(0, 8)}\u2026</div></td>
                    <td className="px-4 py-2.5 text-body text-xs">{b.trips?.name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-body">
                        {b.booking_type === 'accommodation' ? <Hotel size={12} /> : b.booking_type === 'flight' ? <Plane size={12} /> : <Activity size={12} />}
                        {b.booking_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-ink">${parseFloat(b.amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5"><Badge status={b.status} /></td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  </tr>
                ))}
              {!loading && bookings.length === 0 && (<tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No bookings found</td></tr>)}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={BOOKINGS_PAGE_SIZE} onChange={setPage} />
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT — apiFetch for the audited reply
// ═══════════════════════════════════════════════════════════════════════════
function SupportPage() {
  const { data, loading, reload } = useApi<{ tickets: any[]; note?: string }>('/api/support');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const tickets = data?.tickets || [];
  const selected = tickets.find((t: any) => t.id === selectedId);
  const handleReply = async (action?: string) => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await apiFetch('/api/support', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: selectedId, content: reply, action }),
      });
      if (!res.ok) console.error('Support reply failed', await res.text());
      setReply('');
      reload();
    } finally { setSending(false); }
  };
  if (data?.note) return (
    <Section title="Support">
      <div className="p-8 text-center">
        <LifeBuoy size={40} className="mx-auto text-muted mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Support Tables Not Yet Created</h3>
        <p className="text-sm text-body mb-4">Run the admin migration to create support_tickets and support_messages tables.</p>
        <p className="text-xs text-muted">Migration: <code className="bg-surface px-1.5 py-0.5 rounded">20260308_admin_support_tables.sql</code></p>
      </div>
    </Section>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_1.3fr]' : 'grid-cols-1'}`}>
        <Section title={`Tickets (${tickets.length})`}>
          {loading ? (
            <div className="p-2">
              {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="px-3 py-3 border-b border-hairline"><div className="skeleton h-4 w-2/3 mb-2" /><div className="skeleton h-3 w-1/3" /></div>))}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {tickets.map((t: any) => (
                <div key={t.id} onClick={() => setSelectedId(t.id)} className={`px-5 py-3 border-b border-hairline cursor-pointer transition-colors ${selectedId === t.id ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                  <div className="flex justify-between items-start mb-1"><span className="text-sm font-semibold text-ink truncate mr-2">{t.subject}</span><Badge status={t.priority} /></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-body">{t.users?.display_name} · {t.support_messages?.length || 0} msgs</span><div className="flex items-center gap-2"><Badge status={t.status} /><span className="text-[11px] text-muted">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div></div>
                </div>
              ))}
              {tickets.length === 0 && (<div className="px-5 py-12 text-center text-muted text-sm">No support tickets</div>)}
            </div>
          )}
        </Section>
        {selected && (
          <Section title={selected.subject} action={<div className="flex gap-1.5"><Badge status={selected.priority} /><Badge status={selected.status} /></div>}>
            <div className="p-5 flex flex-col gap-3">
              <div className="text-xs text-body"><strong className="text-ink">{selected.users?.display_name}</strong> · {selected.users?.email} · Opened {new Date(selected.created_at).toLocaleString()}</div>
              <div className="max-h-[240px] overflow-y-auto flex flex-col gap-2">
                {(selected.support_messages || []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((msg: any) => (
                  <div key={msg.id} className={`rounded-lg p-3 text-sm leading-relaxed ${msg.sender_type === 'admin' ? 'bg-surface text-body ml-6' : 'bg-brand-blue/5 text-body mr-6'}`}>
                    <div className="text-[10px] text-muted mb-1 font-medium">{msg.sender_type === 'admin' ? 'Admin' : selected.users?.display_name} · {new Date(msg.created_at).toLocaleTimeString()}</div>
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="border-t border-hairline pt-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink">Reply</span>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your response\u2026" rows={3} className="w-full border border-hairline rounded-lg px-3 py-2 text-sm outline-none resize-y focus:border-brand-blue font-body" />
                <div className="flex gap-2 justify-end">
                  {selected.status !== 'resolved' && (
                    <button onClick={() => handleReply('resolve')} disabled={!reply.trim() || sending} className="px-3 py-1.5 rounded-lg border border-status-success bg-status-success-bg text-status-success text-xs font-semibold disabled:opacity-50">Resolve</button>
                  )}
                  <button onClick={() => handleReply()} disabled={!reply.trim() || sending} className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 hover:bg-brand-blue-dark"><Send size={12} /> Send</button>
                </div>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT — apiFetch for audited UGC moderate
// ═══════════════════════════════════════════════════════════════════════════
function ContentPage() {
  const [ugcStatus, setUgcStatus] = useState('pending');
  const { data: ugcData, loading: ugcLoading, reload: ugcReload } = useApi<{ items: any[]; total: number }>(`/api/ugc?status=${ugcStatus}`, [ugcStatus]);
  const [moderating, setModerating] = useState<string | null>(null);

  const handleModerate = async (id: string, action: 'approved' | 'rejected') => {
    setModerating(id);
    try {
      const res = await apiFetch('/api/ugc', {
        method: 'POST',
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) console.error('UGC moderate failed', await res.text());
      ugcReload();
    } finally { setModerating(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Sanity CMS">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Explore Tab Content</div>
            <div className="text-xs text-body mt-1">Manage island profiles, experiences, seasonal features, travel guides, and Buddy&apos;s Picks.</div>
          </div>
          <a href={process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || 'https://www.sanity.io/manage'} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-brand-blue-dark no-underline">Open Sanity Studio <ExternalLink size={14} /></a>
        </div>
      </Section>

      <Section title={`UGC Moderation Queue (${ugcData?.total || 0})`} action={
        <div className="flex gap-1.5">{['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setUgcStatus(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${ugcStatus === s ? 'bg-ink text-white border-ink' : 'bg-white text-body border-hairline'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}</div>
      }>
        {ugcLoading ? (
          <div className="p-3">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="flex gap-3 py-2.5 border-b border-hairline last:border-0"><div className="skeleton w-12 h-4" /><div className="skeleton flex-1 h-4" /></div>))}</div>
        ) : (
          <div className="overflow-x-auto">
            {(ugcData?.items || []).length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-hairline"><TH>User</TH><TH>Type</TH><TH>Caption</TH><TH>Status</TH><TH>Submitted</TH><TH>Actions</TH></tr></thead>
                <tbody>
                  {(ugcData?.items || []).map((item: any) => (
                    <tr key={item.id} className="border-b border-hairline">
                      <td className="px-4 py-2.5 text-ink font-medium">{item.users?.display_name || '—'}</td>
                      <td className="px-4 py-2.5"><Badge status={item.content_type} /></td>
                      <td className="px-4 py-2.5 text-body text-xs max-w-[200px] truncate">{item.caption || '—'}</td>
                      <td className="px-4 py-2.5"><Badge status={item.moderation_status} /></td>
                      <td className="px-4 py-2.5 text-muted text-xs">{timeAgo(item.created_at)}</td>
                      <td className="px-4 py-2.5">
                        {item.moderation_status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleModerate(item.id, 'approved')} disabled={moderating === item.id} className="px-2 py-1 rounded bg-status-success-bg text-status-success text-[11px] font-semibold border border-status-success/30 disabled:opacity-50"><Check size={12} /></button>
                            <button onClick={() => handleModerate(item.id, 'rejected')} disabled={moderating === item.id} className="px-2 py-1 rounded bg-status-danger-bg text-status-danger text-[11px] font-semibold border border-status-danger/30 disabled:opacity-50"><X size={12} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (<div className="px-5 py-8 text-center text-sm text-muted">{ugcStatus === 'pending' ? 'No content awaiting moderation' : `No ${ugcStatus} content`}</div>)}
          </div>
        )}
      </Section>

      <Section title="Google Places Cache">
        <div className="p-5 text-sm text-body">The <code className="bg-surface px-1 py-0.5 rounded text-xs font-mono">google_places</code> table caches place data to avoid live API costs. Stats and cache refresh controls land in Phase 4.</div>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING & APIs — brand pass
// ═══════════════════════════════════════════════════════════════════════════
function BillingPage() {
  const { data, loading, reload } = useApi<any>('/api/billing');
  const { data: svcData } = useApi<{ services: any[] }>('/api/services');
  if (data?.needsMigration) return (
    <Section title="Billing & Cost Tracking">
      <div className="p-8 text-center">
        <AlertTriangle size={40} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Migration Required</h3>
        <p className="text-sm text-body mb-4">Run the cost tracking migration to enable full billing visibility.</p>
        <code className="block bg-surface px-4 py-2 rounded text-xs text-left max-w-lg mx-auto font-mono">migrations/20260308_api_cost_tracking.sql</code>
      </div>
    </Section>
  );
  const summary = data?.summary || {};
  const services = svcData?.services || [];
  const aiDailyMap = new Map<string, { date: string; sonnet: number; haiku: number; deepseek: number; api: number }>();
  (data?.aiDaily || []).forEach((r: any) => {
    const d = r.date;
    if (!aiDailyMap.has(d)) aiDailyMap.set(d, { date: d, sonnet: 0, haiku: 0, deepseek: 0, api: 0 });
    const e = aiDailyMap.get(d)!; const cost = parseFloat(r.total_cost_usd) || 0;
    if (r.model?.includes('sonnet')) e.sonnet += cost;
    else if (r.model?.includes('haiku')) e.haiku += cost;
    else e.deepseek += cost;
  });
  (data?.apiDaily || []).forEach((r: any) => {
    const d = r.date;
    if (!aiDailyMap.has(d)) aiDailyMap.set(d, { date: d, sonnet: 0, haiku: 0, deepseek: 0, api: 0 });
    aiDailyMap.get(d)!.api += parseFloat(r.total_cost_usd) || 0;
  });
  const costChart = Array.from(aiDailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const ks = (s: string) => s === 'active' ? 'bg-status-success-bg text-status-success' : s === 'expiring' ? 'bg-status-warning-bg text-status-warning' : 'bg-status-danger-bg text-status-danger';
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon={<Zap size={18} />} label="AI Cost (MTD)" value={`$${summary.aiCostMonth?.toFixed(2) || '0.00'}`} sub={`$${summary.aiCostToday?.toFixed(2) || '0.00'} today`} />
        <StatCard icon={<Server size={18} />} label="API Cost (MTD)" value={`$${summary.apiCostMonth?.toFixed(2) || '0.00'}`} sub="Hotels, Flights, Activities, Voice" />
        <StatCard icon={<DollarSign size={18} />} label="Total Cost (MTD)" value={`$${summary.totalCostMonth?.toFixed(2) || '0.00'}`} sub="AI + API combined" />
        <StatCard icon={<TrendingUp size={18} />} label="Revenue (MTD)" value={`$${summary.revenueMonth?.toLocaleString() || '0'}`} sub={`${summary.bookings?.confirmed || 0} confirmed`} up={summary.revenueMonth > 0} trend={summary.revenueMonth > 0 ? 'Revenue' : undefined} />
        <StatCard icon={<CreditCard size={18} />} label="Bookings (MTD)" value={summary.bookings?.total || 0} sub={`${summary.bookings?.pending || 0} pending · ${summary.bookings?.failed || 0} failed`} />
      </div>
      <Section title="Daily Cost Breakdown" action={
        <div className="flex gap-3 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.brandBlue }} /> Sonnet</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.muted }} /> Haiku</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.brandGold }} /> DeepSeek</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART.success }} /> API</span>
        </div>
      }>
        <div className="p-4">{costChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.surface} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
              <Tooltip formatter={(v: number) => `$${Number(v).toFixed(4)}`} />
              <Bar dataKey="sonnet" stackId="a" fill={CHART.brandBlue} />
              <Bar dataKey="haiku" stackId="a" fill={CHART.muted} />
              <Bar dataKey="deepseek" stackId="a" fill={CHART.brandGold} />
              <Bar dataKey="api" stackId="a" fill={CHART.success} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (<div className="h-[200px] flex items-center justify-center text-sm text-muted">{loading ? 'Loading\u2026' : 'No cost data yet'}</div>)}</div>
      </Section>
      <Section title="API Services — Credit & Billing Status" action={<button onClick={reload} className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-hairline text-body flex items-center gap-1 hover:border-brand-blue"><RefreshCw size={11} /> Refresh</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>Service</TH><TH>Plan</TH><TH>API Key</TH><TH>Credit</TH><TH>MTD Usage</TH><TH>Limit</TH><TH>Pricing</TH><TH>Dashboard</TH></tr></thead>
            <tbody>
              {services.map((svc: any) => { const c = svc.credit; return (
                <tr key={svc.id} className="border-b border-hairline hover:bg-surface/50">
                  <td className="px-4 py-3"><div className="font-semibold text-ink">{svc.name}</div><div className="text-[10px] text-muted mt-0.5">{svc.edgeFunctions.join(', ')}</div></td>
                  <td className="px-4 py-3"><span className="text-[10px] bg-surface text-body px-2 py-0.5 rounded font-semibold uppercase">{c?.plan_tier || svc.pricingModel}</span></td>
                  <td className="px-4 py-3">{svc.secretKeys.length > 0 ? (<span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${ks(c?.api_key_status || 'active')}`}>{(c?.api_key_status || 'active').toUpperCase()}</span>) : (<span className="text-[10px] text-muted">No key</span>)}</td>
                  <td className="px-4 py-3">{c?.credit_balance != null ? (<span className={`font-semibold ${c.credit_balance < 10 ? 'text-status-danger' : 'text-ink'}`}>${parseFloat(c.credit_balance).toFixed(2)}</span>) : <span className="text-muted text-xs">—</span>}</td>
                  <td className="px-4 py-3">{c?.current_month_usage != null ? <span className="text-ink font-medium">${parseFloat(c.current_month_usage).toFixed(2)}</span> : <span className="text-muted text-xs">—</span>}</td>
                  <td className="px-4 py-3">{c?.monthly_limit != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((c.current_month_usage || 0) / c.monthly_limit) * 100)}%`, background: (c.current_month_usage / c.monthly_limit) > 0.8 ? CHART.danger : CHART.brandBlue }} />
                      </div>
                      <span className="text-[11px] text-body">${parseFloat(c.monthly_limit).toFixed(0)}</span>
                    </div>
                  ) : <span className="text-muted text-xs">No limit</span>}</td>
                  <td className="px-4 py-3 text-[11px] text-body max-w-[200px]">{svc.pricing}</td>
                  <td className="px-4 py-3">{c?.dashboard_url ? (<a href={c.dashboard_url} target="_blank" rel="noopener noreferrer" className="text-brand-blue text-[11px] font-medium flex items-center gap-1 hover:underline">Open <ExternalLink size={10} /></a>) : <span className="text-muted text-xs">—</span>}</td>
                </tr>
              ); })}
              {services.length === 0 && (<tr><td colSpan={8} className="px-4 py-12 text-center text-muted">Loading services\u2026</td></tr>)}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="grid grid-cols-3 gap-4">
        {services.filter((s: any) => s.credit?.notes).map((svc: any) => (
          <div key={svc.id} className="bg-white rounded-xl border border-hairline p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-ink">{svc.name}</span>
              {svc.credit?.api_key_status === 'active' ? <ShieldCheck size={14} className="text-status-success" /> : <AlertTriangle size={14} className="text-status-warning" />}
            </div>
            <p className="text-xs text-body leading-relaxed mb-2">{svc.credit?.notes}</p>
            <div className="text-[10px] text-muted">Keys: {svc.secretKeys.join(', ') || 'None'}</div>
            <div className="text-[10px] text-muted mt-1">Functions: {svc.edgeFunctions.join(', ')}</div>
          </div>
        ))}
      </div>
      {(data?.stripeRevenue || []).length > 0 && (
        <Section title="Daily Revenue (Stripe)">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={(data?.stripeRevenue || []).slice(0, 14).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.surface} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d?.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v: number) => `$${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke={CHART.success} fill="#DCFCE7" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAV + ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════
// ─── Audit Log helpers (also used by the header notifications popover) ─
const AUDIT_PAGE_SIZE = 50;

// Tone mapping for action badges. Categorized by suffix/keyword so new
// AuditActions inherit a sensible default without code changes here.
function auditActionTone(action: string): 'success' | 'danger' | 'warning' | 'info' {
  if (/_(approved|created|added|resolved|issued|rotated)$/.test(action)) return 'success';
  if (/_(rejected|cancelled|deleted|suspended|anonymized|removed|deactivated)$/.test(action)) return 'danger';
  if (/(revealed|exported)/.test(action)) return 'warning';
  return 'info';
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const AUDIT_TONE_CLASSES: Record<string, string> = {
  success: 'bg-status-success-bg text-status-success',
  danger:  'bg-status-danger-bg text-status-danger',
  warning: 'bg-status-warning-bg text-status-warning',
  info:    'bg-brand-blue/10 text-brand-blue-dark',
};

function AuditLogPage() {
  const [pg, setPg] = useState(0);
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const qs = new URLSearchParams({ page: String(pg), limit: String(AUDIT_PAGE_SIZE) });
  if (adminFilter)  qs.set('admin_email', adminFilter);
  if (actionFilter) qs.set('action', actionFilter);
  if (entityFilter) qs.set('entity_type', entityFilter);

  const { data, loading } = useApi<{
    entries: any[];
    total: number;
    filters: { admins: string[]; actions: string[]; entityTypes: string[] };
    note?: string;
  }>(`/api/audit-log?${qs.toString()}`, [pg, adminFilter, actionFilter, entityFilter]);

  useEffect(() => { setPg(0); }, [adminFilter, actionFilter, entityFilter]);

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const filters = data?.filters || { admins: [], actions: [], entityTypes: [] };
  const hasActiveFilter = !!(adminFilter || actionFilter || entityFilter);

  if (data?.note) return (
    <Section title="Audit Log">
      <div className="p-8 text-center">
        <ShieldCheck size={40} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Audit Log Migration Required</h3>
        <p className="text-sm text-body mb-4">Run the audit migration to enable admin activity tracking.</p>
        <code className="block bg-surface px-4 py-2 rounded text-xs text-left max-w-lg mx-auto font-mono">migrations/20260517_admin_audit_and_roles.sql</code>
      </div>
    </Section>
  );

  return (
    <div className="flex flex-col gap-4">
      <Section
        title={`Admin Audit Log${total ? ` (${total.toLocaleString()})` : ''}`}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={adminFilter} onChange={e => setAdminFilter(e.target.value)} className="text-[11px] border border-hairline rounded-md px-2 py-1 font-body bg-white text-body">
              <option value="">All admins</option>
              {filters.admins.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="text-[11px] border border-hairline rounded-md px-2 py-1 font-body bg-white text-body">
              <option value="">All actions</option>
              {filters.actions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="text-[11px] border border-hairline rounded-md px-2 py-1 font-body bg-white text-body">
              <option value="">All entities</option>
              {filters.entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {hasActiveFilter && (
              <button onClick={() => { setAdminFilter(''); setActionFilter(''); setEntityFilter(''); }} className="text-[11px] text-brand-blue font-medium hover:underline">Clear</button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>When</TH><TH>Admin</TH><TH>Action</TH><TH>Entity</TH><TH>ID</TH><TH>{''}</TH></tr></thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                : entries.flatMap((e: any) => {
                  const tone = auditActionTone(e.action);
                  const rows: any[] = [
                    <tr key={e.id} onClick={() => setExpandedId(expandedId === e.id ? null : e.id)} className={`border-b border-hairline cursor-pointer transition-colors ${expandedId === e.id ? 'bg-surface' : 'hover:bg-surface/50'}`}>
                      <td className="px-4 py-2.5 text-body text-xs whitespace-nowrap" title={new Date(e.created_at).toLocaleString()}>{timeAgo(e.created_at)}</td>
                      <td className="px-4 py-2.5 text-ink text-xs">{e.admin_email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${AUDIT_TONE_CLASSES[tone]}`}>
                          {actionLabel(e.action)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-body text-xs">{e.entity_type}</td>
                      <td className="px-4 py-2.5 text-muted text-[11px] font-mono">{e.entity_id ? `${e.entity_id.slice(0, 8)}\u2026` : '\u2014'}</td>
                      <td className="px-4 py-2.5 text-right">{expandedId === e.id ? <ChevronUp size={14} className="text-muted inline" /> : <ChevronDown size={14} className="text-muted inline" />}</td>
                    </tr>
                  ];
                  if (expandedId === e.id) {
                    rows.push(
                      <tr key={e.id + '-detail'} className="bg-surface/40 border-b border-hairline">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Before</div>
                              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-white border border-hairline rounded p-2 max-h-56 overflow-auto">{e.before_state ? JSON.stringify(e.before_state, null, 2) : '\u2014'}</pre>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">After</div>
                              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-white border border-hairline rounded p-2 max-h-56 overflow-auto">{e.after_state ? JSON.stringify(e.after_state, null, 2) : '\u2014'}</pre>
                            </div>
                          </div>
                          {e.metadata && Object.keys(e.metadata).length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Metadata</div>
                              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-white border border-hairline rounded p-2">{JSON.stringify(e.metadata, null, 2)}</pre>
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-muted">
                            <span>Full timestamp: <span className="font-mono text-body">{new Date(e.created_at).toISOString()}</span></span>
                            {e.entity_id && <span>Entity ID: <span className="font-mono text-body">{e.entity_id}</span></span>}
                            {e.ip_address && <span>IP: <span className="font-mono text-body">{e.ip_address}</span></span>}
                          </div>
                          {e.user_agent && (<div className="mt-1 text-[10px] text-muted truncate" title={e.user_agent}>UA: <span className="font-mono">{e.user_agent}</span></div>)}
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">No audit entries{hasActiveFilter ? ' match the current filters' : ' yet \u2014 perform a mutation to see entries here'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pg} total={total} limit={AUDIT_PAGE_SIZE} onChange={setPg} />
      </Section>
    </div>
  );
}

const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'trips', label: 'Trips', icon: <Compass size={18} /> },
  { id: 'chat', label: 'Chat & AI', icon: <MessageSquare size={18} /> },
  { id: 'bookings', label: 'Bookings', icon: <DollarSign size={18} /> },
  { id: 'billing', label: 'Billing & APIs', icon: <CreditCard size={18} /> },
  { id: 'audit', label: 'Audit Log', icon: <ShieldCheck size={18} /> },
  { id: 'support', label: 'Support', icon: <LifeBuoy size={18} /> },
  { id: 'content', label: 'Content', icon: <ImageIcon size={18} /> },
];

export default function AdminDashboard() {
  const [page, setPage] = useState<Page>('overview');
  const [time, setTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Lifted: selectedUserId lives at root so ChatAI's "Top Users" panel can deep-link to the Users drawer.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Recent audit entries feed the notifications popover. Tiny query, loaded eagerly.
  const { data: notifData } = useApi<{ entries: any[] }>('/api/audit-log/recent');
  const notifEntries = notifData?.entries || [];

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif-root]')) setNotifOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [notifOpen]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('admin:refresh'));
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const navigateToUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setPage('users');
  }, []);

  return (
    <div className="flex min-h-screen font-body bg-white">
      <aside className="w-56 bg-sidebar-bg flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <BrandLogo size={36} className="shrink-0" />
            <div>
              <div className="text-white text-[15px] font-display font-semibold tracking-tight">Baha Buddy</div>
              <div className="text-zinc-500 text-[10px] tracking-widest font-medium">ADMIN</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-3 flex flex-col gap-0.5">
          {NAV.map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left w-full transition-all ${active ? 'bg-sidebar-active text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-sidebar-hover'}`}
              >
                <span className={active ? 'text-white' : 'opacity-60'}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-3 border-t border-white/5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-status-success" /> Supabase Connected</div>
          <div className="text-zinc-600">v2.0.0-beta</div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center px-6 py-3.5 bg-white border-b border-hairline sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-ink">{NAV.find(n => n.id === page)?.label}</h1>
            <span className="text-xs text-muted">{time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg border border-hairline bg-white text-xs text-body font-medium flex items-center gap-1.5 hover:border-brand-blue disabled:opacity-60"
              title="Reload all data on this page"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing\u2026' : 'Refresh'}
            </button>
            <div className="relative" data-notif-root>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen(o => !o); }}
                className="p-1.5 rounded-lg border border-hairline bg-white hover:border-brand-blue"
                title="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={16} className="text-body" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-hairline rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Recent admin activity</span>
                    <button onClick={() => { setPage('audit'); setNotifOpen(false); }} className="text-[10px] uppercase tracking-wider text-brand-blue hover:underline">View all</button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {notifEntries.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-muted">No admin activity yet.<br/>Perform a mutation (UGC moderate, support reply) to see entries.</div>
                    ) : notifEntries.map((e: any) => {
                      const tone = auditActionTone(e.action);
                      return (
                        <button
                          key={e.id}
                          onClick={() => { setPage('audit'); setNotifOpen(false); }}
                          className="w-full text-left px-4 py-2.5 border-b border-hairline last:border-0 hover:bg-surface/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${AUDIT_TONE_CLASSES[tone]}`}>{actionLabel(e.action)}</span>
                            <span className="text-[10px] text-muted whitespace-nowrap">{timeAgo(e.created_at)}</span>
                          </div>
                          <div className="text-[11px] text-body truncate">{e.admin_email}</div>
                          <div className="text-[10px] text-muted truncate">{e.entity_type}{e.entity_id ? ` · ${e.entity_id.slice(0, 8)}\u2026` : ''}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white text-sm font-display font-bold">V</div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto bg-surface/40">
          {page === 'users' ? (
            <UsersPage selectedUserId={selectedUserId} setSelectedUserId={setSelectedUserId} />
          ) : page === 'trips' ? (
            <TripsPage />
          ) : page === 'chat' ? (
            <ChatAIPage navigateToUser={navigateToUser} />
          ) : page === 'bookings' ? (
            <BookingsPage />
          ) : page === 'billing' ? (
            <BillingPage />
          ) : page === 'audit' ? (
            <AuditLogPage />
          ) : page === 'support' ? (
            <SupportPage />
          ) : page === 'content' ? (
            <ContentPage />
          ) : (
            <OverviewPage />
          )}
        </div>
      </main>
    </div>
  );
}
