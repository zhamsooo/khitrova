-- Однокурсники и одноклассники самой Т.И.: два новых типа связи.
--   однокурсник   — учился с Т.И. в консерватории
--   одноклассник  — учился с Т.И. в музучилище им. Римского-Корсакова
-- Годы учёбы хранятся в study_start / study_end, новых колонок не нужно.
alter table public.people   drop constraint if exists people_relation_type_check;
alter table public.people   add  constraint people_relation_type_check
  check (relation_type in ('ученик', 'коллега', 'однокурсник', 'одноклассник', 'другое'));

alter table public.profiles drop constraint if exists profiles_relation_type_check;
alter table public.profiles add  constraint profiles_relation_type_check
  check (relation_type in ('ученик', 'коллега', 'однокурсник', 'одноклассник', 'другое'));
