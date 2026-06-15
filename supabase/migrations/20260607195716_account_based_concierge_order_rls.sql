-- Account-based Concierge order access
-- Allows authenticated customers to read and update only their own Concierge orders.
-- Server-side admin/service role still bypasses RLS for webhook and admin operations.

alter table public.concierge_orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'concierge_orders'
      and policyname = 'Users can read own concierge orders'
  ) then
    create policy "Users can read own concierge orders"
      on public.concierge_orders
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'concierge_orders'
      and policyname = 'Users can update own concierge trip details'
  ) then
    create policy "Users can update own concierge trip details"
      on public.concierge_orders
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_concierge_orders_user_id_created_at
  on public.concierge_orders(user_id, created_at desc)
  where user_id is not null;
;
