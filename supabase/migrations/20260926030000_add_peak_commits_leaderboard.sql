-- Postgres only allows CREATE OR REPLACE VIEW to append trailing columns,
-- not insert/reorder them, so the new column goes at the end.
create or replace view public.leaderboard as
select
  s.user_id,
  split_part(u.email, '@', 1) as display_name,
  coalesce((s.clicker->>'prestigePoints')::bigint, 0) as clicker_prestige,
  coalesce((s.towerdefense->>'bestWave')::int, 0) as td_best_wave,
  coalesce((s.clicker->>'peakScore')::bigint, 0) as clicker_peak
from public.saves s
join auth.users u on u.id = s.user_id
where s.leaderboard_visible = true;

grant select on public.leaderboard to anon, authenticated;
