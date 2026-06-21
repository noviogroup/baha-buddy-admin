'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Flag, Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import type { LaunchReadinessPriority, LaunchReadinessStatus, LaunchReadinessTaskRow } from '@/lib/types';

type LaunchReadinessResponse = {
  tasks: LaunchReadinessTaskRow[];
  summary: {
    total: number;
    openP0: number;
    needsApproval: number;
    approved: number;
    blocked: number;
    completionRate: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  workstreams: string[];
  note?: string;
};

const STATUS_COLUMNS: Array<{ id: LaunchReadinessStatus; label: string; description: string }> = [
  { id: 'todo', label: 'To Do', description: 'Not started' },
  { id: 'in_progress', label: 'In Progress', description: 'Being worked' },
  { id: 'needs_approval', label: 'Needs Approval', description: 'Ready for review' },
  { id: 'approved', label: 'Approved', description: 'Launch gate accepted' },
  { id: 'blocked', label: 'Blocked', description: 'Needs escalation' },
  { id: 'done', label: 'Done', description: 'Completed follow-through' },
];

const PRIORITIES: LaunchReadinessPriority[] = ['p0', 'p1', 'p2', 'p3'];

export function LaunchReadinessModule() {
  const { data, loading, error, reload } = useApi<LaunchReadinessResponse>('/api/launch-readiness?limit=500');
  const [statusFilter, setStatusFilter] = useState<'all' | LaunchReadinessStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | LaunchReadinessPriority>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tasks = data?.tasks || [];
  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    return true;
  }), [tasks, statusFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<LaunchReadinessStatus, LaunchReadinessTaskRow[]>();
    for (const column of STATUS_COLUMNS) groups.set(column.id, []);
    for (const task of filteredTasks) groups.get(task.status)?.push(task);
    return groups;
  }, [filteredTasks]);

  async function updateTask(id: string, updates: Partial<LaunchReadinessTaskRow>) {
    setSavingId(id);
    try {
      const res = await apiFetch('/api/launch-readiness', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Update failed with ${res.status}`);
      }
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      workstream: String(formData.get('workstream') || 'Operations'),
      owner: String(formData.get('owner') || ''),
      priority: String(formData.get('priority') || 'p1'),
      status: 'todo',
      due_date: String(formData.get('due_date') || ''),
      scenario_ref: String(formData.get('scenario_ref') || ''),
      evidence_url: String(formData.get('evidence_url') || ''),
      notes: String(formData.get('notes') || ''),
    };

    try {
      const res = await apiFetch('/api/launch-readiness', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Create failed with ${res.status}`);
      }
      event.currentTarget.reset();
      setFormOpen(false);
      await reload();
    } catch (err: any) {
      setFormError(err.message || 'Task could not be created.');
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState error={error} />;

  const launchBlocked = data.summary.openP0 > 0 || data.summary.blocked > 0 || data.summary.needsApproval > 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="bg-white rounded-xl border border-hairline p-5 shadow-card baha-gradient-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Launch Readiness</h2>
              <p className="text-sm text-body max-w-3xl leading-relaxed">
                Manage the approval board for beta and launch gates, scenario coverage gaps, owner assignments, evidence links, and Board-ready operational status.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFormOpen(open => !open)} className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark">
              <Plus size={13} className="inline mr-1" />
              Task
            </button>
            <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white border border-hairline text-xs font-semibold text-body hover:border-brand-blue">
              <RefreshCw size={13} className="inline mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {data.note && <div className="rounded-xl border border-hairline bg-status-warning-bg p-4 text-sm font-semibold text-status-warning">{data.note}</div>}

      <div className="grid grid-cols-5 gap-3">
        <ReadinessStat label="Launch gate" value={launchBlocked ? 'Blocked' : 'Ready'} tone={launchBlocked ? 'warning' : 'success'} note={launchBlocked ? 'Open P0, blocked, or approval items remain' : 'All required gates approved'} />
        <ReadinessStat label="Open P0" value={data.summary.openP0} tone={data.summary.openP0 ? 'danger' : 'success'} note="Must be zero" />
        <ReadinessStat label="Needs approval" value={data.summary.needsApproval} tone={data.summary.needsApproval ? 'warning' : 'neutral'} note="Awaiting review" />
        <ReadinessStat label="Blocked" value={data.summary.blocked} tone={data.summary.blocked ? 'danger' : 'neutral'} note="Escalate" />
        <ReadinessStat label="Completion" value={`${data.summary.completionRate}%`} tone={data.summary.completionRate === 100 ? 'success' : 'neutral'} note={`${data.summary.approved}/${data.summary.total} approved or done`} />
      </div>

      {formOpen && (
        <form onSubmit={createTask} className="bg-white rounded-xl border border-hairline p-5 shadow-card">
          <div className="grid grid-cols-4 gap-3">
            <label className="col-span-2 text-xs font-semibold text-muted uppercase tracking-wider">
              Title
              <input name="title" required className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" placeholder="Launch gate or approval item" />
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Workstream
              <input name="workstream" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" placeholder="Bookings" />
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Owner
              <input name="owner" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" placeholder="CTO / CPO" />
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Priority
              <select name="priority" defaultValue="p1" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal">
                {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Due date
              <input name="due_date" type="date" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" />
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Scenario ref
              <input name="scenario_ref" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" placeholder="P0 #2" />
            </label>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
              Evidence URL
              <input name="evidence_url" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" placeholder="Test run, PR, doc, video" />
            </label>
            <label className="col-span-2 text-xs font-semibold text-muted uppercase tracking-wider">
              Description
              <textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" />
            </label>
            <label className="col-span-2 text-xs font-semibold text-muted uppercase tracking-wider">
              Notes
              <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm text-ink normal-case tracking-normal font-normal" />
            </label>
          </div>
          {formError && <div className="mt-3 text-sm font-semibold text-status-danger">{formError}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-2 rounded-lg border border-hairline text-xs font-semibold text-body">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg bg-brand-blue text-xs font-semibold text-white">Create task</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-hairline p-4 shadow-card">
        <div className="flex items-center gap-3">
          <FilterSelect label="Status" value={statusFilter} onChange={value => setStatusFilter(value as 'all' | LaunchReadinessStatus)} options={['all', ...STATUS_COLUMNS.map(column => column.id)]} />
          <FilterSelect label="Priority" value={priorityFilter} onChange={value => setPriorityFilter(value as 'all' | LaunchReadinessPriority)} options={['all', ...PRIORITIES]} />
          <div className="ml-auto text-xs text-muted">{filteredTasks.length} of {tasks.length} tasks shown</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        {STATUS_COLUMNS.map(column => {
          const columnTasks = grouped.get(column.id) || [];
          return (
            <section key={column.id} className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-hairline bg-surface/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-display font-bold text-ink">{column.label}</h3>
                    <p className="text-[11px] text-muted">{column.description}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-blue">{columnTasks.length}</span>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-3">
                {columnTasks.length === 0 && <div className="rounded-lg border border-dashed border-hairline p-5 text-center text-xs text-muted">No tasks</div>}
                {columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    saving={savingId === task.id}
                    onUpdate={updates => updateTask(task.id, updates)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, saving, onUpdate }: { task: LaunchReadinessTaskRow; saving: boolean; onUpdate: (updates: Partial<LaunchReadinessTaskRow>) => void }) {
  const nextPrimary = primaryAction(task.status);
  return (
    <article className="rounded-lg border border-hairline p-3 hover:border-brand-blue/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <PriorityPill priority={task.priority} />
          <span className="text-[11px] font-semibold text-muted">{task.workstream}</span>
        </div>
        {saving && <Loader2 size={14} className="animate-spin text-brand-blue" />}
      </div>
      <h4 className="text-sm font-display font-bold text-ink leading-snug">{task.title}</h4>
      {task.description && <p className="mt-2 text-xs text-body leading-relaxed">{task.description}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted">
        <div><span className="font-semibold text-body">Owner:</span> {task.owner || 'Unassigned'}</div>
        <div><span className="font-semibold text-body">Due:</span> {formatDate(task.due_date)}</div>
        <div><span className="font-semibold text-body">Ref:</span> {task.scenario_ref || '—'}</div>
        <div><span className="font-semibold text-body">Approved:</span> {task.approver_email || '—'}</div>
      </div>
      {(task.evidence_url || task.source_doc_path || task.notes) && (
        <div className="mt-3 rounded-lg bg-surface/70 border border-hairline p-2 text-[11px] text-body leading-relaxed">
          {task.evidence_url && <div><span className="font-semibold">Evidence:</span> {task.evidence_url}</div>}
          {task.source_doc_path && <div><span className="font-semibold">Source:</span> {task.source_doc_path}</div>}
          {task.notes && <div><span className="font-semibold">Notes:</span> {task.notes}</div>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {nextPrimary && (
          <button disabled={saving} onClick={() => onUpdate({ status: nextPrimary.status })} className="px-2.5 py-1.5 rounded-md bg-brand-blue text-white text-[11px] font-semibold disabled:opacity-60">
            {nextPrimary.label}
          </button>
        )}
        {task.status !== 'approved' && task.status !== 'done' && (
          <button disabled={saving} onClick={() => onUpdate({ status: 'blocked' })} className="px-2.5 py-1.5 rounded-md border border-hairline text-[11px] font-semibold text-status-warning disabled:opacity-60">
            Block
          </button>
        )}
        {task.status !== 'todo' && (
          <button disabled={saving} onClick={() => onUpdate({ status: 'todo' })} className="px-2.5 py-1.5 rounded-md border border-hairline text-[11px] font-semibold text-body disabled:opacity-60">
            Reopen
          </button>
        )}
      </div>
    </article>
  );
}

function primaryAction(status: LaunchReadinessStatus): { label: string; status: LaunchReadinessStatus } | null {
  if (status === 'todo') return { label: 'Start', status: 'in_progress' };
  if (status === 'in_progress') return { label: 'Send for approval', status: 'needs_approval' };
  if (status === 'needs_approval') return { label: 'Approve', status: 'approved' };
  if (status === 'approved') return { label: 'Mark done', status: 'done' };
  if (status === 'blocked') return { label: 'Resume', status: 'in_progress' };
  return null;
}

function ReadinessStat({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const toneClass = tone === 'success' ? 'text-status-success' : tone === 'warning' ? 'text-status-warning' : tone === 'danger' ? 'text-status-danger' : 'text-ink';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? AlertTriangle : tone === 'warning' ? Flag : ShieldCheck;
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-muted font-bold tracking-wider uppercase">{label}</div>
        <Icon size={15} className={toneClass} />
      </div>
      <div className={`text-2xl font-display font-bold tracking-tight ${toneClass}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1">{note}</div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="ml-2 rounded-lg border border-hairline bg-white px-2 py-1.5 text-xs normal-case tracking-normal text-body">
        {options.map(option => <option key={option} value={option}>{option === 'all' ? 'All' : option.replace(/_/g, ' ').toUpperCase()}</option>)}
      </select>
    </label>
  );
}

function PriorityPill({ priority }: { priority: LaunchReadinessPriority }) {
  const classes = priority === 'p0'
    ? 'bg-status-danger-bg text-status-danger'
    : priority === 'p1'
      ? 'bg-status-warning-bg text-status-warning'
      : 'bg-brand-blue-light text-brand-blue';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${classes}`}>{priority}</span>;
}

function LoadingState() {
  return <div className="bg-white rounded-xl border border-hairline p-6 shadow-card"><div className="skeleton h-6 w-56 mb-4" /><div className="skeleton h-40 w-full" /></div>;
}

function ErrorState({ error }: { error?: string | null }) {
  return (
    <div className="bg-white rounded-xl border border-hairline p-8 text-center shadow-card">
      <AlertTriangle size={38} className="mx-auto text-status-warning mb-3" />
      <h3 className="text-lg font-display font-bold text-ink mb-2">Launch readiness unavailable</h3>
      <p className="text-sm text-body">{error || 'The API did not return data.'}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}
