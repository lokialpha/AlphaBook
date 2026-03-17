-- AlphaBook v1 seed data
-- Assumes auth users exist with emails:
--   loki@gmail.com
--   alpha@gmail.com
--   mya@gmail.com
-- Run after supabase.sql.

-- Ensure profile display names
insert into public.users (id, display_name)
select id, 'Loki'
from auth.users
where email = 'loki@gmail.com'
on conflict (id) do update set display_name = excluded.display_name;

insert into public.users (id, display_name)
select id, 'Alpha'
from auth.users
where email = 'alpha@gmail.com'
on conflict (id) do update set display_name = excluded.display_name;

insert into public.users (id, display_name)
select id, 'Mya'
from auth.users
where email = 'mya@gmail.com'
on conflict (id) do update set display_name = excluded.display_name;

-- Books
insert into public.books (title, author, total_chapters, total_pages, chapter_list)
select 'The Night Circus', 'Erin Morgenstern', 20, 400, null
where not exists (
  select 1 from public.books where title = 'The Night Circus' and author = 'Erin Morgenstern'
);

insert into public.books (title, author, total_chapters, total_pages, chapter_list)
select 'Atomic Habits', 'James Clear', 20, 320, null
where not exists (
  select 1 from public.books where title = 'Atomic Habits' and author = 'James Clear'
);

-- Sessions
insert into public.sessions (book_id, created_by, created_at)
select b.id, u.id, '2026-03-15T09:00:00Z'::timestamptz
from public.books b
join auth.users u on u.email = 'loki@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.sessions s
    where s.book_id = b.id and s.created_by = u.id
  );

insert into public.sessions (book_id, created_by, created_at)
select b.id, u.id, '2026-03-15T09:30:00Z'::timestamptz
from public.books b
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'Atomic Habits' and b.author = 'James Clear'
  and not exists (
    select 1 from public.sessions s
    where s.book_id = b.id and s.created_by = u.id
  );

-- Session members (creator is added automatically; these add the rest)
insert into public.session_members (session_id, user_id, joined_at)
select s.id, u.id, '2026-03-15T10:00:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.session_members sm
    where sm.session_id = s.id and sm.user_id = u.id
  );

insert into public.session_members (session_id, user_id, joined_at)
select s.id, u.id, '2026-03-15T10:05:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.session_members sm
    where sm.session_id = s.id and sm.user_id = u.id
  );

insert into public.session_members (session_id, user_id, joined_at)
select s.id, u.id, '2026-03-15T10:15:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'Atomic Habits' and b.author = 'James Clear'
  and not exists (
    select 1 from public.session_members sm
    where sm.session_id = s.id and sm.user_id = u.id
  );

-- Progress updates
insert into public.progress_updates (session_id, user_id, chapter_number, page_number, created_at)
select s.id, u.id, 3, 65, '2026-03-15T12:00:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'loki@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.progress_updates p
    where p.session_id = s.id
      and p.user_id = u.id
      and p.chapter_number = 3
      and p.page_number = 65
      and p.created_at = '2026-03-15T12:00:00Z'::timestamptz
  );

insert into public.progress_updates (session_id, user_id, chapter_number, page_number, created_at)
select s.id, u.id, 2, 40, '2026-03-15T12:10:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.progress_updates p
    where p.session_id = s.id
      and p.user_id = u.id
      and p.chapter_number = 2
      and p.page_number = 40
      and p.created_at = '2026-03-15T12:10:00Z'::timestamptz
  );

insert into public.progress_updates (session_id, user_id, chapter_number, page_number, created_at)
select s.id, u.id, 1, 20, '2026-03-15T12:20:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.progress_updates p
    where p.session_id = s.id
      and p.user_id = u.id
      and p.chapter_number = 1
      and p.page_number = 20
      and p.created_at = '2026-03-15T12:20:00Z'::timestamptz
  );

insert into public.progress_updates (session_id, user_id, chapter_number, page_number, created_at)
select s.id, u.id, 4, 80, '2026-03-15T12:40:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'Atomic Habits' and b.author = 'James Clear'
  and not exists (
    select 1 from public.progress_updates p
    where p.session_id = s.id
      and p.user_id = u.id
      and p.chapter_number = 4
      and p.page_number = 80
      and p.created_at = '2026-03-15T12:40:00Z'::timestamptz
  );

insert into public.progress_updates (session_id, user_id, chapter_number, page_number, created_at)
select s.id, u.id, 2, 35, '2026-03-15T12:50:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'Atomic Habits' and b.author = 'James Clear'
  and not exists (
    select 1 from public.progress_updates p
    where p.session_id = s.id
      and p.user_id = u.id
      and p.chapter_number = 2
      and p.page_number = 35
      and p.created_at = '2026-03-15T12:50:00Z'::timestamptz
  );

-- Comments
insert into public.comments (session_id, user_id, body, created_at)
select s.id, u.id, 'Loved the opening scene. The circus feels alive.', '2026-03-15T13:00:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'loki@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.comments c
    where c.session_id = s.id
      and c.user_id = u.id
      and c.body = 'Loved the opening scene. The circus feels alive.'
      and c.created_at = '2026-03-15T13:00:00Z'::timestamptz
  );

insert into public.comments (session_id, user_id, body, created_at)
select s.id, u.id, 'The imagery is so rich. Favorite line so far?', '2026-03-15T13:05:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.comments c
    where c.session_id = s.id
      and c.user_id = u.id
      and c.body = 'The imagery is so rich. Favorite line so far?'
      and c.created_at = '2026-03-15T13:05:00Z'::timestamptz
  );

insert into public.comments (session_id, user_id, body, created_at)
select s.id, u.id, 'Chapter two made me slow down and reread.', '2026-03-15T13:10:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'The Night Circus' and b.author = 'Erin Morgenstern'
  and not exists (
    select 1 from public.comments c
    where c.session_id = s.id
      and c.user_id = u.id
      and c.body = 'Chapter two made me slow down and reread.'
      and c.created_at = '2026-03-15T13:10:00Z'::timestamptz
  );

insert into public.comments (session_id, user_id, body, created_at)
select s.id, u.id, 'Tiny habits are stacking quickly for me.', '2026-03-15T13:30:00Z'::timestamptz
from public.sessions s
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'Atomic Habits' and b.author = 'James Clear'
  and not exists (
    select 1 from public.comments c
    where c.session_id = s.id
      and c.user_id = u.id
      and c.body = 'Tiny habits are stacking quickly for me.'
      and c.created_at = '2026-03-15T13:30:00Z'::timestamptz
  );

-- Reactions
insert into public.reactions (comment_id, user_id, emoji, created_at)
select c.id, u.id, '❤️', '2026-03-15T13:12:00Z'::timestamptz
from public.comments c
join public.sessions s on s.id = c.session_id
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'alpha@gmail.com'
where b.title = 'The Night Circus'
  and c.body = 'Loved the opening scene. The circus feels alive.'
  and c.created_at = '2026-03-15T13:00:00Z'::timestamptz
  and not exists (
    select 1 from public.reactions r
    where r.comment_id = c.id and r.user_id = u.id and r.emoji = '❤️'
  );

insert into public.reactions (comment_id, user_id, emoji, created_at)
select c.id, u.id, '✨', '2026-03-15T13:14:00Z'::timestamptz
from public.comments c
join public.sessions s on s.id = c.session_id
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'mya@gmail.com'
where b.title = 'The Night Circus'
  and c.body = 'Chapter two made me slow down and reread.'
  and c.created_at = '2026-03-15T13:10:00Z'::timestamptz
  and not exists (
    select 1 from public.reactions r
    where r.comment_id = c.id and r.user_id = u.id and r.emoji = '✨'
  );

insert into public.reactions (comment_id, user_id, emoji, created_at)
select c.id, u.id, '👏', '2026-03-15T13:35:00Z'::timestamptz
from public.comments c
join public.sessions s on s.id = c.session_id
join public.books b on b.id = s.book_id
join auth.users u on u.email = 'loki@gmail.com'
where b.title = 'Atomic Habits'
  and c.body = 'Tiny habits are stacking quickly for me.'
  and c.created_at = '2026-03-15T13:30:00Z'::timestamptz
  and not exists (
    select 1 from public.reactions r
    where r.comment_id = c.id and r.user_id = u.id and r.emoji = '👏'
  );
