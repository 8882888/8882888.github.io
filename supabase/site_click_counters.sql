-- Run once in the Supabase SQL editor for the project used by index.html.
-- Public aggregate counts only: no IP, phone number, or personal data stored.
create table if not exists public.site_click_counters (
  day date primary key,
  all_clicks bigint not null default 0 check (all_clicks >= 0),
  phone_clicks bigint not null default 0 check (phone_clicks >= 0)
);
alter table public.site_click_counters enable row level security;
revoke all on public.site_click_counters from anon, authenticated;
create or replace function public.site_click_stats(p_phone boolean default null)
returns table(total_clicks bigint, today_clicks bigint, today_phone_clicks bigint)
language plpgsql security definer set search_path = public
as $$
declare kst_day date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_phone is not null then
    insert into public.site_click_counters(day,all_clicks,phone_clicks)
    values(kst_day,1,case when p_phone then 1 else 0 end)
    on conflict(day) do update set
      all_clicks=site_click_counters.all_clicks+1,
      phone_clicks=site_click_counters.phone_clicks+case when p_phone then 1 else 0 end;
  end if;
  return query
    select coalesce(sum(c.all_clicks),0)::bigint,
           coalesce(sum(c.all_clicks) filter(where c.day=kst_day),0)::bigint,
           coalesce(sum(c.phone_clicks) filter(where c.day=kst_day),0)::bigint
    from public.site_click_counters c;
end;
$$;
revoke all on function public.site_click_stats(boolean) from public;
grant execute on function public.site_click_stats(boolean) to anon, authenticated;
-- Anonymous counting can be artificially inflated. Apply edge rate limiting or
-- anti-abuse controls before relying on these numbers for business reporting.
