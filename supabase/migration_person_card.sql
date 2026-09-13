-- Карточка человека: пол, аватарка, учебные заведения (Хоровое училище / СПбГК), RLS на редактирование и Storage для аватарок.
-- Безопасно выполнять повторно (везде if not exists / drop policy if exists).

-- 1. Новые поля в public.people
alter table public.people add column if not exists gender text check (gender in ('m', 'f'));
alter table public.people add column if not exists avatar_url text;

-- Учебные заведения у Т.И. Хитровой
alter table public.people add column if not exists studied_choir_school boolean not null default false;
alter table public.people add column if not exists choir_school_start int;
alter table public.people add column if not exists choir_school_end int;

alter table public.people add column if not exists studied_conservatory boolean not null default false;
alter table public.people add column if not exists conservatory_start int;
alter table public.people add column if not exists conservatory_end int;

alter table public.people add column if not exists studied_assistantship boolean not null default false;
alter table public.people add column if not exists assistantship_start int;
alter table public.people add column if not exists assistantship_end int;

-- Аудит изменений
alter table public.people add column if not exists updated_by uuid references auth.users(id);
alter table public.people add column if not exists updated_by_name text;
alter table public.people add column if not exists updated_at timestamptz not null default now();

-- 2. Политика RLS: любой авторизованный пользователь может редактировать карточку человека
drop policy if exists "people: любой залогиненный может редактировать" on public.people;
create policy "people: любой залогиненный может редактировать" on public.people
  for update using (auth.role() = 'authenticated');

-- 3. Хранилище (Storage) для аватарок людей
insert into storage.buckets (id, name, public)
values ('person-avatars', 'person-avatars', true)
on conflict (id) do nothing;

drop policy if exists "person-avatars: читают все" on storage.objects;
create policy "person-avatars: читают все" on storage.objects
  for select using (bucket_id = 'person-avatars');

drop policy if exists "person-avatars: загружает залогиненный" on storage.objects;
create policy "person-avatars: загружает залогиненный" on storage.objects
  for insert with check (bucket_id = 'person-avatars' and auth.role() = 'authenticated');

drop policy if exists "person-avatars: обновляет залогиненный" on storage.objects;
create policy "person-avatars: обновляет залогиненный" on storage.objects
  for update using (bucket_id = 'person-avatars' and auth.role() = 'authenticated');

drop policy if exists "person-avatars: удаляет залогиненный" on storage.objects;
create policy "person-avatars: удаляет залогиненный" on storage.objects
  for delete using (bucket_id = 'person-avatars' and auth.role() = 'authenticated');
