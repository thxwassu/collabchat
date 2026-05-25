-- CollabChat Supabase Schema
-- Run this complete file inside Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- =============================
-- Tables
-- =============================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New User',
  email text unique not null,
  avatar_url text,
  bio text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'offline' check (status in ('online', 'offline', 'busy', 'away')),
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  description text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  text text default '',
  message_type text not null default 'text' check (message_type in ('text', 'file', 'image', 'system')),
  file_url text,
  file_name text,
  file_size bigint,
  edited boolean not null default false,
  deleted boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  text text default '',
  message_type text not null default 'text' check (message_type in ('text', 'file', 'image')),
  file_url text,
  file_name text,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  description text default '',
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null default 'general',
  is_read boolean not null default false,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_url text not null,
  file_name text not null,
  file_type text default '',
  file_size bigint default 0,
  created_at timestamptz not null default now()
);

-- =============================
-- Updated timestamp helper
-- =============================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at before update on public.messages
for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

-- =============================
-- Security helpers
-- =============================
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = ws and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = ws and wm.user_id = auth.uid() and wm.role in ('owner','admin')
  ) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- =============================
-- Row Level Security
-- =============================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.private_messages enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.uploaded_files enable row level security;

-- Drop existing policies so this script can be re-run safely
drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile or admins can update" on public.profiles;
drop policy if exists "Authenticated users can read workspaces for invite lookup" on public.workspaces;
drop policy if exists "Authenticated users can create workspaces" on public.workspaces;
drop policy if exists "Owners and admins can update workspaces" on public.workspaces;
drop policy if exists "Owners and platform admins can delete workspaces" on public.workspaces;
drop policy if exists "Authenticated users can read workspace members" on public.workspace_members;
drop policy if exists "Users can join workspaces as themselves" on public.workspace_members;
drop policy if exists "Workspace admins can update members" on public.workspace_members;
drop policy if exists "Members can leave and admins can remove" on public.workspace_members;
drop policy if exists "Members can read rooms" on public.rooms;
drop policy if exists "Members can create rooms" on public.rooms;
drop policy if exists "Workspace admins can update rooms" on public.rooms;
drop policy if exists "Workspace admins can delete rooms" on public.rooms;
drop policy if exists "Members can read messages" on public.messages;
drop policy if exists "Members can send messages" on public.messages;
drop policy if exists "Sender or admin can update messages" on public.messages;
drop policy if exists "Sender or admin can delete messages" on public.messages;
drop policy if exists "Users can read their private messages" on public.private_messages;
drop policy if exists "Users can send private messages" on public.private_messages;
drop policy if exists "Receivers can mark private messages as seen" on public.private_messages;
drop policy if exists "Members can read tasks" on public.tasks;
drop policy if exists "Members can create tasks" on public.tasks;
drop policy if exists "Assignee, creator, workspace admin can update tasks" on public.tasks;
drop policy if exists "Creator or workspace admin can delete tasks" on public.tasks;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Authenticated users can create notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Anyone can send contact messages" on public.contact_messages;
drop policy if exists "Admins can read contact messages" on public.contact_messages;
drop policy if exists "Admins can delete contact messages" on public.contact_messages;
drop policy if exists "Members can read uploaded files" on public.uploaded_files;
drop policy if exists "Members can insert uploaded files" on public.uploaded_files;
drop policy if exists "Uploader or admin can delete uploaded files" on public.uploaded_files;

-- Profiles
create policy "Profiles are visible to authenticated users" on public.profiles
for select to authenticated using (true);

create policy "Users can insert their own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy "Users can update own profile or admins can update" on public.profiles
for update to authenticated using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

-- Workspaces
create policy "Authenticated users can read workspaces for invite lookup" on public.workspaces
for select to authenticated using (true);

create policy "Authenticated users can create workspaces" on public.workspaces
for insert to authenticated with check (owner_id = auth.uid());

create policy "Owners and admins can update workspaces" on public.workspaces
for update to authenticated using (owner_id = auth.uid() or public.is_platform_admin())
with check (owner_id = auth.uid() or public.is_platform_admin());

create policy "Owners and platform admins can delete workspaces" on public.workspaces
for delete to authenticated using (owner_id = auth.uid() or public.is_platform_admin());

-- Workspace members
create policy "Authenticated users can read workspace members" on public.workspace_members
for select to authenticated using (true);

create policy "Users can join workspaces as themselves" on public.workspace_members
for insert to authenticated with check (user_id = auth.uid());

create policy "Workspace admins can update members" on public.workspace_members
for update to authenticated using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Members can leave and admins can remove" on public.workspace_members
for delete to authenticated using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- Rooms
create policy "Members can read rooms" on public.rooms
for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "Members can create rooms" on public.rooms
for insert to authenticated with check (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "Workspace admins can update rooms" on public.rooms
for update to authenticated using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

create policy "Workspace admins can delete rooms" on public.rooms
for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- Messages
create policy "Members can read messages" on public.messages
for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "Members can send messages" on public.messages
for insert to authenticated with check ((sender_id = auth.uid() or message_type = 'system') and (public.is_workspace_member(workspace_id) or public.is_platform_admin()));

create policy "Sender or admin can update messages" on public.messages
for update to authenticated using (sender_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin())
with check (sender_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin());

create policy "Sender or admin can delete messages" on public.messages
for delete to authenticated using (sender_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin());

-- Private messages
create policy "Users can read their private messages" on public.private_messages
for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_platform_admin());

create policy "Users can send private messages" on public.private_messages
for insert to authenticated with check (sender_id = auth.uid());

create policy "Receivers can mark private messages as seen" on public.private_messages
for update to authenticated using (receiver_id = auth.uid() or sender_id = auth.uid())
with check (receiver_id = auth.uid() or sender_id = auth.uid());

-- Tasks
create policy "Members can read tasks" on public.tasks
for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "Members can create tasks" on public.tasks
for insert to authenticated with check (assigned_by = auth.uid() and public.is_workspace_member(workspace_id));

create policy "Assignee, creator, workspace admin can update tasks" on public.tasks
for update to authenticated using (assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin())
with check (assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin());

create policy "Creator or workspace admin can delete tasks" on public.tasks
for delete to authenticated using (assigned_by = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_platform_admin());

-- Notifications
create policy "Users read own notifications" on public.notifications
for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

create policy "Authenticated users can create notifications" on public.notifications
for insert to authenticated with check (true);

create policy "Users update own notifications" on public.notifications
for update to authenticated using (user_id = auth.uid() or public.is_platform_admin())
with check (user_id = auth.uid() or public.is_platform_admin());

-- Contact messages
create policy "Anyone can send contact messages" on public.contact_messages
for insert to anon, authenticated with check (true);

create policy "Admins can read contact messages" on public.contact_messages
for select to authenticated using (public.is_platform_admin());

create policy "Admins can delete contact messages" on public.contact_messages
for delete to authenticated using (public.is_platform_admin());

-- Uploaded files
create policy "Members can read uploaded files" on public.uploaded_files
for select to authenticated using (workspace_id is null or public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "Members can insert uploaded files" on public.uploaded_files
for insert to authenticated with check (uploaded_by = auth.uid() and (workspace_id is null or public.is_workspace_member(workspace_id)));

create policy "Uploader or admin can delete uploaded files" on public.uploaded_files
for delete to authenticated using (uploaded_by = auth.uid() or public.is_platform_admin());

-- =============================
-- Storage buckets and policies
-- =============================
insert into storage.buckets (id, name, public)
values ('collab-files', 'collab-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload collaboration files" on storage.objects;
drop policy if exists "Authenticated users can update own uploaded objects" on storage.objects;
drop policy if exists "Public can read public collaboration files" on storage.objects;
drop policy if exists "Owners can delete own uploaded objects" on storage.objects;

create policy "Authenticated users can upload collaboration files" on storage.objects
for insert to authenticated with check (bucket_id in ('collab-files','avatars'));

create policy "Authenticated users can update own uploaded objects" on storage.objects
for update to authenticated using (bucket_id in ('collab-files','avatars') and owner = auth.uid())
with check (bucket_id in ('collab-files','avatars') and owner = auth.uid());

create policy "Public can read public collaboration files" on storage.objects
for select to anon, authenticated using (bucket_id in ('collab-files','avatars'));

create policy "Owners can delete own uploaded objects" on storage.objects
for delete to authenticated using (bucket_id in ('collab-files','avatars') and owner = auth.uid());

-- =============================
-- Realtime publication
-- =============================
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.private_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workspace_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.uploaded_files; exception when duplicate_object then null; end $$;

-- =============================
-- Manual admin promotion after signing up
-- =============================
-- 1. Register admin@collabchat.com from the app.
-- 2. Run this:
-- update public.profiles set role = 'admin' where email = 'admin@collabchat.com';
