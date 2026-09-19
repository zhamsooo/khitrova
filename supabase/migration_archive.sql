-- =============================================================================
-- Миграция: снятие с публикации, архив, возврат и удаление навсегда
-- Файл: supabase/migration_archive.sql
-- Идемпотентный скрипт: безопасно выполнять повторно.
-- Применять вручную: Supabase -> SQL Editor -> вставить целиком -> Run.
-- Порядок: сначала migration_hardening.sql (если ещё не применена), затем этот файл.
--
-- Модель:
--   confirmed --(модератор: снять)--> archived --(модератор: вернуть)--> confirmed
--   archived --(только администратор: удалить навсегда)--> запись стёрта
-- Публично видны только confirmed, поэтому archived скрыт автоматически (RLS не менялась).
-- Автор может предложить снятие своей записи: ревизия с патчем {"_archive": true},
-- модератор применяет её так же, как любую правку.
-- =============================================================================

-- ---------- 1. Допустимые статусы: добавляем 'archived' ----------
do $$
declare
  t text;
  con record;
begin
  foreach t in array array['events', 'people', 'articles'] loop
    for con in
      select conname from pg_constraint
      where conrelid = format('public.%I', t)::regclass and contype = 'c'
        and pg_get_constraintdef(oid) like '%status%'
    loop
      execute format('alter table public.%I drop constraint %I', t, con.conname);
    end loop;
  end loop;
end $$;

alter table public.events add constraint events_status_check
  check (status in ('unconfirmed', 'confirmed', 'rejected', 'archived'));
alter table public.people add constraint people_status_check
  check (status in ('unconfirmed', 'confirmed', 'rejected', 'archived'));
alter table public.articles add constraint articles_status_check
  check (status in ('draft', 'unconfirmed', 'confirmed', 'rejected', 'archived'));

-- ---------- 2. Внутренняя функция снятия (вызывается из RPC и из apply_revision) ----------
create or replace function public._archive_entry(p_type text, p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  select full_name into uname from public.profiles where id = auth.uid();
  uname := coalesce(nullif(uname, ''), 'Модератор');

  if p_type = 'event' then
    update public.events set status = 'archived', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = p_note
    where id = p_id and status = 'confirmed';
  elsif p_type = 'person' then
    update public.people set status = 'archived', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = p_note
    where id = p_id and status = 'confirmed';
  elsif p_type = 'article' then
    update public.articles set status = 'archived', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = p_note
    where id = p_id and status = 'confirmed';
  else
    raise exception 'Неизвестный тип записи: %', p_type;
  end if;

  if not found then
    raise exception 'Запись не найдена или уже не опубликована';
  end if;
end;
$$;

revoke all on function public._archive_entry(text, uuid, text) from public;

-- ---------- 3. RPC для модератора: снять с публикации ----------
create or replace function public.archive_entry(p_type text, p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Доступ запрещён: требуется роль модератора';
  end if;
  perform public._archive_entry(p_type, p_id, nullif(btrim(p_note), ''));
end;
$$;

revoke all on function public.archive_entry(text, uuid, text) from public;
grant execute on function public.archive_entry(text, uuid, text) to authenticated;

-- ---------- 4. RPC для модератора: вернуть из архива ----------
create or replace function public.restore_entry(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  if not public.is_moderator() then
    raise exception 'Доступ запрещён: требуется роль модератора';
  end if;
  select full_name into uname from public.profiles where id = auth.uid();
  uname := coalesce(nullif(uname, ''), 'Модератор');

  if p_type = 'event' then
    update public.events set status = 'confirmed', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = null where id = p_id and status = 'archived';
  elsif p_type = 'person' then
    update public.people set status = 'confirmed', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = null where id = p_id and status = 'archived';
  elsif p_type = 'article' then
    update public.articles set status = 'confirmed', moderated_by = auth.uid(), moderated_by_name = uname,
      moderated_at = now(), moderator_note = null where id = p_id and status = 'archived';
  else
    raise exception 'Неизвестный тип записи: %', p_type;
  end if;

  if not found then
    raise exception 'Запись не найдена в архиве';
  end if;
end;
$$;

revoke all on function public.restore_entry(text, uuid) from public;
grant execute on function public.restore_entry(text, uuid) to authenticated;

-- ---------- 5. RPC для администратора: удалить навсегда (только из архива) ----------
create or replace function public.delete_entry_forever(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Доступ запрещён: удалять навсегда может только администратор';
  end if;

  if p_type = 'event' then
    delete from public.events where id = p_id and status = 'archived';
  elsif p_type = 'person' then
    -- карточка может быть привязана к профилю участника: отвязываем, иначе внешний ключ не даст удалить
    update public.profiles set person_id = null
      where person_id = p_id and exists (select 1 from public.people where id = p_id and status = 'archived');
    delete from public.people where id = p_id and status = 'archived';
  elsif p_type = 'article' then
    delete from public.articles where id = p_id and status = 'archived';
  else
    raise exception 'Неизвестный тип записи: %', p_type;
  end if;

  if not found then
    raise exception 'Запись не найдена в архиве';
  end if;

  -- вместе с записью стираем её историю (в снимках лежит копия содержимого)
  delete from public.revisions where entity_type = p_type and entity_id = p_id;
end;
$$;

revoke all on function public.delete_entry_forever(text, uuid) from public;
grant execute on function public.delete_entry_forever(text, uuid) to authenticated;

-- ---------- 6. История: смена статуса на archived тоже попадает в ревизии ----------
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
    if OLD.status is distinct from NEW.status and NEW.status in ('confirmed', 'rejected', 'archived') then
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


-- ---------- 7. apply_revision: понимает предложения снять с публикации ----------
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

  -- Предложение снять с публикации: патч {"_archive": true, "reason": "..."}
  if rev.patch ? '_archive' then
    perform public._archive_entry(rev.entity_type, rev.entity_id, coalesce(note, rev.patch->>'reason'));
    update public.revisions set
      status = 'applied',
      reviewed_by = cur_user_id,
      reviewed_by_name = cur_user_name,
      reviewed_at = now(),
      moderator_note = coalesce(note, moderator_note)
    where id = revision_id;
    return;
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

-- ---------- 8. Письма ----------
-- Автору: его опубликованную запись сняли
create or replace function public.trg_notify_author_archived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_email text;
  title text;
begin
  select u.email into author_email from auth.users u where u.id = new.created_by;
  if author_email is null then
    return new;
  end if;

  if TG_TABLE_NAME = 'events' then
    title := new.title;
  elsif TG_TABLE_NAME = 'people' then
    title := new.full_name;
  elsif TG_TABLE_NAME = 'articles' then
    title := new.title;
  end if;

  perform public.notify_email(
    author_email,
    'Ваша запись снята с публикации: сайт памяти Т.И. Хитровой',
    format('Ваша запись «%s» снята с публикации. Причина: %s', coalesce(title, 'без названия'), coalesce(new.moderator_note, 'не указана'))
  );
  return new;
end;
$$;

drop trigger if exists trg_events_notify_archived on public.events;
create trigger trg_events_notify_archived
after update of status on public.events
for each row when (old.status = 'confirmed' and new.status = 'archived')
execute function public.trg_notify_author_archived();

drop trigger if exists trg_people_notify_archived on public.people;
create trigger trg_people_notify_archived
after update of status on public.people
for each row when (old.status = 'confirmed' and new.status = 'archived')
execute function public.trg_notify_author_archived();

drop trigger if exists trg_articles_notify_archived on public.articles;
create trigger trg_articles_notify_archived
after update of status on public.articles
for each row when (old.status = 'confirmed' and new.status = 'archived')
execute function public.trg_notify_author_archived();

-- Автору правки: запрос на снятие обработан. Формулировка отличается от обычной правки.
create or replace function public.trg_notify_author_revision_moderated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_email text;
  subject text;
  body text;
  url text := public.site_base_url();
  entity_label text;
  is_removal boolean := (new.patch ? '_archive');
begin
  select u.email into author_email from auth.users u where u.id = new.author_id;
  if author_email is null then
    return new;
  end if;

  entity_label := case new.entity_type
    when 'event' then 'событию'
    when 'person' then 'человеку'
    when 'article' then 'материалу'
    else new.entity_type
  end;

  if new.status = 'applied' and is_removal then
    subject := 'Запись снята с публикации: сайт памяти Т.И. Хитровой';
    body := format('По вашей просьбе запись (%s) снята с публикации.', entity_label);
  elsif new.status = 'rejected' and is_removal then
    subject := 'Запись оставлена: сайт памяти Т.И. Хитровой';
    body := format('Просьба снять запись (%s) с публикации не выполнена. Заметка модератора: %s', entity_label, coalesce(new.moderator_note, 'не указана'));
  elsif new.status = 'applied' then
    subject := 'Ваша правка опубликована: сайт памяти Т.И. Хитровой';
    body := format('Ваша правка к записи (%s) применена.<br>Открыть: <a href="%s/moderation.html">%s/moderation.html</a>', entity_label, url, url);
  elsif new.status = 'rejected' then
    subject := 'Ваша правка отклонена: сайт памяти Т.И. Хитровой';
    body := format('Ваша правка к записи (%s) отклонена. Заметка модератора: %s', entity_label, coalesce(new.moderator_note, 'не указана'));
  else
    return new;
  end if;

  perform public.notify_email(author_email, subject, body);
  return new;
end;
$$;
