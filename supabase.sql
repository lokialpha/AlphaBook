-- AlphaBook v1 schema + RLS policies
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Profiles table (public-facing user info)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile row on auth user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  total_chapters int not null check (total_chapters >= 1),
  total_pages int not null check (total_pages >= 1),
  chapter_list jsonb,
  cover_url text,
  created_at timestamptz not null default now()
);

-- Sessions (public only in v1)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  created_by uuid not null default auth.uid() references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Session members
create table if not exists public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

-- Auto-add session creator as member
create or replace function public.handle_new_session_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.session_members (session_id, user_id)
  values (new.id, new.created_by)
  on conflict (session_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_session_created on public.sessions;
create trigger on_session_created
  after insert on public.sessions
  for each row execute function public.handle_new_session_membership();

-- Progress updates
create table if not exists public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_number int not null check (chapter_number >= 1),
  page_number int not null check (page_number >= 1),
  created_at timestamptz not null default now()
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Session documents (PDF uploads)
create table if not exists public.session_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  created_at timestamptz not null default now()
);

-- Reactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);

-- Indexes
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);
create index if not exists session_members_session_idx on public.session_members (session_id);
create index if not exists session_members_user_idx on public.session_members (user_id);
create index if not exists progress_updates_session_idx on public.progress_updates (session_id, created_at desc);
create index if not exists comments_session_idx on public.comments (session_id, created_at);
create index if not exists session_documents_session_idx
  on public.session_documents (session_id, created_at desc);
create index if not exists reactions_comment_idx on public.reactions (comment_id);

-- RLS
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.progress_updates enable row level security;
alter table public.comments enable row level security;
alter table public.session_documents enable row level security;
alter table public.reactions enable row level security;

-- Users policies
drop policy if exists "Users can read profiles" on public.users;
create policy "Users can read profiles"
  on public.users for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Books policies
drop policy if exists "Books readable by authenticated" on public.books;
create policy "Books readable by authenticated"
  on public.books for select
  to authenticated
  using (true);

drop policy if exists "Books insertable by authenticated" on public.books;
create policy "Books insertable by authenticated"
  on public.books for insert
  to authenticated
  with check (true);

-- Sessions policies
drop policy if exists "Sessions readable by authenticated" on public.sessions;
create policy "Sessions readable by authenticated"
  on public.sessions for select
  to authenticated
  using (true);

drop policy if exists "Sessions insertable by authenticated" on public.sessions;
create policy "Sessions insertable by authenticated"
  on public.sessions for insert
  to authenticated
  with check (created_by = auth.uid());

-- Session members policies
drop policy if exists "Members readable by authenticated" on public.session_members;
create policy "Members readable by authenticated"
  on public.session_members for select
  to authenticated
  using (true);

drop policy if exists "Members can join sessions" on public.session_members;
create policy "Members can join sessions"
  on public.session_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Members can leave sessions" on public.session_members;
create policy "Members can leave sessions"
  on public.session_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Progress policies
drop policy if exists "Progress readable by authenticated" on public.progress_updates;
create policy "Progress readable by authenticated"
  on public.progress_updates for select
  to authenticated
  using (true);

drop policy if exists "Progress insertable by authenticated" on public.progress_updates;
create policy "Progress insertable by authenticated"
  on public.progress_updates for insert
  to authenticated
  with check (user_id = auth.uid());

-- Comments policies
drop policy if exists "Comments readable by authenticated" on public.comments;
create policy "Comments readable by authenticated"
  on public.comments for select
  to authenticated
  using (true);

drop policy if exists "Comments insertable by authenticated" on public.comments;
create policy "Comments insertable by authenticated"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

do $$
declare
  comment_delete_policy text;
begin
  for comment_delete_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and cmd = 'DELETE'
  loop
    execute format('drop policy if exists %I on public.comments', comment_delete_policy);
  end loop;
end
$$;

create policy "Comments deletable by owner"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());

-- Session document policies
drop policy if exists "Session documents readable by authenticated" on public.session_documents;
create policy "Session documents readable by authenticated"
  on public.session_documents for select
  to authenticated
  using (true);

drop policy if exists "Session documents insertable by authenticated" on public.session_documents;
create policy "Session documents insertable by authenticated"
  on public.session_documents for insert
  to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "Session documents deletable by owner" on public.session_documents;
create policy "Session documents deletable by owner"
  on public.session_documents for delete
  to authenticated
  using (uploaded_by = auth.uid());

-- Reactions policies
drop policy if exists "Reactions readable by authenticated" on public.reactions;
create policy "Reactions readable by authenticated"
  on public.reactions for select
  to authenticated
  using (true);

drop policy if exists "Reactions insertable by authenticated" on public.reactions;
create policy "Reactions insertable by authenticated"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Storage bucket + policies for session PDF uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'session-pdfs', 'session-pdfs', true, 20971520, array['application/pdf']
where not exists (
  select 1 from storage.buckets where id = 'session-pdfs'
);

drop policy if exists "Session PDFs readable by authenticated" on storage.objects;
create policy "Session PDFs readable by authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'session-pdfs');

drop policy if exists "Session PDFs insertable by authenticated" on storage.objects;
create policy "Session PDFs insertable by authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'session-pdfs');

drop policy if exists "Session PDFs updatable by owner" on storage.objects;
create policy "Session PDFs updatable by owner"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'session-pdfs' and owner = auth.uid())
  with check (bucket_id = 'session-pdfs' and owner = auth.uid());

drop policy if exists "Session PDFs deletable by owner" on storage.objects;
create policy "Session PDFs deletable by owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'session-pdfs' and owner = auth.uid());

-- Backfill profiles for existing auth users (safe to re-run)
insert into public.users (id, display_name, avatar_url)
select id,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- Optional: enable realtime on key tables
-- alter publication supabase_realtime add table public.comments;
-- alter publication supabase_realtime add table public.reactions;
-- alter publication supabase_realtime add table public.progress_updates;
