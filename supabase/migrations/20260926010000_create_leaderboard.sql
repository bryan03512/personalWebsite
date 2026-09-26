-- Public read-only leaderboard view. The underlying "saves" table is
-- locked down by RLS to one row per user, but a leaderboard needs to read
-- across every user's row - rather than loosening RLS on the raw table
-- (which would also expose full save blobs and let anyone join to auth.users
-- directly), this view exposes only a derived display name and the specific
-- best-ever numbers worth ranking, and is granted to anon/authenticated
-- directly instead.
create or replace view public.leaderboard as
select
  s.user_id,
  split_part(u.email, '@', 1) as display_name,
  coalesce((s.clicker->>'prestigePoints')::bigint, 0) as clicker_prestige,
  coalesce((s.towerdefense->>'bestWave')::int, 0) as td_best_wave
from public.saves s
join auth.users u on u.id = s.user_id;

grant select on public.leaderboard to anon, authenticated;
