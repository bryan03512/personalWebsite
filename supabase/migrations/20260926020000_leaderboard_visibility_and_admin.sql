-- Per-user opt-out from the public leaderboard. Defaults to visible, so
-- accounts show up unless the player explicitly hides themselves.
alter table public.saves add column if not exists leaderboard_visible boolean not null default true;

create or replace view public.leaderboard as
select
  s.user_id,
  split_part(u.email, '@', 1) as display_name,
  coalesce((s.clicker->>'prestigePoints')::bigint, 0) as clicker_prestige,
  coalesce((s.towerdefense->>'bestWave')::int, 0) as td_best_wave
from public.saves s
join auth.users u on u.id = s.user_id
where s.leaderboard_visible = true;

grant select on public.leaderboard to anon, authenticated;

-- Dev-only admin stats. SECURITY DEFINER lets this read across auth.users
-- and every row of saves (both otherwise locked down), but it checks the
-- caller's own auth.uid() first and refuses everyone except this one
-- account - real server-side enforcement, not just a hidden page.
create or replace function public.get_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if auth.uid() is distinct from '981b4a17-d8c5-420c-a15e-3395871bda3e'::uuid then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'total_accounts', (select count(*) from auth.users),
    'visible_on_leaderboard', (select count(*) from public.saves where leaderboard_visible = true),
    'hidden_from_leaderboard', (select count(*) from public.saves where leaderboard_visible = false),
    'accounts_with_clicker_save', (select count(*) from public.saves where clicker is not null),
    'accounts_with_towerdefense_save', (select count(*) from public.saves where towerdefense is not null),
    'accounts_created_last_24h', (select count(*) from auth.users where created_at > now() - interval '24 hours')
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_admin_stats() to authenticated;
