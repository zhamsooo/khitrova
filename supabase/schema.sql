-- Схема БД для сайта памяти Т.И. Хитровой
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить целиком -> Run

create extension if not exists pgcrypto;

-- Профиль человека, дополняющий встроенную auth.users (email/пароль там же)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  relation_type text not null check (relation_type in ('ученик', 'коллега', 'другое')),
  study_end int,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profile: читает только владелец" on public.profiles
  for select using (auth.uid() = id);

create policy "profile: создаёт только владелец" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profile: обновляет только владелец" on public.profiles
  for update using (auth.uid() = id);

-- События таймлайна. status: unconfirmed (по умолчанию) -> confirmed (модерация вручную в Table Editor)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_year int not null,
  title text not null,
  description text,
  status text not null default 'unconfirmed' check (status in ('unconfirmed', 'confirmed')),
  created_by uuid references auth.users(id),
  source text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events: подтверждённые видны всем, свои черновики — автору" on public.events
  for select using (status = 'confirmed' or created_by = auth.uid());

create policy "events: добавлять может любой залогиненный" on public.events
  for insert with check (auth.uid() = created_by);
