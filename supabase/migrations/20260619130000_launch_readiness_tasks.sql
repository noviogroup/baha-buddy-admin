-- Launch readiness task manager for cross-functional beta/launch approvals.
-- This table is admin-owned and stores the operational checklist that turns
-- scenario coverage gaps into assigned, reviewable, auditable work.

create table if not exists public.launch_readiness_tasks (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  title text not null,
  description text,
  workstream text not null default 'operations',
  priority text not null default 'p1' check (priority in ('p0', 'p1', 'p2', 'p3')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'needs_approval', 'approved', 'blocked', 'done')),
  owner text,
  approver_email text,
  approved_at timestamptz,
  due_date date,
  scenario_ref text,
  source_doc_path text,
  evidence_url text,
  notes text,
  sort_order integer not null default 0,
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists launch_readiness_tasks_status_idx on public.launch_readiness_tasks(status);
create index if not exists launch_readiness_tasks_priority_idx on public.launch_readiness_tasks(priority);
create index if not exists launch_readiness_tasks_workstream_idx on public.launch_readiness_tasks(workstream);
create index if not exists launch_readiness_tasks_due_date_idx on public.launch_readiness_tasks(due_date);

create or replace function public.set_launch_readiness_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists launch_readiness_tasks_updated_at on public.launch_readiness_tasks;
create trigger launch_readiness_tasks_updated_at
before update on public.launch_readiness_tasks
for each row execute function public.set_launch_readiness_tasks_updated_at();

alter table public.launch_readiness_tasks enable row level security;

drop policy if exists "launch_readiness_tasks_admin_service_role" on public.launch_readiness_tasks;
create policy "launch_readiness_tasks_admin_service_role"
  on public.launch_readiness_tasks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.launch_readiness_tasks
  (source_key, title, description, workstream, priority, status, owner, scenario_ref, source_doc_path, sort_order)
values
  (
    'rls-trip-owner-collaborator',
    'Enable and verify trip owner/collaborator RLS',
    'Owner and collaborator policies must cover mobile, web, chat auto-save, shared links, and invite acceptance before broad beta.',
    'Security',
    'p0',
    'todo',
    'CTO / DB',
    'P0 Before Broad Beta #1',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    10
  ),
  (
    'booking-lifecycle-flight-stay',
    'Validate flight and stay booking lifecycle end to end',
    'Prove search, verify/prebook, Stripe, provider order, webhook/client return, booking row, My Trip, Profile, and Admin all agree.',
    'Bookings',
    'p0',
    'todo',
    'CTO / Operations',
    'P0 Before Broad Beta #2',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    20
  ),
  (
    'booking-failure-presentation',
    'Approve non-confirmed booking failure states',
    'Payment succeeded/provider failed, provider succeeded/local save failed, provider pending, abandoned, cancelled, and refunded must never render as confirmed.',
    'Bookings',
    'p0',
    'todo',
    'CPO / QA',
    'P0 Before Broad Beta #3',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    30
  ),
  (
    'ai-no-hallucinated-places',
    'Audit AI recommendation paths for verified place sourcing',
    'Every recommendation path must use Claude/tooling with canonical places or approved source records and must handle empty tool results without inventing places.',
    'AI / Places',
    'p0',
    'todo',
    'CTO / CPO',
    'P0 Before Broad Beta #4',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    40
  ),
  (
    'secret-rotation-launch',
    'Rotate exposed keys and verify server-only secrets',
    'Rotate known exposed provider keys and verify mobile/web clients do not contain external API secrets.',
    'Security',
    'p0',
    'todo',
    'CTO',
    'P0 Before Broad Beta #5',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    50
  ),
  (
    'canonical-place-read-path',
    'Finish canonical place read-path migration',
    'Mobile, web, and chat tools should read canonical managed records first for stays, restaurants, activities, deals, tours, and island sections.',
    'Places',
    'p1',
    'todo',
    'Product Engineering',
    'P1 Product Reliability #1',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    60
  ),
  (
    'card-schema-validation',
    'Consolidate rich card schemas and fallbacks',
    'Edge Function, mobile, and web should share card schema expectations with malformed-card fallback rendering and logging.',
    'AI / UX',
    'p1',
    'todo',
    'Product Engineering',
    'P1 Product Reliability #2',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    70
  ),
  (
    'anonymous-email-upgrade',
    'Verify anonymous-to-email account upgrade',
    'Users must keep trips, chat threads, saved places, and bookings when upgrading from anonymous auth to email.',
    'Identity',
    'p1',
    'todo',
    'Product Engineering',
    'P1 Product Reliability #3',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    80
  ),
  (
    'support-recovery-flow',
    'Define support recovery for launch-critical issues',
    'Booking failures, refunds/cancellations, and urgent in-trip support need traveler entry points and admin recovery handling.',
    'Support',
    'p1',
    'todo',
    'COO / Support',
    'P1 Product Reliability #4',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    90
  ),
  (
    'voice-launch-scope',
    'Approve voice launch scope',
    'Decide whether launch includes stt-proxy, tts-proxy, low-confidence transcript confirmation, and mute settings or explicitly defers voice.',
    'Voice',
    'p1',
    'todo',
    'CPO / CTO',
    'P1 Product Reliability #5',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    100
  ),
  (
    'booking-idempotency',
    'Add idempotency to payment/provider booking attempts',
    'Duplicate taps, network drops, webhook timing, and client retry must not double charge or create duplicate provider orders.',
    'Bookings',
    'p1',
    'todo',
    'CTO',
    'P1 Product Reliability #6',
    'docs/2026-06-19-USER-SCENARIO-COVERAGE-PLAN.md',
    110
  )
on conflict (source_key) do update set
  title = excluded.title,
  description = excluded.description,
  workstream = excluded.workstream,
  priority = excluded.priority,
  owner = excluded.owner,
  scenario_ref = excluded.scenario_ref,
  source_doc_path = excluded.source_doc_path,
  sort_order = excluded.sort_order,
  updated_at = now();
