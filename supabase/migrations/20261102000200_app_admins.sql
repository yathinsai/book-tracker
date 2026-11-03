-- Global application administrators can invite organizers and volunteers through
-- the admin-create-drive-user Edge Function. This is intentionally separate from
-- per-drive organizer membership.

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;

alter table public.app_admins enable row level security;

create policy "users can read their own admin status" on public.app_admins
  for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.app_admins is 'Global app administrators. Bootstrap the first row manually, then use the secured Edge Function for invitations.';
