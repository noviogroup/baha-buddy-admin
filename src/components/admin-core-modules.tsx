'use client';

import { AlertTriangle, BarChart3, Bot, CreditCard, FileText, HelpCircle, MapPinned, RefreshCw, Users, Compass, ShieldCheck } from 'lucide-react';
import { useApi } from '@/lib/use-api';

function titleCase(value: unknown) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  return <Shell title="Travelers" description="View traveler accounts, profile completion, location signals, and lifecycle readiness." icon={<Users size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Travelers" value={data.total || users.length} sub="Total accounts" /><Stat label="Loaded" value={users.length} sub="Current page" /><Stat label="Completed profiles" value={completed} sub="Profile/onboarding flag" /><Stat label="Needs follow-up" value={Math.max(users.length - completed, 0)} sub="Incomplete profiles" /></div><SimpleTable headers={['Traveler','Location','Profile','Created']} rows={users.map((u: any) => [<div><div className="font-semibold text-ink">{u.display_name || 'Unnamed'}</div><div className="text-[11px] text-muted">{u.email || u.id}</div></div>, [u.city, u.country].filter(Boolean).join(', ') || '—', u.onboarding_completed || u.profile_completed ? 'Complete' : 'Incomplete', u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'])} empty="No travelers found." /></Shell>;
}

export function TripsModule() {
  const { data, loading, error, reload } = useApi<any>('/api/trips?limit=100');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Trips" error={error} />;
  const trips = data.trips || [];
  const active = trips.filter((t: any) => t.status === 'active' || t.status === 'planned').length;
  return <Shell title="Trips" description="Monitor saved trips, active itineraries, abandoned plans, islands, and traveler planning progress." icon={<Compass size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Trips" value={data.total || trips.length} /><Stat label="Active/planned" value={active} /><Stat label="Draft/other" value={Math.max(trips.length - active, 0)} /><Stat label="Loaded" value={trips.length} /></div><SimpleTable headers={['Trip','Traveler','Status','Islands','Created']} rows={trips.map((t: any) => [<div><div className="font-semibold text-ink">{t.name || 'Untitled trip'}</div><div className="text-[11px] text-muted">{t.id}</div></div>, t.users?.display_name || t.users?.email || t.user_id || '—', titleCase(t.status), Array.isArray(t.islands) ? t.islands.join(', ') : t.islands || '—', t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'])} empty="No trips found." /></Shell>;
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
  return <Shell title="Content Performance" description="Early activity attribution surface for content, chat, bookings, trips, and traveler engagement until full content-event tracking is live." icon={<FileText size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Recent activity" value={feed.length} sub="Last 24h feed" /><Stat label="Chat signals" value={counts.chat_message || 0} /><Stat label="Trips created" value={counts.trip_created || 0} /><Stat label="Bookings" value={counts.booking || 0} /></div><SimpleTable headers={['Activity','Type','When']} rows={feed.map((f: any) => [<div><div className="font-semibold text-ink">{f.title}</div><div className="text-[11px] text-muted">{f.subtitle}</div></div>, titleCase(f.type), f.timestamp ? new Date(f.timestamp).toLocaleString() : '—'])} empty="No recent activity yet." /></Shell>;
}

export function ChatModule() {
  const { data, loading, error, reload } = useApi<any>('/api/chat-threads');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Chat & AI" error={error} />;
  const threads = data.threads || [];
  return <Shell title="Chat & AI" description="Review recent Buddy threads, traveler context, linked trips, and chat-to-trip/concierge signals." icon={<Bot size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="Recent threads" value={threads.length} /><Stat label="Linked trips" value={threads.filter((t: any) => t.trip_id || t.trips).length} /><Stat label="Open conversations" value={threads.filter((t: any) => t.status !== 'closed').length} /><Stat label="Needs review" value={threads.filter((t: any) => t.needs_review).length} /></div><SimpleTable headers={['Thread','Traveler','Trip','Updated']} rows={threads.map((t: any) => [<div><div className="font-semibold text-ink">{t.title || 'Buddy conversation'}</div><div className="text-[11px] text-muted">{t.id}</div></div>, t.users?.display_name || t.users?.email || t.user_id || '—', t.trips?.name || t.trip_id || '—', t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'])} empty="No chat threads found." /></Shell>;
}

export function BillingModule() {
  const { data, loading, error, reload } = useApi<any>('/api/billing');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Billing & APIs" error={error} />;
  const s = data.summary || {};
  const credits = data.credits || [];
  return <Shell title="Billing & APIs" description="Monitor AI/API cost, credit balances, provider health, and booking/revenue cost context." icon={<CreditCard size={19} />} onRefresh={reload}><div className="grid grid-cols-4 gap-3"><Stat label="AI cost today" value={money(s.aiCostToday || 0)} /><Stat label="AI cost month" value={money(s.aiCostMonth || 0)} /><Stat label="API cost month" value={money(s.apiCostMonth || 0)} /><Stat label="Total cost month" value={money(s.totalCostMonth || 0)} /></div>{data.needsMigration && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}<SimpleTable headers={['Service','Key status','Balance','Monthly usage','Plan']} rows={credits.map((c: any) => [c.service, titleCase(c.api_key_status), c.credit_balance ?? '—', c.current_month_usage ?? '—', c.plan_tier || '—'])} empty="No API credit status rows yet." /></Shell>;
}

export function SupportModule() {
  const { data, loading, error, reload } = useApi<any>('/api/support');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Support" error={error} />;
  const tickets = data.tickets || [];
  return <Shell title="Support" description="Manage traveler support tickets, booking issues, Concierge follow-up, and internal response status." icon={<HelpCircle size={19} />} onRefresh={reload}>{data.note && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}<div className="grid grid-cols-4 gap-3"><Stat label="Tickets" value={tickets.length} /><Stat label="Open" value={tickets.filter((t: any) => t.status === 'open').length} /><Stat label="In progress" value={tickets.filter((t: any) => t.status === 'in_progress').length} /><Stat label="Resolved" value={tickets.filter((t: any) => t.status === 'resolved').length} /></div><SimpleTable headers={['Ticket','Traveler','Status','Messages','Created']} rows={tickets.map((t: any) => [<div><div className="font-semibold text-ink">{t.subject || 'Support request'}</div><div className="text-[11px] text-muted">{t.id}</div></div>, t.users?.display_name || t.users?.email || t.user_id || '—', titleCase(t.status), Array.isArray(t.support_messages) ? t.support_messages.length : 0, t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'])} empty="No support tickets yet." /></Shell>;
}

export function AuditModule() {
  const { data, loading, error, reload } = useApi<any>('/api/audit-log?limit=50');
  if (loading) return <LoadingCard />; if (error || !data) return <ErrorCard label="Audit Log" error={error} />;
  const entries = data.entries || [];
  return <Shell title="Audit Log" description="Review admin activity, role changes, order updates, payment actions, PII access, and operational accountability." icon={<ShieldCheck size={19} />} onRefresh={reload}>{data.note && <div className="bg-status-warning-bg text-status-warning rounded-xl border border-hairline p-4 text-sm font-semibold">{data.note}</div>}<div className="grid grid-cols-4 gap-3"><Stat label="Entries" value={data.total || entries.length} /><Stat label="Loaded" value={entries.length} /><Stat label="Admins" value={(data.filters?.admins || []).length} /><Stat label="Actions" value={(data.filters?.actions || []).length} /></div><SimpleTable headers={['Action','Admin','Entity','When']} rows={entries.map((e: any) => [<div><div className="font-semibold text-ink">{titleCase(e.action)}</div><div className="text-[11px] text-muted">{e.id}</div></div>, e.admin_email || e.admin_id || '—', `${e.entity_type || '—'} ${e.entity_id || ''}`, e.created_at ? new Date(e.created_at).toLocaleString() : '—'])} empty="No audit entries yet." /></Shell>;
}
