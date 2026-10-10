-- Appended at the end, same reason as every prior leaderboard column:
-- CREATE OR REPLACE VIEW can only add trailing columns, not insert/reorder
-- them. td_full_clear reflects towerdefense.js's stored.fullClear (set in
-- saveGame, computed by hasFullClearEverywhere - every medal, every
-- difficulty and every mode, on all 5 maps) so the leaderboard can show a
-- badge for it without any new sync plumbing - fullClear already rides
-- along inside the same towerdefense JSONB blob every other td_* column
-- reads from.
create or replace view public.leaderboard as
select
  s.user_id,
  split_part(u.email, '@', 1) as display_name,
  coalesce((s.clicker->>'prestigePoints')::bigint, 0) as clicker_prestige,
  coalesce((s.towerdefense->>'bestWave')::int, 0) as td_best_wave,
  coalesce((s.clicker->>'peakScore')::bigint, 0) as clicker_peak,
  coalesce(round((s.towerdefense->>'bestGold')::numeric)::bigint, 0) as td_best_gold,
  coalesce((s.towerdefense->>'fullClear')::boolean, false) as td_full_clear
from public.saves s
join auth.users u on u.id = s.user_id
where s.leaderboard_visible = true;

grant select on public.leaderboard to anon, authenticated;
