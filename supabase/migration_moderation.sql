-- Модерация событий. Применить в Supabase -> SQL Editor -> вставить целиком -> Run.
-- Безопасно выполнять даже если часть колонок уже была добавлена раньше (везде if not exists).

-- ---------- profiles: признак модератора ----------
alter table public.profiles add column if not exists is_moderator boolean not null default false;

-- ---------- events: кто добавил / кто и как отмодерировал ----------
alter table public.events add column if not exists created_by_name text;
alter table public.events add column if not exists moderated_by uuid references auth.users(id);
alter table public.events add column if not exists moderated_by_name text;
alter table public.events add column if not exists moderated_at timestamptz;
alter table public.events add column if not exists moderator_note text;
alter table public.events add column if not exists verification_hidden boolean not null default false;

-- на случай если раньше уже применялась более ранняя версия миграции с другими именами колонок
alter table public.events drop column if exists confirmed_by;
alter table public.events drop column if exists confirmed_by_name;
alter table public.events drop column if exists confirmed_at;

-- статус: unconfirmed -> confirmed (публикуется) или rejected (отклонено, видно только автору)
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.events'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.events drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.events add constraint events_status_check
  check (status in ('unconfirmed', 'confirmed', 'rejected'));

-- ---------- вспомогательная функция: модератор ли текущий пользователь ----------
create or replace function public.is_moderator()
returns boolean
language sql
stable
as $$
  select coalesce((select is_moderator from public.profiles where id = auth.uid()), false);
$$;

-- ---------- права ----------
grant update on public.events to authenticated;

-- модератор видит все события, включая чужие неподтверждённые (раньше видел только confirmed + свои)
drop policy if exists "events: модератор видит все" on public.events;
create policy "events: модератор видит все" on public.events
  for select using (public.is_moderator());

-- модератор может менять статус (подтвердить/отклонить)
drop policy if exists "events: модератор может подтверждать" on public.events;
drop policy if exists "events: модератор может подтверждать/отклонять" on public.events;
create policy "events: модератор может модерировать" on public.events
  for update using (public.is_moderator());
