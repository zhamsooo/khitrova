-- Источник и автор обязательны для любого факта на сайте — не опционально.
-- Применить в Supabase -> SQL Editor -> вставить целиком -> Run.
-- Бэкфилл идёт первым, поэтому безопасно выполнять даже если в базе уже есть старые записи без source.

update public.events set source = 'источник не указан (запись до введения обязательного поля)'
  where source is null;

update public.events set created_by_name = 'неизвестно'
  where created_by_name is null;

alter table public.events alter column source set not null;
alter table public.events alter column created_by_name set not null;
