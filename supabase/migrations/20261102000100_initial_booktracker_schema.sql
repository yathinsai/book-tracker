-- BookTracker shared-pilot foundation.
-- Application writes will be added as transactional RPC functions in later migrations.

create extension if not exists pgcrypto;

create type public.drive_status as enum ('draft', 'active', 'closed', 'archived');
create type public.membership_role as enum ('organizer', 'volunteer');
create type public.membership_status as enum ('active', 'inactive');
create type public.location_type as enum ('collection', 'central');
create type public.entry_mode as enum ('title', 'batch');
create type public.book_condition as enum ('unknown', 'new', 'good', 'worn', 'damaged');
create type public.reading_level as enum ('mixed/unknown', 'early reader', 'elementary', 'middle school', 'high school');
create type public.inventory_decision as enum ('pending', 'accepted', 'rejected');
create type public.box_status as enum ('open', 'ready', 'shipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 120)
);

create table public.drives (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  partner_name text not null check (char_length(trim(partner_name)) between 1 and 120),
  guidance_text text not null default '' check (char_length(guidance_text) <= 1200),
  guidance_url text not null default '' check (char_length(guidance_url) <= 2048),
  goal_accepted_quantity integer check (goal_accepted_quantity is null or goal_accepted_quantity > 0),
  destination_description text not null check (char_length(trim(destination_description)) between 1 and 180),
  status public.drive_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drive_memberships (
  drive_id uuid not null references public.drives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (drive_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  type public.location_type not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drive_id, name)
);

create unique index locations_one_active_central_per_drive
  on public.locations (drive_id) where type = 'central' and active;

create table public.inventory_entries (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  origin_location_id uuid not null references public.locations(id) on delete restrict,
  current_location_id uuid not null references public.locations(id) on delete restrict,
  entry_mode public.entry_mode not null,
  title text not null default '' check (char_length(title) <= 180),
  category text not null check (category in ('storybooks', 'nonfiction', 'textbooks', 'other')),
  quantity integer not null check (quantity > 0),
  condition public.book_condition not null,
  reading_level public.reading_level not null,
  decision public.inventory_decision not null default 'pending',
  rejection_reason text not null default '' check (char_length(rejection_reason) <= 240),
  parent_entry_id uuid references public.inventory_entries(id) on delete restrict,
  notes text not null default '' check (char_length(notes) <= 1000),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_entry_title_for_mode check (
    (entry_mode = 'title' and char_length(trim(title)) > 0) or (entry_mode = 'batch' and title = '')
  ),
  constraint inventory_entry_rejection_reason check (
    (decision = 'rejected' and char_length(trim(rejection_reason)) > 0) or (decision <> 'rejected' and rejection_reason = '')
  )
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  shipped_date date not null,
  destination text not null check (char_length(trim(destination)) between 1 and 180),
  tracking_reference text not null default '' check (char_length(tracking_reference) <= 180),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  status public.box_status not null default 'open',
  verified_quantity integer check (verified_quantity is null or verified_quantity >= 0),
  shipment_id uuid references public.shipments(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drive_id, label),
  constraint boxes_shipment_status check (
    (status = 'shipped' and shipment_id is not null) or (status <> 'shipped' and shipment_id is null)
  )
);

create table public.box_items (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  box_id uuid not null references public.boxes(id) on delete cascade,
  inventory_entry_id uuid not null references public.inventory_entries(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (box_id, inventory_entry_id)
);

create table public.change_events (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid not null,
  action text not null check (char_length(trim(action)) between 1 and 120),
  before_values jsonb,
  after_values jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.request_keys (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (char_length(trim(operation)) between 1 and 120),
  idempotency_key uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_id, operation, idempotency_key)
);

create index drive_memberships_user_id_idx on public.drive_memberships (user_id);
create index inventory_entries_drive_id_idx on public.inventory_entries (drive_id);
create index inventory_entries_drive_origin_idx on public.inventory_entries (drive_id, origin_location_id);
create index inventory_entries_drive_current_idx on public.inventory_entries (drive_id, current_location_id);
create index inventory_entries_drive_decision_idx on public.inventory_entries (drive_id, decision);
create index inventory_entries_drive_reading_level_idx on public.inventory_entries (drive_id, reading_level);
create index inventory_entries_drive_updated_at_idx on public.inventory_entries (drive_id, updated_at desc);
create index boxes_drive_status_idx on public.boxes (drive_id, status);
create index boxes_shipment_id_idx on public.boxes (shipment_id) where shipment_id is not null;
create index box_items_box_id_idx on public.box_items (box_id);
create index box_items_inventory_entry_id_idx on public.box_items (inventory_entry_id);
create index shipments_drive_shipped_date_idx on public.shipments (drive_id, shipped_date desc);
create index change_events_drive_created_at_idx on public.change_events (drive_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger drives_set_updated_at before update on public.drives for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.drive_memberships for each row execute function public.set_updated_at();
create trigger locations_set_updated_at before update on public.locations for each row execute function public.set_updated_at();
create trigger inventory_entries_set_updated_at before update on public.inventory_entries for each row execute function public.set_updated_at();
create trigger boxes_set_updated_at before update on public.boxes for each row execute function public.set_updated_at();
create trigger box_items_set_updated_at before update on public.box_items for each row execute function public.set_updated_at();

create function public.assert_inventory_entry_drive_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.locations where id = new.origin_location_id and drive_id = new.drive_id) then
    raise exception 'origin location must belong to the inventory entry drive';
  end if;
  if not exists (select 1 from public.locations where id = new.current_location_id and drive_id = new.drive_id) then
    raise exception 'current location must belong to the inventory entry drive';
  end if;
  if new.parent_entry_id is not null and not exists (
    select 1 from public.inventory_entries where id = new.parent_entry_id and drive_id = new.drive_id
  ) then
    raise exception 'parent entry must belong to the inventory entry drive';
  end if;
  return new;
end;
$$;

create trigger inventory_entries_validate_drive_references
  before insert or update on public.inventory_entries
  for each row execute function public.assert_inventory_entry_drive_references();

create function public.assert_box_drive_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.shipment_id is not null and not exists (
    select 1 from public.shipments where id = new.shipment_id and drive_id = new.drive_id
  ) then
    raise exception 'shipment must belong to the box drive';
  end if;
  return new;
end;
$$;

create trigger boxes_validate_drive_references
  before insert or update on public.boxes
  for each row execute function public.assert_box_drive_references();

create function public.assert_box_item_drive_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.boxes where id = new.box_id and drive_id = new.drive_id) then
    raise exception 'box must belong to the box item drive';
  end if;
  if not exists (select 1 from public.inventory_entries where id = new.inventory_entry_id and drive_id = new.drive_id) then
    raise exception 'inventory entry must belong to the box item drive';
  end if;
  return new;
end;
$$;

create trigger box_items_validate_drive_references
  before insert or update on public.box_items
  for each row execute function public.assert_box_item_drive_references();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger auth_user_profile_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create schema if not exists private;

create function private.is_active_drive_member(target_drive_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.drive_memberships
    where drive_id = target_drive_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create function private.is_active_drive_organizer(target_drive_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.drive_memberships
    where drive_id = target_drive_id
      and user_id = (select auth.uid())
      and status = 'active'
      and role = 'organizer'
  );
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant select on public.profiles, public.drives, public.drive_memberships, public.locations,
  public.inventory_entries, public.boxes, public.box_items, public.shipments, public.change_events
  to authenticated;
grant select, update on public.profiles to authenticated;
grant execute on function private.is_active_drive_member(uuid), private.is_active_drive_organizer(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.drives enable row level security;
alter table public.drive_memberships enable row level security;
alter table public.locations enable row level security;
alter table public.inventory_entries enable row level security;
alter table public.boxes enable row level security;
alter table public.box_items enable row level security;
alter table public.shipments enable row level security;
alter table public.change_events enable row level security;
alter table public.request_keys enable row level security;

create policy "users can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "users can update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "members can read drives" on public.drives
  for select to authenticated using (private.is_active_drive_member(id));
create policy "members can read memberships" on public.drive_memberships
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read locations" on public.locations
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read inventory" on public.inventory_entries
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read boxes" on public.boxes
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read box items" on public.box_items
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read shipments" on public.shipments
  for select to authenticated using (private.is_active_drive_member(drive_id));
create policy "members can read change events" on public.change_events
  for select to authenticated using (private.is_active_drive_member(drive_id));

comment on table public.request_keys is 'Idempotency records. Access is only through future transactional RPC functions.';
comment on table public.change_events is 'Append-only audit history. Application users will write only through future transactional RPC functions.';
