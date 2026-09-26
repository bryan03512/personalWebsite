-- One row per user, holding the JSON save blob for each app that syncs to
-- an account. Row Level Security ensures a user can only ever read or write
-- their own row - the client uses the public "publishable" key directly,
-- so this is the only thing standing between users' save data.

create table if not exists public.saves (
  user_id uuid references auth.users(id) on delete cascade primary key,
  clicker jsonb,
  towerdefense jsonb,
  chat jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "select_own_save" on public.saves
  for select using (auth.uid() = user_id);

create policy "insert_own_save" on public.saves
  for insert with check (auth.uid() = user_id);

create policy "update_own_save" on public.saves
  for update using (auth.uid() = user_id);
