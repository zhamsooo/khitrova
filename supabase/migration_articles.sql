-- Статьи/воспоминания в разделе "Наследие". Применить в Supabase -> SQL Editor -> вставить целиком -> Run.
-- Безопасно выполнять повторно (везде if not exists / on conflict do nothing).

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('воспоминание', 'статья', 'другое')),
  title text not null default '',
  content jsonb not null default '{}'::jsonb, -- вывод Editor.js целиком
  cover_image_url text,
  -- draft: видит только автор, черновик, автосохраняется
  -- unconfirmed: автор отправил на публикацию, ждёт модератора
  -- confirmed: опубликовано, видно всем
  -- rejected: отклонено модератором, видно только автору
  status text not null default 'draft' check (status in ('draft', 'unconfirmed', 'confirmed', 'rejected')),
  created_by uuid references auth.users(id),
  created_by_name text,
  moderated_by uuid references auth.users(id),
  moderated_by_name text,
  moderated_at timestamptz,
  moderator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

drop policy if exists "articles: подтверждённые видны всем, свои — автору" on public.articles;
create policy "articles: подтверждённые видны всем, свои — автору" on public.articles
  for select using (status = 'confirmed' or created_by = auth.uid());

drop policy if exists "articles: модератор видит все" on public.articles;
create policy "articles: модератор видит все" on public.articles
  for select using (public.is_moderator());

drop policy if exists "articles: создаёт залогиненный" on public.articles;
create policy "articles: создаёт залогиненный" on public.articles
  for insert with check (auth.uid() = created_by);

drop policy if exists "articles: автор редактирует свой черновик" on public.articles;
create policy "articles: автор редактирует свой черновик" on public.articles
  for update using (created_by = auth.uid() and status in ('draft', 'unconfirmed', 'rejected'));

drop policy if exists "articles: модератор может модерировать" on public.articles;
create policy "articles: модератор может модерировать" on public.articles
  for update using (public.is_moderator());

grant select, insert on public.articles to anon, authenticated;
grant update on public.articles to authenticated;

-- Хранилище для фото в статьях
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "article-images: читают все" on storage.objects;
create policy "article-images: читают все" on storage.objects
  for select using (bucket_id = 'article-images');

drop policy if exists "article-images: загружает залогиненный" on storage.objects;
create policy "article-images: загружает залогиненный" on storage.objects
  for insert with check (bucket_id = 'article-images' and auth.role() = 'authenticated');
