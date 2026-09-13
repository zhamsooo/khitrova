-- Раздел "Люди" — ученики, коллеги, все, кто был знаком с Т.И. Хитровой.
-- Применить в Supabase -> SQL Editor -> вставить целиком -> Run.
-- Безопасно выполнять повторно (везде if not exists / drop policy if exists).

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  relation_type text not null check (relation_type in ('ученик', 'коллега', 'другое')),
  institution text, -- место работы / должность, свободный текст
  study_start int,
  study_end int,
  notes text, -- достижения, звания, что угодно ещё
  status text not null default 'unconfirmed' check (status in ('unconfirmed', 'confirmed', 'rejected')),
  created_by uuid references auth.users(id),
  created_by_name text,
  moderated_by uuid references auth.users(id),
  moderated_by_name text,
  moderated_at timestamptz,
  moderator_note text,
  source text, -- необязательно: не у каждого факта есть источник
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

drop policy if exists "people: подтверждённые видны всем, свои — автору" on public.people;
create policy "people: подтверждённые видны всем, свои — автору" on public.people
  for select using (status = 'confirmed' or created_by = auth.uid());

drop policy if exists "people: модератор видит все" on public.people;
create policy "people: модератор видит все" on public.people
  for select using (public.is_moderator());

drop policy if exists "people: создаёт залогиненный" on public.people;
create policy "people: создаёт залогиненный" on public.people
  for insert with check (auth.uid() = created_by);

drop policy if exists "people: модератор может модерировать" on public.people;
create policy "people: модератор может модерировать" on public.people
  for update using (public.is_moderator());

grant select, insert on public.people to anon, authenticated;
grant update on public.people to authenticated;
