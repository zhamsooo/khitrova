-- =============================================================================
-- Миграция: закрытие обхода модерации при создании записей
-- Файл: supabase/migration_hardening.sql
-- Идемпотентный скрипт: безопасно выполнять повторно.
-- Применять вручную: Supabase -> SQL Editor -> вставить целиком -> Run.
--
-- Проблема: политики INSERT в events/people/articles проверяют только
-- auth.uid() = created_by и не смотрят на status. Любой залогиненный, вызвав API
-- напрямую (минуя форму сайта), мог создать запись со status = 'confirmed' —
-- она публиковалась бы без модерации. Форма сайта так не делает, но защита
-- должна быть в базе, а не в форме.
--
-- Решение: BEFORE INSERT триггер. Для обычного пользователя принудительно
-- ставит status = 'unconfirmed' (у статей допускается 'draft') и стирает
-- поля модерации. Не трогает: модераторов и запросы без auth.uid()
-- (SQL Editor, разовые импорты).
-- =============================================================================

create or replace function public.trg_force_pending_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_moderator() then
    return NEW;
  end if;

  if TG_TABLE_NAME = 'articles' and NEW.status = 'draft' then
    null; -- черновик статьи разрешён, публикуется только через модерацию
  else
    NEW.status := 'unconfirmed';
  end if;

  NEW.moderated_by := null;
  NEW.moderated_by_name := null;
  NEW.moderated_at := null;
  NEW.moderator_note := null;
  return NEW;
end;
$$;

drop trigger if exists trg_events_force_pending on public.events;
create trigger trg_events_force_pending
  before insert on public.events
  for each row execute function public.trg_force_pending_status();

drop trigger if exists trg_people_force_pending on public.people;
create trigger trg_people_force_pending
  before insert on public.people
  for each row execute function public.trg_force_pending_status();

drop trigger if exists trg_articles_force_pending on public.articles;
create trigger trg_articles_force_pending
  before insert on public.articles
  for each row execute function public.trg_force_pending_status();
