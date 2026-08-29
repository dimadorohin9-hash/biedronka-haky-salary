-- Biedronka HAKY Salary v0.5.0
-- Выполни этот файл один раз в Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  p01 numeric not null default 0.1908,
  p02 numeric not null default 0.1595,
  p03 numeric not null default 0.1330,
  p21 numeric not null default 0.1867,
  p28 numeric not null default 0.1631,
  hourly_rate numeric not null default 33.66,
  housing_bonus numeric not null default 2.00,
  salary_goal numeric not null default 7000,
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_date date not null,
  hours numeric not null default 0 check (hours >= 0),
  departments jsonb not null default '[]'::jsonb,
  comment text,
  rates_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
alter table public.shifts enable row level security;

drop policy if exists "users manage own settings" on public.user_settings;
create policy "users manage own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own shifts" on public.shifts;
create policy "users manage own shifts"
on public.shifts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.create_default_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_default_settings();

-- Для уже существующего пользователя настройки создадутся после первого сохранения
-- или можно выполнить:
-- insert into public.user_settings(user_id) values ('USER_UUID') on conflict do nothing;
