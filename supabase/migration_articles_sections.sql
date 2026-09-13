-- Разделение материалов Наследия: от Т.И. (её статьи, публикации, интервью) и от всех остальных (воспоминания, статьи коллег).
-- Безопасно выполнять повторно (if not exists / drop constraint if exists).

-- 1. Принадлежность материала: 'ti' (Татьяна Ивановна) или 'community' (ученики, коллеги, авторы)
alter table public.articles add column if not exists author_type text not null default 'community';

-- Добавляем ограничение на допустимые значения author_type
alter table public.articles drop constraint if exists articles_author_type_check;
alter table public.articles add constraint articles_author_type_check check (author_type in ('ti', 'community'));

-- 2. Расширяем допустимые типы материалов: воспоминание, статья, интервью, публикация, другое
alter table public.articles drop constraint if exists articles_type_check;
alter table public.articles add constraint articles_type_check check (type in ('воспоминание', 'статья', 'интервью', 'публикация', 'другое'));

-- 3. Дополнительные поля для точной атрибуции
alter table public.articles add column if not exists source text; -- Первоисточник (журнал, газета, сборник, ссылка или архив)
alter table public.articles add column if not exists original_year int; -- Год оригинальной публикации / интервью (напр. 1984)
alter table public.articles add column if not exists author_name text; -- Имя автора (для Т.И. - "Татьяна Ивановна Хитрова", для внешних текстов - имя автора)
