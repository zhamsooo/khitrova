-- Миграция к брифу docs/brief-front-v4.md.
-- Идемпотентная (можно применять повторно). НЕ применялась к базе — применяет
-- Claude через MCP после того, как файл будет готов целиком (после задачи F4).

-- F2: своя карточка пользователя — связь профиля с записью в people.
alter table public.profiles
  add column if not exists person_id uuid references public.people(id);
