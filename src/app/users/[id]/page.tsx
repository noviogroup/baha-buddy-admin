'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Mail, MapPin, Calendar, Compass, DollarSign,
  MessageSquare, Zap, AlertTriangle, ShieldCheck, Hotel, Plane,
  Activity, Clock, TrendingUp, User as UserIcon, ExternalLink,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { CHART, Badge, Section, TH, timeAgo } from '@/lib/ui-primitives';
import { CancelBookingsModal } from '@/components/cancel-bookings-modal';

// ═══════════════════════════════════════════════════════════════════════════
// USER DETAIL — Phase 2 #22
// Full-page drill-down for a single user. Six tabs:
//   1. Profile   — basic info, party config, engagement, KPI grid
//   2. Trips     — all trips this user owns, click-through to /trips/[id]
//   3. Bookings  — all bookings across all trips (with per-row cancel)
//   4. Chat      — chat threads owned by this user
//   5. AI Usage  — token consumption + recent prompts
//   6. Admin     — privileged actions (suspend, anonymize) — Phase 3
//
// Currency formatting goes through the fmt$() helper at the top — the
// edit_file tool can mangle template literals that have a literal $ before
// an interpolation, so we route everything through string concat to keep
// future edits safe.
// ═══════════════════════════════════════════════════════════════════════════

const DOLLAR = '$';
const fmt$ = (n: number) => DOLLAR + n.toLocaleString();
const fmt$d = (n: number, d: number) => DOLLAR + n.toFixed(d);

type Tab = 'profile' | 'trips' | 'bookings' | 'chat' | 'ai' | 'admin';

interface UserDetailResponse {
  user: any;
  trips: any[];
  bookings: any[];
  threads: any[];
  aiUsage: {
    recentLogs: any[];
    totalCost: number;
    totalTokens: number;
    requestCount: number;
  };
  revenue: number;
  error?: string;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const { data, loading, error, reload } = useApi<UserDetailResponse>(`/api/user-detail?id=${params.id}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface/40 font-body">
        <UserHeader name="Loading…" loading />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Section title="">
            <div className="p-4">
              <div className="skeleton h-6 w-1/3 mb-4" />
              <div className="skeleton h-4 w-2/3 mb-2" />
              <div className="skeleton h-4 w-1/2 mb-2" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </Section>
        </div>
      </div>
    );
  }

  if (error || !data?.user) {
    return (
      <div className="min-h-screen bg-surface/40 font-body flex items-center justify-center">
        <div className="bg-white rounded-xl border border-hairline shadow-card p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto text-status-danger mb-3" />
          <h2 className="text-lg font-display font-bold text-ink mb-2">User not found</h2>
          <p className="text-sm text-body mb-4">{error || 'No user with this ID exists, or they have been anonymized.'}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { user, trips, bookings, threads, aiUsage, revenue } = data;

  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'profile',  label: 'Profile',  icon: <UserIcon size={14} /> },
    { id: 'trips',    label: 'Trips',    icon: <Compass size={14} />,     count: trips.length },
    { id: 'bookings', label: 'Bookings', icon: <DollarSign size={14} />,  count: bookings.length },
    { id: 'chat',     label: 'Chat',     icon: <MessageSquare size={14} />, count: threads.length },
    { id: 'ai',       label: 'AI Usage', icon: <Zap size={14} />,         count: aiUsage.requestCount },
    { id: 'admin',    label: 'Admin',    icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-surface/40 font-body">
      <UserHeader
        name={user.display_name}
        email={user.email}
        city={user.city}
        country={user.country}
        joinedAt={user.created_at}
        engagement={user.engagement_score}
        partyType={user.party_type}
        partySize={user.party_size}
        onboardingStatus={user.onboarding_status}
      />

      {/* Tab bar */}
      <div className="bg-white border-b border-hairline sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-brand-blue text-brand-blue-dark'
                      : 'border-transparent text-muted hover:text-body'
                  }`}
                >
                  <span className={active ? 'text-brand-blue' : 'opacity-70'}>{t.icon}</span>
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-brand-blue/10 text-brand-blue-dark' : 'bg-surface text-muted'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'profile' && (
          <ProfileTab
            user={user}
            tripsCount={trips.length}
            bookingsCount={bookings.length}
            threadsCount={threads.length}
            aiCost={aiUsage.totalCost}
            aiTokens={aiUsage.totalTokens}
            revenue={revenue}
          />
        )}
        {tab === 'trips' && <TripsTab trips={trips} />}
        {tab === 'bookings' && <BookingsTab bookings={bookings} reload={reload} />}
        {tab === 'chat' && <ChatTab threads={threads} />}
        {tab === 'ai' && <AIUsageTab aiUsage={aiUsage} />}
        {tab === 'admin' && <AdminTab userId={user.id} userEmail={user.email} userDisplayName={user.display_name} />}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Header banner
// ───────────────────────────────────────────────────────────────────────────
function UserHeader({
  name, email, city, country, joinedAt, engagement, partyType, partySize, onboardingStatus, loading,
}: {
  name: string;
  email?: string;
  city?: string;
  country?: string;
  joinedAt?: string;
  engagement?: number;
  partyType?: string;
  partySize?: number;
  onboardingStatus?: string;
  loading?: boolean;
}) {
  const initials = (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

  return (
    <div className="bg-sidebar-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white mb-3 font-medium uppercase tracking-wider">
          <ChevronLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-blue/20 flex items-center justify-center text-white text-xl font-display font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight mb-1">{name}</h1>
              {!loading && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                  {email && <span className="flex items-center gap-1"><Mail size={13} /> {email}</span>}
                  {(city || country) && <span className="flex items-center gap-1"><MapPin size={13} /> {[city, country].filter(Boolean).join(', ')}</span>}
                  {joinedAt && <span className="flex items-center gap-1"><Calendar size={13} /> Joined {timeAgo(joinedAt)}</span>}
                </div>
              )}
              {!loading && (partyType || typeof engagement === 'number') && (
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-zinc-300">
                  {partyType && (
                    <span className="bg-white/10 text-white px-2 py-0.5 rounded-full font-medium">
                      {partyType}{partySize ? ` · ${partySize} pax` : ''}
                    </span>
                  )}
                  {typeof engagement === 'number' && (
                    <span className="bg-white/10 text-white px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <TrendingUp size={11} /> Engagement {engagement}/100
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {onboardingStatus && <Badge status={onboardingStatus} />}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Profile tab — KPI grid + identity + interests
// ───────────────────────────────────────────────────────────────────────────
function ProfileTab({
  user, tripsCount, bookingsCount, threadsCount, aiCost, aiTokens, revenue,
}: {
  user: any;
  tripsCount: number;
  bookingsCount: number;
  threadsCount: number;
  aiCost: number;
  aiTokens: number;
  revenue: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Compass size={16} />} label="Trips" value={tripsCount} />
        <KpiCard icon={<DollarSign size={16} />} label="Bookings" value={bookingsCount} />
        <KpiCard icon={<MessageSquare size={16} />} label="Threads" value={threadsCount} />
        <KpiCard icon={<Zap size={16} />} label="AI Cost" value={fmt$d(aiCost, 4)} />
        <KpiCard icon={<Zap size={16} />} label="Tokens" value={aiTokens.toLocaleString()} />
        <KpiCard icon={<TrendingUp size={16} />} label="Revenue" value={fmt$(revenue)} accent="success" />
      </div>

      <Section title="Identity">
        <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <FieldRow label="Display name" value={user.display_name} />
          <FieldRow label="Email" value={user.email || <span className="text-muted italic">Anonymous</span>} />
          <FieldRow label="User ID" value={<code className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded">{user.id}</code>} />
          <FieldRow label="Auth ID" value={user.auth_id ? <code className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded">{user.auth_id}</code> : <span className="text-muted">—</span>} />
          <FieldRow label="Country" value={user.country || <span className="text-muted">—</span>} />
          <FieldRow label="City" value={user.city || <span className="text-muted">—</span>} />
          <FieldRow label="Timezone" value={user.timezone || <span className="text-muted">—</span>} />
          <FieldRow label="Locale" value={user.locale || <span className="text-muted">—</span>} />
          <FieldRow label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleString() : '—'} />
          <FieldRow label="Last active" value={user.last_active_at ? `${timeAgo(user.last_active_at)} (${new Date(user.last_active_at).toLocaleString()})` : <span className="text-muted">Never</span>} />
        </div>
      </Section>

      <Section title="Party & preferences">
        <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <FieldRow label="Party type" value={user.party_type ? <Badge status={user.party_type} /> : <span className="text-muted">—</span>} />
          <FieldRow label="Party size" value={user.party_size || <span className="text-muted">—</span>} />
          <FieldRow label="Onboarding" value={user.onboarding_status ? <Badge status={user.onboarding_status} /> : <span className="text-muted">—</span>} />
          <FieldRow label="Engagement" value={
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(user.engagement_score || 0, 100)}%`,
                  background: (user.engagement_score || 0) > 60 ? CHART.success : (user.engagement_score || 0) > 30 ? CHART.warning : CHART.danger,
                }} />
              </div>
              <span className="text-xs font-semibold text-ink">{user.engagement_score || 0}/100</span>
            </div>
          } />
        </div>
        {(user.interest_tags || []).length > 0 && (
          <div className="px-5 pb-5">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {user.interest_tags.map((t: string, i: number) => (
                <span key={i} className="text-[11px] bg-surface text-body px-2 py-1 rounded font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: 'success' }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={accent === 'success' ? 'text-status-success' : 'text-ink'}>{icon}</span>
        <span className="text-[11px] text-muted font-medium tracking-wider uppercase">{label}</span>
      </div>
      <div className={`text-xl font-display font-bold tracking-tight ${accent === 'success' ? 'text-status-success' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Trips tab — click row to drill into /trips/[id]
// ───────────────────────────────────────────────────────────────────────────
function TripsTab({ trips }: { trips: any[] }) {
  const router = useRouter();
  return (
    <Section title={`Trips (${trips.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-hairline"><TH>Trip Name</TH><TH>Islands</TH><TH>Dates</TH><TH>Budget</TH><TH>Status</TH><TH>Created</TH></tr></thead>
          <tbody>
            {trips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">This user has no trips yet</td></tr>
            ) : trips.map((t: any) => (
              <tr
                key={t.id}
                onClick={() => router.push(`/trips/${t.id}`)}
                className="border-b border-hairline hover:bg-surface/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 font-semibold text-ink">{t.name}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 flex-wrap">{(t.islands || []).map((isl: string, i: number) => (<span key={i} className="text-[10px] bg-surface text-body px-1.5 py-0.5 rounded font-medium">{isl}</span>))}</div>
                </td>
                <td className="px-4 py-2.5 text-body text-xs">
                  {t.date_start ? new Date(t.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  {t.date_end ? ` – ${new Date(t.date_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                </td>
                <td className="px-4 py-2.5 font-semibold text-ink">{t.budget_estimate ? fmt$(parseFloat(t.budget_estimate)) : '—'}</td>
                <td className="px-4 py-2.5"><Badge status={t.status} /></td>
                <td className="px-4 py-2.5 text-muted text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Bookings tab — per-row Cancel action opens shared modal
// ───────────────────────────────────────────────────────────────────────────
function BookingsTab({ bookings, reload }: { bookings: any[]; reload: () => void }) {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  return (
    <>
      <Section title={`Bookings (${bookings.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>Type</TH><TH>Amount</TH><TH>Status</TH><TH>Supplier Ref</TH><TH>Paid At</TH><TH>Created</TH><TH>Actions</TH></tr></thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">No bookings from this user</td></tr>
              ) : bookings.map((b: any) => {
                const isTerminal = ['cancelled', 'refunded'].includes(b.status);
                return (
                  <tr key={b.id} className="border-b border-hairline hover:bg-surface/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/bookings/${b.id}`} className="inline-flex items-center gap-1 text-[11px] text-body hover:text-brand-blue group">
                        {b.booking_type === 'accommodation' ? <Hotel size={12} /> : b.booking_type === 'flight' ? <Plane size={12} /> : <Activity size={12} />}
                        <span className="group-hover:underline">{b.booking_type}</span>
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 ml-0.5" />
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-ink">{fmt$(parseFloat(b.amount))} <span className="text-[10px] text-muted font-normal">{b.currency || 'USD'}</span></td>
                    <td className="px-4 py-2.5"><Badge status={b.status} /></td>
                    <td className="px-4 py-2.5 text-[11px] text-muted font-mono">{b.supplier_ref ? `${b.supplier_ref.slice(0, 16)}…` : '—'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{b.paid_at ? new Date(b.paid_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      {isTerminal ? (
                        <span className="text-[10px] text-muted">—</span>
                      ) : (
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="px-2 py-1 rounded-md bg-status-danger-bg text-status-danger text-[11px] font-semibold hover:bg-status-danger hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <CancelBookingsModal
        open={selectedBooking !== null}
        bookings={selectedBooking ? [selectedBooking] : []}
        title={selectedBooking ? `Cancel ${selectedBooking.booking_type} booking` : ''}
        onClose={() => setSelectedBooking(null)}
        onComplete={reload}
      />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Chat tab — threads owned by this user
// ───────────────────────────────────────────────────────────────────────────
function ChatTab({ threads }: { threads: any[] }) {
  return (
    <Section title={`Chat threads (${threads.length})`}>
      <div className="divide-y divide-hairline">
        {threads.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted text-sm">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            This user has no chat threads
          </div>
        ) : threads.map((t: any) => (
          <Link key={t.id} href={`/?thread=${t.id}`} className="flex items-start justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink mb-0.5">
                {t.trip_id ? `Trip thread` : 'General chat'}
                {t.trip_id && <span className="text-[10px] text-muted font-mono ml-2">{t.trip_id.slice(0, 8)}…</span>}
              </div>
              <div className="text-xs text-muted truncate">{t.last_message_preview || 'No messages'}</div>
            </div>
            <div className="text-[11px] text-muted whitespace-nowrap ml-3 flex items-center gap-1">
              <Clock size={11} /> {timeAgo(t.updated_at)}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// AI Usage tab — token consumption + recent prompts
// ───────────────────────────────────────────────────────────────────────────
function AIUsageTab({ aiUsage }: { aiUsage: UserDetailResponse['aiUsage'] }) {
  const { recentLogs, totalCost, totalTokens, requestCount } = aiUsage;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={<DollarSign size={16} />} label="Total cost" value={fmt$d(totalCost, 4)} />
        <KpiCard icon={<Zap size={16} />} label="Total tokens" value={totalTokens.toLocaleString()} />
        <KpiCard icon={<MessageSquare size={16} />} label="Requests" value={requestCount} />
      </div>

      <Section title={`Recent requests (last ${recentLogs.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-hairline"><TH>When</TH><TH>Model</TH><TH>Input</TH><TH>Output</TH><TH>Cost</TH></tr></thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted text-sm">No AI requests recorded</td></tr>
              ) : recentLogs.map((r: any, i: number) => (
                <tr key={i} className="border-b border-hairline hover:bg-surface/50">
                  <td className="px-4 py-2.5 text-body text-xs whitespace-nowrap" title={new Date(r.created_at).toLocaleString()}>
                    {timeAgo(r.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-body font-mono">{r.model}</td>
                  <td className="px-4 py-2.5 text-body text-xs">{(r.input_tokens || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-body text-xs">{(r.output_tokens || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-bold text-ink">{fmt$d(parseFloat(r.estimated_cost_usd || 0), 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Admin tab — privileged actions (suspend, anonymize) — Phase 3
// ───────────────────────────────────────────────────────────────────────────
function AdminTab({ userId, userEmail, userDisplayName }: { userId: string; userEmail?: string; userDisplayName?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Admin actions">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-body">
            Privileged actions on this user account. All actions are logged to the audit trail with the admin&apos;s identity, IP, and before/after state.
          </p>

          <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-status-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink mb-1">User mutations ship in Phase 3</div>
                <p className="text-xs text-body">
                  Suspend, anonymize, and PII reveal flows land in Phase 3 (#23 PII reveal with reason capture). The action enum (<code className="bg-white px-1 py-0.5 rounded font-mono">user_suspended</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">user_anonymized</code>) is already in the audit log type system — the UI is what&apos;s missing.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button disabled className="px-4 py-3 rounded-lg border border-hairline bg-surface text-muted text-sm font-medium cursor-not-allowed text-left">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} />
                <span className="font-semibold">Suspend user</span>
              </div>
              <div className="text-[11px]">Disables sign-in; existing trips remain readable</div>
            </button>
            <button disabled className="px-4 py-3 rounded-lg border border-hairline bg-surface text-muted text-sm font-medium cursor-not-allowed text-left">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} />
                <span className="font-semibold">Anonymize (GDPR)</span>
              </div>
              <div className="text-[11px]">Permanently scrubs PII; cannot be undone</div>
            </button>
          </div>
        </div>
      </Section>

      <Section title="Quick references">
        <div className="p-5 text-xs text-body flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted">User ID:</span>
            <code className="font-mono bg-surface px-2 py-0.5 rounded text-[11px]">{userId}</code>
          </div>
          {userDisplayName && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Display name:</span>
              <span className="font-semibold text-ink">{userDisplayName}</span>
            </div>
          )}
          {userEmail && (
            <div className="flex items-center gap-2">
              <span className="text-muted">Email:</span>
              <span className="text-ink">{userEmail}</span>
            </div>
          )}
          <a
            href={`/?page=audit&entity_type=user&entity_id=${userId}`}
            className="inline-flex items-center gap-1 text-brand-blue hover:underline mt-1"
          >
            View audit log for this user <ExternalLink size={11} />
          </a>
        </div>
      </Section>
    </div>
  );
}
