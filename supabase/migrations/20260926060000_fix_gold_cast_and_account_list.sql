-- bestGold can be fractional (economy towers accrue credits/sec), and
-- casting a decimal string like "126480.914..." straight to ::bigint
-- fails ("invalid input syntax for type bigint"). Round through numeric
-- first. Column name/type/order unchanged, so this is a safe replace.
create or replace view public.leaderboard as
select
  s.user_id,
  split_part(u.email, '@', 1) as display_name,
  coalesce((s.clicker->>'prestigePoints')::bigint, 0) as clicker_prestige,
  coalesce((s.towerdefense->>'bestWave')::int, 0) as td_best_wave,
  coalesce((s.clicker->>'peakScore')::bigint, 0) as clicker_peak,
  coalesce(round((s.towerdefense->>'bestGold')::numeric)::bigint, 0) as td_best_gold
from public.saves s
join auth.users u on u.id = s.user_id
where s.leaderboard_visible = true;

grant select on public.leaderboard to anon, authenticated;

-- Adds an "accounts" list to the existing owner-only overview (additive -
-- same gating, same function name, just one more field in the returned
-- json) so bryan@gmail.com can see who has registered.
create or replace function public.get_site_overview()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if lower(coalesce(auth.email(), '')) is distinct from 'bryan@gmail.com' then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'total_accounts', (select count(*) from auth.users),
    'total_visits', (select total_visits from public.site_stats where id = 1),
    'accounts', (
      select coalesce(json_agg(json_build_object(
        'email', u.email,
        'created_at', u.created_at
      ) order by u.created_at desc), '[]'::json)
      from auth.users u
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_site_overview() to authenticated;
