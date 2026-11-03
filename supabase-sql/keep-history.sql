-- Keeps a history of every earlier version of your data, inside Supabase.
-- Run this once in Supabase -> SQL Editor. Safe to run again.
--
-- Why: the app stores each section (clients, bookings, money...) as one
-- block. If anything ever overwrote a block with the wrong data, there was
-- no way back except an old backup file. With this, the version from just
-- before ANY overwrite is kept, so it can always be copied back.
--
-- It saves the old version before an update when either:
--   * the newest saved copy is more than 20 minutes old (so edits don't
--     create thousands of copies), or
--   * the new data is much smaller than what it replaces (that's what a
--     wipe looks like — always keep the copy from right before it).
-- Copies older than 120 days are removed automatically.

create table if not exists app_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  key text not null,
  value jsonb not null,
  saved_at timestamptz not null default now()
);

create index if not exists app_state_history_lookup
  on app_state_history (user_id, key, saved_at desc);

alter table app_state_history enable row level security;

drop policy if exists "Owner can read own history" on app_state_history;
create policy "Owner can read own history"
  on app_state_history for select
  using (auth.uid() = user_id);

create or replace function public.keep_app_state_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_saved timestamptz;
begin
  if new.value is not distinct from old.value then
    return new;
  end if;

  select max(saved_at) into last_saved
    from app_state_history
   where user_id = old.user_id and key = old.key;

  if last_saved is null
     or last_saved < now() - interval '20 minutes'
     or length(new.value::text) < 0.7 * length(old.value::text) then
    insert into app_state_history (user_id, key, value)
    values (old.user_id, old.key, old.value);
  end if;

  delete from app_state_history
   where user_id = old.user_id
     and key = old.key
     and saved_at < now() - interval '120 days';

  return new;
end;
$$;

drop trigger if exists app_state_keep_history on app_state;
create trigger app_state_keep_history
  before update on app_state
  for each row execute function public.keep_app_state_history();

notify pgrst, 'reload schema';
