-- Run in Supabase SQL editor after reviewing existing ride_history schema.
create table if not exists public.site_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.site_admins enable row level security;
create policy "admins can read own membership" on public.site_admins for select to authenticated using (user_id=auth.uid());
-- Admin must be assigned by trusted Supabase SQL editor, not from public client.
-- INSERT INTO public.site_admins(user_id) VALUES ('YOUR_AUTH_USER_UUID');
-- Verify existing ride_history RLS and insert policy before enabling import.
