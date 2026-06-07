'use client';

import { AlertTriangle, CheckCircle2, ShieldCheck, UserCog, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'super_admin' | 'admin' | 'viewer';
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminUsersResponse = {
  admins: AdminUser[];
  summary: Record<string, number>;
};

function timeAgo(ts: string | null) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  const classes = role === 'super_admin'
    ? 'bg-brand-gold-light text-status-warning'
    : role === 'admin'
      ? 'bg-brand-blue/10 text-brand-blue-dark'
      : 'bg-surface text-body';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${classes}`}>{role.replace('_', ' ')}</span>;
}

export function AdminUsersModule() {
  const { data, loading, error, reload } = useApi<AdminUsersResponse>('/api/admin-users');

  const updateAdmin = async (id: string, patch: Record<string, unknown>) => {
    const res = await apiFetch('/api/admin-users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || `Update failed: ${res.status}`);
      return;
    }
    await reload();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="skeleton h-3 w-24 mb-3" /><div className="skeleton h-8 w-24" /></div>)}
        </div>
        <div className="bg-white rounded-xl border border-hairline h-72 shadow-card"><div className="p-5"><div className="skeleton h-4 w-40 mb-6" /><div className="skeleton h-40 w-full" /></div></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
        <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
        <h3 className="text-lg font-display font-bold text-ink mb-2">Admin users unavailable</h3>
        <p className="text-sm text-body">{error || 'The admin users API did not return data.'}</p>
      </div>
    );
  }

  const summary = data.summary || {};

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Admin Users</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              Manage internal access to the Baha Buddy command center. Role and status changes are restricted to super admins and logged in the audit trail.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success bg-status-success-bg px-3 py-1 rounded-full">
            <ShieldCheck size={13} /> Secured
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Total admins</div><div className="text-2xl font-display font-bold text-ink">{summary.total || 0}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Active</div><div className="text-2xl font-display font-bold text-ink">{summary.active || 0}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Super admins</div><div className="text-2xl font-display font-bold text-ink">{summary.super_admin || 0}</div></div>
        <div className="bg-white rounded-xl p-4 border border-hairline shadow-card"><div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Viewers</div><div className="text-2xl font-display font-bold text-ink">{summary.viewer || 0}</div></div>
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-hairline flex items-center gap-2">
          <Users size={16} className="text-brand-blue" />
          <h3 className="text-sm font-semibold text-ink tracking-tight">Admin roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Admin</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Role</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Last Seen</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted tracking-wider uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.admins.map(admin => (
                <tr key={admin.id} className="border-b border-hairline last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{admin.display_name || admin.email}</div>
                    <div className="text-[11px] text-muted">{admin.email}</div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={admin.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${admin.active ? 'text-status-success' : 'text-status-danger'}`}>
                      <CheckCircle2 size={13} /> {admin.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body text-xs">{timeAgo(admin.last_seen_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={admin.role}
                        onChange={e => updateAdmin(admin.id, { role: e.target.value })}
                        className="text-[11px] border border-hairline rounded-md px-2 py-1 bg-white text-body"
                      >
                        <option value="super_admin">Super admin</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => updateAdmin(admin.id, { active: !admin.active })}
                        className="px-2.5 py-1 rounded-md border border-hairline text-[11px] font-medium text-body hover:border-brand-blue flex items-center gap-1"
                      >
                        <UserCog size={12} /> {admin.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.admins.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No admin users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
