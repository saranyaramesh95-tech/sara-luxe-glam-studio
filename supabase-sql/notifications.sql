-- Phone notifications: the tables they need. Run once in Supabase ->
-- SQL Editor. Safe to run again.

-- One row per phone/computer that has tapped "Enable notifications".
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Owner can manage subscriptions" on push_subscriptions;
create policy "Owner can manage subscriptions"
  on push_subscriptions
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Remembers what has already been announced, so nothing is sent twice.
-- No policies on purpose: only the notifier (which uses the service key)
-- ever reads or writes it.
create table if not exists notification_state (
  key text primary key,
  value text
);
alter table notification_state enable row level security;

-- Which website inquiries have already been announced. Inquiries that
-- already exist are marked as done so you are NOT flooded with old ones;
-- only inquiries that arrive from now on are announced.
alter table inquiries add column if not exists notified boolean not null default true;
alter table inquiries alter column notified set default false;

notify pgrst, 'reload schema';
