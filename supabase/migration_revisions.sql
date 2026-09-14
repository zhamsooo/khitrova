-- =============================================================================
-- Миграция v2: ревизии, история изменений, предложения правок и закрытие прямой записи
-- Файл: supabase/migration_revisions.sql
-- Идемпотентный скрипт: безопасно выполнять повторно
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Закрытие известной уязвимости: удаление политики прямого UPDATE в people
-- -----------------------------------------------------------------------------
drop policy if exists "people: любой залогиненный может редактировать" on public.people;

-- Проверяем, что в people оставлена только модераторская политика на update
drop policy if exists "people: модератор может модерировать" on public.people;
create policy "people: модератор может модерировать" on public.people
  for update using (public.is_moderator());

-- -----------------------------------------------------------------------------
-- 2. Таблица public.revisions (очередь предложений правок и аудит-история)
-- -----------------------------------------------------------------------------
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('event', 'person', 'article')),
  entity_id uuid not null,
  kind text not null check (kind in ('create', 'update', 'moderate')),
  patch jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  author_id uuid not null references auth.users(id),
  author_name text not null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_by_name text,
  reviewed_at timestamptz,
  moderator_note text,
  comment text
);

-- Индексы для быстрой фильтрации по сущности, автору и статусу
create index if not exists idx_revisions_entity on public.revisions (entity_type, entity_id);
create index if not exists idx_revisions_status on public.revisions (status);
create index if not exists idx_revisions_author on public.revisions (author_id);

-- -----------------------------------------------------------------------------
-- 3. RLS-политики для public.revisions
-- -----------------------------------------------------------------------------
alter table public.revisions enable row level security;

-- Вставка: любой авторизованный пользователь от своего имени
drop policy if exists "revisions: создаёт залогиненный" on public.revisions;
create policy "revisions: создаёт залогиненный" on public.revisions
  for insert with check (auth.uid() = author_id);

-- Чтение: автор видит свои ревизии (включая pending)
drop policy if exists "revisions: автор видит свои" on public.revisions;
create policy "revisions: автор видит свои" on public.revisions
  for select using (auth.uid() = author_id);

-- Чтение: модератор видит абсолютно все ревизии
drop policy if exists "revisions: модератор видит все" on public.revisions;
create policy "revisions: модератор видит все" on public.revisions
  for select using (public.is_moderator());

-- Чтение: применённые и отклонённые ревизии (история изменений) доступны для публичного просмотра
drop policy if exists "revisions: применённые видны всем" on public.revisions;
create policy "revisions: применённые видны всем" on public.revisions
  for select using (status in ('applied', 'rejected'));

-- Прямой UPDATE и DELETE запрещены всем (модерация выполняется исключительно через RPC)

grant select on public.revisions to anon, authenticated;
grant insert on public.revisions to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: применение ревизии (только модератор)
-- -----------------------------------------------------------------------------
create or replace function public.apply_revision(revision_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rev record;
  cur_user_id uuid;
  cur_user_name text;
begin
  if not public.is_moderator() then
    raise exception 'Доступ запрещён: требуется роль модератора';
  end if;

  select * into rev from public.revisions where id = revision_id for update;
  if not found then
    raise exception 'Ревизия % не найдена', revision_id;
  end if;
  if rev.status != 'pending' then
    raise exception 'Ревизия уже обработана (текущий статус: %)', rev.status;
  end if;

  cur_user_id := auth.uid();
  select full_name into cur_user_name from public.profiles where id = cur_user_id;
  if cur_user_name is null or cur_user_name = '' then
    cur_user_name := 'Модератор';
  end if;

  -- Применение патча в зависимости от типа сущности (только белый список полей)
  if rev.entity_type = 'event' then
    update public.events set
      event_year = case when rev.patch ? 'event_year' then (rev.patch->>'event_year')::int else event_year end,
      title = case when rev.patch ? 'title' then rev.patch->>'title' else title end,
      description = case when rev.patch ? 'description' then rev.patch->>'description' else description end,
      source = case when rev.patch ? 'source' then rev.patch->>'source' else source end,
      verification_hidden = case when rev.patch ? 'verification_hidden' then (rev.patch->>'verification_hidden')::boolean else verification_hidden end
    where id = rev.entity_id;

    if not found then
      raise exception 'Событие % не найдено', rev.entity_id;
    end if;

  elsif rev.entity_type = 'person' then
    update public.people set
      full_name = case when rev.patch ? 'full_name' then rev.patch->>'full_name' else full_name end,
      relation_type = case when rev.patch ? 'relation_type' then rev.patch->>'relation_type' else relation_type end,
      institution = case when rev.patch ? 'institution' then rev.patch->>'institution' else institution end,
      study_start = case when rev.patch ? 'study_start' then (rev.patch->>'study_start')::int else study_start end,
      study_end = case when rev.patch ? 'study_end' then (rev.patch->>'study_end')::int else study_end end,
      notes = case when rev.patch ? 'notes' then rev.patch->>'notes' else notes end,
      source = case when rev.patch ? 'source' then rev.patch->>'source' else source end,
      gender = case when rev.patch ? 'gender' then rev.patch->>'gender' else gender end,
      avatar_url = case when rev.patch ? 'avatar_url' then rev.patch->>'avatar_url' else avatar_url end,
      studied_choir_school = case when rev.patch ? 'studied_choir_school' then (rev.patch->>'studied_choir_school')::boolean else studied_choir_school end,
      choir_school_start = case when rev.patch ? 'choir_school_start' then (rev.patch->>'choir_school_start')::int else choir_school_start end,
      choir_school_end = case when rev.patch ? 'choir_school_end' then (rev.patch->>'choir_school_end')::int else choir_school_end end,
      studied_conservatory = case when rev.patch ? 'studied_conservatory' then (rev.patch->>'studied_conservatory')::boolean else studied_conservatory end,
      conservatory_start = case when rev.patch ? 'conservatory_start' then (rev.patch->>'conservatory_start')::int else conservatory_start end,
      conservatory_end = case when rev.patch ? 'conservatory_end' then (rev.patch->>'conservatory_end')::int else conservatory_end end,
      studied_assistantship = case when rev.patch ? 'studied_assistantship' then (rev.patch->>'studied_assistantship')::boolean else studied_assistantship end,
      assistantship_start = case when rev.patch ? 'assistantship_start' then (rev.patch->>'assistantship_start')::int else assistantship_start end,
      assistantship_end = case when rev.patch ? 'assistantship_end' then (rev.patch->>'assistantship_end')::int else assistantship_end end,
      updated_by = rev.author_id,
      updated_by_name = rev.author_name,
      updated_at = now()
    where id = rev.entity_id;

    if not found then
      raise exception 'Карточка человека % не найдена', rev.entity_id;
    end if;

  elsif rev.entity_type = 'article' then
    update public.articles set
      title = case when rev.patch ? 'title' then rev.patch->>'title' else title end,
      type = case when rev.patch ? 'type' then rev.patch->>'type' else type end,
      author_type = case when rev.patch ? 'author_type' then rev.patch->>'author_type' else author_type end,
      author_name = case when rev.patch ? 'author_name' then rev.patch->>'author_name' else author_name end,
      source = case when rev.patch ? 'source' then rev.patch->>'source' else source end,
      original_year = case when rev.patch ? 'original_year' then (rev.patch->>'original_year')::int else original_year end,
      content = case when rev.patch ? 'content' then rev.patch->'content' else content end,
      cover_image_url = case when rev.patch ? 'cover_image_url' then rev.patch->>'cover_image_url' else cover_image_url end,
      updated_at = now()
    where id = rev.entity_id;

    if not found then
      raise exception 'Материал % не найден', rev.entity_id;
    end if;

  else
    raise exception 'Неизвестный тип сущности: %', rev.entity_type;
  end if;

  -- Обновление статуса ревизии
  update public.revisions set
    status = 'applied',
    reviewed_by = cur_user_id,
    reviewed_by_name = cur_user_name,
    reviewed_at = now(),
    moderator_note = coalesce(note, moderator_note)
  where id = revision_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. RPC: отклонение ревизии (только модератор)
-- -----------------------------------------------------------------------------
create or replace function public.reject_revision(revision_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rev record;
  cur_user_id uuid;
  cur_user_name text;
begin
  if not public.is_moderator() then
    raise exception 'Доступ запрещён: требуется роль модератора';
  end if;

  select * into rev from public.revisions where id = revision_id for update;
  if not found then
    raise exception 'Ревизия % не найдена', revision_id;
  end if;
  if rev.status != 'pending' then
    raise exception 'Ревизия уже обработана (текущий статус: %)', rev.status;
  end if;

  cur_user_id := auth.uid();
  select full_name into cur_user_name from public.profiles where id = cur_user_id;
  if cur_user_name is null or cur_user_name = '' then
    cur_user_name := 'Модератор';
  end if;

  update public.revisions set
    status = 'rejected',
    moderator_note = note,
    reviewed_by = cur_user_id,
    reviewed_by_name = cur_user_name,
    reviewed_at = now()
  where id = revision_id;
end;
$$;

grant execute on function public.apply_revision(uuid, text) to authenticated;
grant execute on function public.reject_revision(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Триггеры для автоматической записи истории create и moderate
-- -----------------------------------------------------------------------------
create or replace function public.trig_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e_type text;
  uid uuid;
  u_name text;
begin
  if TG_TABLE_NAME = 'events' then
    e_type := 'event';
  elsif TG_TABLE_NAME = 'people' then
    e_type := 'person';
  elsif TG_TABLE_NAME = 'articles' then
    e_type := 'article';
  else
    return null;
  end if;

  -- 6.1. Создание новой записи (kind = 'create')
  if TG_OP = 'INSERT' then
    uid := coalesce(NEW.created_by, auth.uid());
    if uid is null then
      return NEW; -- пакетный импорт без привязки к аккаунту не создаёт ревизию
    end if;

    u_name := coalesce(NEW.created_by_name, (select full_name from public.profiles where id = uid), 'Пользователь');

    insert into public.revisions (
      entity_type,
      entity_id,
      kind,
      patch,
      status,
      author_id,
      author_name,
      created_at
    ) values (
      e_type,
      NEW.id,
      'create',
      to_jsonb(NEW),
      'applied',
      uid,
      u_name,
      coalesce(NEW.created_at, now())
    );
    return NEW;

  -- 6.2. Модерация записи (kind = 'moderate' при смене status на confirmed или rejected)
  elsif TG_OP = 'UPDATE' then
    if OLD.status is distinct from NEW.status and NEW.status in ('confirmed', 'rejected') then
      uid := coalesce(NEW.moderated_by, auth.uid());
      if uid is null then
        return NEW;
      end if;

      u_name := coalesce(NEW.moderated_by_name, (select full_name from public.profiles where id = uid), 'Модератор');

      insert into public.revisions (
        entity_type,
        entity_id,
        kind,
        patch,
        status,
        author_id,
        author_name,
        created_at,
        reviewed_by,
        reviewed_by_name,
        reviewed_at,
        moderator_note
      ) values (
        e_type,
        NEW.id,
        'moderate',
        jsonb_build_object('status', NEW.status, 'note', NEW.moderator_note),
        'applied',
        uid,
        u_name,
        coalesce(NEW.moderated_at, now()),
        uid,
        u_name,
        coalesce(NEW.moderated_at, now()),
        NEW.moderator_note
      );
    end if;
    return NEW;
  end if;

  return null;
end;
$$;

-- Вешаем триггеры на events, people, articles
drop trigger if exists tr_events_record_revision on public.events;
create trigger tr_events_record_revision
  after insert or update of status on public.events
  for each row execute function public.trig_record_revision();

drop trigger if exists tr_people_record_revision on public.people;
create trigger tr_people_record_revision
  after insert or update of status on public.people
  for each row execute function public.trig_record_revision();

drop trigger if exists tr_articles_record_revision on public.articles;
create trigger tr_articles_record_revision
  after insert or update of status on public.articles
  for each row execute function public.trig_record_revision();
