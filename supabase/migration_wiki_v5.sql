-- Миграция к брифу docs/brief-wiki-v5.md.
-- Идемпотентная (можно применять повторно). НЕ применялась к базе — применяет
-- Claude через MCP, когда файл будет готов целиком (после задачи W5).
--
-- Функция apply_revision определена здесь в окончательном виде (правится и в
-- migration_front_v4.sql для F4, и здесь для W2 — актуальная версия именно тут).

-- ============================================================================
-- W2: фамилия/имя/отчество, годы начала учёбы
-- ============================================================================

alter table public.people
  add column if not exists last_name text,
  add column if not exists first_name text,
  add column if not exists patronymic text;

-- Если фронт прислал части имени — full_name собирает триггер (перезаписывает
-- тем же значением, которое клиент и так посчитал сам, чтобы not null не мешал
-- вставке до срабатывания триггера). Старые записи без last_name не трогаются.
create or replace function public.people_set_full_name()
returns trigger
language plpgsql
as $$
begin
  if new.last_name is not null and new.last_name <> '' then
    new.full_name := trim(concat_ws(' ', new.last_name, new.first_name, new.patronymic));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_people_set_full_name on public.people;
create trigger trg_people_set_full_name
before insert or update on public.people
for each row execute function public.people_set_full_name();

-- apply_revision: копия целиком из migration_front_v4.sql (F4-версия с notable),
-- ветка person дополнена last_name/first_name/patronymic.
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
      last_name = case when rev.patch ? 'last_name' then rev.patch->>'last_name' else last_name end,
      first_name = case when rev.patch ? 'first_name' then rev.patch->>'first_name' else first_name end,
      patronymic = case when rev.patch ? 'patronymic' then rev.patch->>'patronymic' else patronymic end,
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
      notable = case when rev.patch ? 'notable' then (rev.patch->>'notable')::boolean else notable end,
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

-- ============================================================================
-- W3: автор удаляет свой черновик статьи (черновик или отклонённую)
-- ============================================================================

drop policy if exists "articles: автор удаляет свой черновик" on public.articles;
create policy "articles: автор удаляет свой черновик" on public.articles
  for delete using (created_by = auth.uid() and status in ('draft', 'rejected'));
