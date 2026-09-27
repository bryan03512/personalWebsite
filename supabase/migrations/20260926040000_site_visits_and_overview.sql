-- Single-row counter (not one row per visit) so this stays cheap forever.
create table if not exists public.site_stats (
  id int primary key default 1,
  total_visits bigint not null default 0,
  check (id = 1)
);

insert into public.site_stats (id, total_visits) values (1, 0)
on conflict (id) do nothing;

-- Anyone (including logged-out visitors) can bump the counter, but nobody
-- can read the table directly - only through get_site_overview() below.
create or replace function public.record_visit()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_stats set total_visits = total_visits + 1 where id = 1;
end;
$$;

grant execute on function public.record_visit() to anon, authenticated;

-- Gated by email rather than a hardcoded user id, since this account may
-- not exist yet - auth.email() reads it straight from the caller's own JWT,
-- so this starts working automatically whenever that address signs up.
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
    'total_visits', (select total_visits from public.site_stats where id = 1)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_site_overview() to authenticated;
