-- Run once in Supabase SQL Editor. Anonymous callers can only execute the functions.
create table if not exists public.site_daily_visits (
  visit_date date primary key,
  visits bigint not null default 0
);
alter table public.site_daily_visits enable row level security;
revoke all on public.site_daily_visits from anon, authenticated;
create or replace function public.site_visit_stats(p_record boolean default false)
returns table(today_visits bigint,total_visits bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if p_record then
    insert into public.site_daily_visits(visit_date,visits)
    values ((now() at time zone 'Asia/Seoul')::date,1)
    on conflict(visit_date) do update set visits=public.site_daily_visits.visits+1;
  end if;
  return query select
    coalesce((select visits from public.site_daily_visits where visit_date=(now() at time zone 'Asia/Seoul')::date),0)::bigint,
    coalesce((select sum(visits) from public.site_daily_visits),0)::bigint;
end;
$$;
revoke all on function public.site_visit_stats(boolean) from public;
grant execute on function public.site_visit_stats(boolean) to anon,authenticated;
