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

-- ============================================================================
-- W4: роль администратора — назначение модераторов на сайте
-- ============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Владельца назначает администратором Claude одним SQL при применении миграции:
-- update public.profiles set is_admin = true, is_moderator = true where id = '<uuid владельца>';
-- (см. отчёт — нужен email/id владельца, чтобы подставить сюда).

-- Ставит/снимает is_moderator участнику. Вызывать может только администратор;
-- снять модератора с самого себя через эту функцию нельзя.
create or replace function public.set_moderator(target uuid, flag boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  select is_admin into caller_is_admin from public.profiles where id = auth.uid();
  if not coalesce(caller_is_admin, false) then
    raise exception 'Доступ запрещён: требуется роль администратора';
  end if;
  if target = auth.uid() and flag = false then
    raise exception 'Нельзя снять модератора с самого себя';
  end if;
  update public.profiles set is_moderator = flag where id = target;
end;
$$;

revoke all on function public.set_moderator(uuid, boolean) from public;
grant execute on function public.set_moderator(uuid, boolean) to authenticated;

-- Список участников для вкладки «Участники» (только для администратора).
-- Почту отдаём — админ и так владелец проекта; больше никому.
create or replace function public.list_members()
returns table (
  id uuid,
  full_name text,
  relation_type text,
  study_end int,
  is_moderator boolean,
  is_admin boolean,
  created_at timestamptz,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Доступ запрещён: требуется роль администратора';
  end if;
  return query
    select p.id, p.full_name, p.relation_type, p.study_end, p.is_moderator, p.is_admin, p.created_at, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.full_name;
end;
$$;

revoke all on function public.list_members() from public;
grant execute on function public.list_members() to authenticated;

-- ============================================================================
-- W5: обратная связь — письма автору и модераторам (волна 1)
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- Адрес сайта в одном месте: пока custom-домен khitrova.org не привязан к хостингу,
-- ссылки в письмах ведут на текущий рабочий адрес. Когда домен подключат — поменять
-- только эту функцию.
create or replace function public.site_base_url()
returns text
language sql
immutable
as $$
  select 'https://khitrova.zhamsx.workers.dev'::text;
$$;

-- Отправка одного письма через Resend. Ключ читается из Supabase Vault (секрет
-- resend_api_key), в коде и в репозитории его нет. Ошибки отправки (нет ключа,
-- сеть недоступна, Resend вернул ошибку) не должны ломать основную операцию —
-- поэтому вся логика обёрнута в exception-блок, который проглатывает любую ошибку.
create or replace function public.notify_email(to_email text, subject text, html text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  api_key text;
begin
  if to_email is null or to_email = '' then
    return;
  end if;
  begin
    select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key';
    if api_key is null or api_key = '' then
      return;
    end if;
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || api_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'post@khitrova.org',
        'to', to_email,
        'subject', subject,
        'html', html
      )
    );
  exception when others then
    null; -- письмо не критично для основной операции — просто не отправилось
  end;
end;
$$;

revoke all on function public.notify_email(text, text, text) from public;

-- Письмо всем модераторам разом (по одному вызову notify_email на адрес).
create or replace function public.notify_moderators(subject text, html text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.is_moderator = true and u.email is not null
  loop
    perform public.notify_email(rec.email, subject, html);
  end loop;
end;
$$;

revoke all on function public.notify_moderators(text, text) from public;

-- ---- Новая запись на проверку (события, люди, материалы) → письмо модераторам ----
create or replace function public.trg_notify_new_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_label text;
  title text;
  author_name text;
  url text := public.site_base_url();
begin
  if TG_TABLE_NAME = 'events' then
    entity_label := 'событие'; title := new.title; author_name := new.created_by_name;
  elsif TG_TABLE_NAME = 'people' then
    entity_label := 'человек'; title := new.full_name; author_name := new.created_by_name;
  elsif TG_TABLE_NAME = 'articles' then
    entity_label := 'материал'; title := new.title; author_name := new.created_by_name;
  end if;

  perform public.notify_moderators(
    'Новая запись на проверку — сайт памяти Т.И. Хитровой',
    format(
      'Новая запись на проверку: %s «%s» от %s.<br>Открыть: <a href="%s/moderation.html">%s/moderation.html</a>',
      entity_label, coalesce(title, 'без названия'), coalesce(nullif(author_name, ''), 'неизвестно'), url, url
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_events_notify_new on public.events;
create trigger trg_events_notify_new
after insert on public.events
for each row when (new.status = 'unconfirmed')
execute function public.trg_notify_new_entry();

drop trigger if exists trg_people_notify_new on public.people;
create trigger trg_people_notify_new
after insert on public.people
for each row when (new.status = 'unconfirmed')
execute function public.trg_notify_new_entry();

-- Статьи создаются всегда черновиком (status='draft'), поэтому переход в очередь
-- модерации — это UPDATE (draft/rejected → unconfirmed), а не INSERT; но на случай
-- прямой вставки со статусом unconfirmed добавлен и insert-триггер.
drop trigger if exists trg_articles_notify_new_insert on public.articles;
create trigger trg_articles_notify_new_insert
after insert on public.articles
for each row when (new.status = 'unconfirmed')
execute function public.trg_notify_new_entry();

drop trigger if exists trg_articles_notify_new_submit on public.articles;
create trigger trg_articles_notify_new_submit
after update of status on public.articles
for each row when (new.status = 'unconfirmed' and old.status is distinct from 'unconfirmed')
execute function public.trg_notify_new_entry();

-- ---- Новая правка на проверку (revisions) → письмо модераторам ----
create or replace function public.trg_notify_new_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  url text := public.site_base_url();
  entity_label text;
begin
  entity_label := case new.entity_type
    when 'event' then 'событию'
    when 'person' then 'человеку'
    when 'article' then 'материалу'
    else new.entity_type
  end;

  perform public.notify_moderators(
    'Новая правка на проверку — сайт памяти Т.И. Хитровой',
    format(
      'Новая правка к записи (%s) от %s.<br>Комментарий: %s<br>Открыть: <a href="%s/moderation.html">%s/moderation.html</a>',
      entity_label, coalesce(nullif(new.author_name, ''), 'неизвестно'), coalesce(new.comment, '—'), url, url
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_revisions_notify_new on public.revisions;
create trigger trg_revisions_notify_new
after insert on public.revisions
for each row when (new.status = 'pending')
execute function public.trg_notify_new_revision();

-- ---- Запись подтверждена/отклонена → письмо автору ----
create or replace function public.trg_notify_author_moderated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_email text;
  title text;
  subject text;
  body text;
  entity_link text;
  url text := public.site_base_url();
begin
  select u.email into author_email from auth.users u where u.id = new.created_by;
  if author_email is null then
    return new;
  end if;

  if TG_TABLE_NAME = 'events' then
    title := new.title; entity_link := url || '/index.html';
  elsif TG_TABLE_NAME = 'people' then
    title := new.full_name; entity_link := url || '/person.html?id=' || new.id;
  elsif TG_TABLE_NAME = 'articles' then
    title := new.title; entity_link := url || '/nasledie.html#read/' || new.id;
  end if;

  if new.status = 'confirmed' then
    subject := 'Ваша запись опубликована — сайт памяти Т.И. Хитровой';
    body := format('Ваша запись «%s» опубликована.<br>Открыть: <a href="%s">%s</a>', coalesce(title, 'без названия'), entity_link, entity_link);
  elsif new.status = 'rejected' then
    subject := 'Ваша запись отклонена — сайт памяти Т.И. Хитровой';
    body := format('Ваша запись «%s» отклонена. Заметка модератора: %s', coalesce(title, 'без названия'), coalesce(new.moderator_note, '—'));
  else
    return new;
  end if;

  perform public.notify_email(author_email, subject, body);
  return new;
end;
$$;

drop trigger if exists trg_events_notify_author on public.events;
create trigger trg_events_notify_author
after update of status on public.events
for each row when (old.status = 'unconfirmed' and new.status in ('confirmed', 'rejected'))
execute function public.trg_notify_author_moderated();

drop trigger if exists trg_people_notify_author on public.people;
create trigger trg_people_notify_author
after update of status on public.people
for each row when (old.status = 'unconfirmed' and new.status in ('confirmed', 'rejected'))
execute function public.trg_notify_author_moderated();

drop trigger if exists trg_articles_notify_author on public.articles;
create trigger trg_articles_notify_author
after update of status on public.articles
for each row when (old.status = 'unconfirmed' and new.status in ('confirmed', 'rejected'))
execute function public.trg_notify_author_moderated();

-- ---- Правка применена/отклонена → письмо автору правки ----
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

  if new.status = 'applied' then
    subject := 'Ваша правка опубликована — сайт памяти Т.И. Хитровой';
    body := format('Ваша правка к записи (%s) применена.<br>Открыть: <a href="%s/moderation.html">%s/moderation.html</a>', entity_label, url, url);
  elsif new.status = 'rejected' then
    subject := 'Ваша правка отклонена — сайт памяти Т.И. Хитровой';
    body := format('Ваша правка к записи (%s) отклонена. Заметка модератора: %s', entity_label, coalesce(new.moderator_note, '—'));
  else
    return new;
  end if;

  perform public.notify_email(author_email, subject, body);
  return new;
end;
$$;

drop trigger if exists trg_revisions_notify_author on public.revisions;
create trigger trg_revisions_notify_author
after update of status on public.revisions
for each row when (old.status = 'pending' and new.status in ('applied', 'rejected'))
execute function public.trg_notify_author_revision_moderated();
