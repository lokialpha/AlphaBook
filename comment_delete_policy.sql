-- Run this in Supabase SQL Editor to enable owner comment deletion.
alter table public.comments enable row level security;

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
