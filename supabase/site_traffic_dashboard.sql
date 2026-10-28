-- Smart24 header traffic and phone-click source dashboard.
-- Run ONCE from the connected project's Supabase SQL Editor.
-- Public aggregate figures only: no IP addresses, phone numbers, raw referrer URLs,
-- visitor IDs, user agents, or query strings are stored.
-- This migration preserves pre-existing daily visit/click counters.
create table if not exists public.site_daily_visits (
  visit_date date primary key,
  visits bigint not null default 0 check (visits >= 0)
);
create table if not exists public.site_click_counters (
  day date primary key,
  all_clicks bigint not null default 0 check (all_clicks >= 0),
  phone_clicks bigint not null default 0 check (phone_clicks >= 0)
);
create table if not exists public.site_phone_click_sources (
  day date not null,
  source text not null,
  source_page text not null,
  clicks bigint not null default 0 check (clicks >= 0),
  primary key(day,source,source_page)
);
create index if not exists site_phone_click_sources_day_count
  on public.site_phone_click_sources(day,clicks desc);
alter table public.site_daily_visits enable row level security;
alter table public.site_click_counters enable row level security;
alter table public.site_phone_click_sources enable row level security;
revoke all on public.site_daily_visits from anon,authenticated;
revoke all on public.site_click_counters from anon,authenticated;
revoke all on public.site_phone_click_sources from anon,authenticated;

-- Existing homepage counts continue to work. A visit means one browser session
-- recorded by client JS per Korea-calendar day, not an authenticated unique user.
create or replace function public.site_visit_stats(p_record boolean default false)
returns table(today_visits bigint,total_visits bigint)
language plpgsql security definer set search_path=public
as $$
declare kst_day date := (now() at time zone 'Asia/Seoul')::date;
begin
 if p_record then
  insert into public.site_daily_visits(visit_date,visits)
  values(kst_day,1)
  on conflict(visit_date) do update set visits=site_daily_visits.visits+1;
 end if;
 return query select
  coalesce((select d.visits from public.site_daily_visits d where d.visit_date=kst_day),0)::bigint,
  coalesce((select sum(d.visits) from public.site_daily_visits d),0)::bigint;
end;
$$;

-- Preserve legacy click RPC for clients with an old cached script.
create or replace function public.site_click_stats(p_phone boolean default null)
returns table(total_clicks bigint,today_clicks bigint,today_phone_clicks bigint)
language plpgsql security definer set search_path=public
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
 return query select
  coalesce(sum(c.all_clicks),0)::bigint,
  coalesce(sum(c.all_clicks) filter(where c.day=kst_day),0)::bigint,
  coalesce(sum(c.phone_clicks) filter(where c.day=kst_day),0)::bigint
 from public.site_click_counters c;
end;
$$;

-- Increment the phone-click counter AND its provenance within one transaction.
-- Callers submit only a normalized path and a fixed channel, not raw personal
-- or query-param information. This observes clicks, NOT completed phone calls.
create or replace function public.site_phone_event(p_page text, p_source text)
returns void
language plpgsql security definer set search_path=public
as $$
declare
  kst_day date := (now() at time zone 'Asia/Seoul')::date;
  clean_page text;
  clean_source text;
begin
  clean_page:=left(regexp_replace(coalesce(p_page,''),'[^a-zA-Z0-9가-힣/_%-]','','g'),160);
  if left(clean_page,1)<>'/' or clean_page='' then clean_page:='/'; end if;
  clean_source:=case when p_source in (
    '네이버 검색','구글 검색','다음 검색','카카오톡',
    'SNS','외부사이트','직접 방문','사이트 내부 이동'
  ) then p_source else '외부사이트' end;
  insert into public.site_click_counters(day,all_clicks,phone_clicks)
    values(kst_day,1,1)
  on conflict(day) do update set
    all_clicks=site_click_counters.all_clicks+1,
    phone_clicks=site_click_counters.phone_clicks+1;
  insert into public.site_phone_click_sources(day,source,source_page,clicks)
    values(kst_day,clean_source,clean_page,1)
  on conflict(day,source,source_page) do update
    set clicks=site_phone_click_sources.clicks+1;
end;
$$;

-- Public dashboard returns totals and top aggregate channels/pages only.
create or replace function public.site_traffic_dashboard()
returns table(today_visits bigint,yesterday_visits bigint,today_phone_clicks bigint,total_phone_clicks bigint,phone_sources jsonb)
language sql stable security definer set search_path=public
as $$
 select
  coalesce((select v.visits from public.site_daily_visits v
    where v.visit_date=(now() at time zone 'Asia/Seoul')::date),0)::bigint,
  coalesce((select v.visits from public.site_daily_visits v
    where v.visit_date=(now() at time zone 'Asia/Seoul')::date-1),0)::bigint,
  coalesce((select sum(c.phone_clicks) from public.site_click_counters c
    where c.day=(now() at time zone 'Asia/Seoul')::date),0)::bigint,
  coalesce((select sum(c.phone_clicks) from public.site_click_counters c),0)::bigint,
  coalesce((select jsonb_agg(jsonb_build_object(
    'source',s.source,'page',s.source_page,'clicks',s.clicks
  ) order by s.clicks desc,s.source,s.source_page)
    from (select p.source,p.source_page,p.clicks
      from public.site_phone_click_sources p
      where p.day=(now() at time zone 'Asia/Seoul')::date
      order by p.clicks desc,p.source,p.source_page
      limit 12) s),'[]'::jsonb);
$$;
revoke all on function public.site_visit_stats(boolean) from public;
revoke all on function public.site_click_stats(boolean) from public;
revoke all on function public.site_phone_event(text,text) from public;
revoke all on function public.site_traffic_dashboard() from public;
grant execute on function public.site_visit_stats(boolean) to anon,authenticated;
grant execute on function public.site_click_stats(boolean) to anon,authenticated;
grant execute on function public.site_phone_event(text,text) to anon,authenticated;
grant execute on function public.site_traffic_dashboard() to anon,authenticated;

-- The public RPC is intentionally aggregate-only. Before using as formal
-- business analytics, add edge rate limits and exclude bot-driven traffic.
