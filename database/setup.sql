-- Run once in the dedicated Supabase project's SQL Editor.
-- No existing organizational tables are altered.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100)
);
create unique index departments_name_unique on public.departments(lower(name));
insert into public.departments(name) values ('IT');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 100),
  email text not null,
  department_id uuid not null references public.departments(id),
  active boolean not null default true,
  created_at timestamptz not null default now(), unique(id,department_id)
);
create index profiles_department_idx on public.profiles(department_id);
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments(id), name text not null check(length(trim(name)) between 1 and 100), unique(id,department_id)
);
create unique index ticket_types_name_unique on public.ticket_types(department_id,lower(name));
create table public.ticket_subtypes (
  id uuid primary key default gen_random_uuid(), type_id uuid not null references public.ticket_types(id),
  name text not null check(length(trim(name)) between 1 and 100),
  unique(id,type_id)
);
create unique index ticket_subtypes_name_unique on public.ticket_subtypes(type_id,lower(name));
create table public.tickets (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
  employee_id uuid not null references public.profiles(id),
  department_id uuid not null references public.departments(id),
  type_id uuid not null references public.ticket_types(id),
  subtype_id uuid not null,
  assigned_to uuid not null,
  foreign key(assigned_to,department_id) references public.profiles(id,department_id),
  foreign key(type_id,department_id) references public.ticket_types(id,department_id),
  foreign key(subtype_id,type_id) references public.ticket_subtypes(id,type_id),
  requirements text not null check(length(trim(requirements)) between 1 and 4000),
  description text not null check(length(trim(description)) between 1 and 20000),
  priority text not null check(priority in ('Low','Medium','High')),
  status text not null default 'Open' check(status in ('Open','In Progress','Resolved','Closed')),
  send_email boolean not null default false,
  email_status text not null default 'not_requested' check(email_status in ('not_requested','not_configured','sent','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tickets_employee_created_idx on public.tickets(employee_id,created_at desc);
create index tickets_created_idx on public.tickets(created_at desc);
create index tickets_department_idx on public.tickets(department_id);
create index tickets_type_idx on public.tickets(type_id);
create index tickets_assigned_idx on public.tickets(assigned_to,department_id);
create index types_department_idx on public.ticket_types(department_id);
create index tickets_type_department_idx on public.tickets(type_id,department_id);
create index tickets_subtype_type_idx on public.tickets(subtype_id,type_id);
create table public.ticket_snapshots (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id),
  storage_path text not null unique, file_name text not null,
  content_type text not null check(content_type in ('image/png','image/jpeg')),
  created_at timestamptz not null default now(),
  check(split_part(storage_path,'/',1)=ticket_id::text)
);
create index ticket_snapshots_ticket_idx on public.ticket_snapshots(ticket_id);

-- Private helpers bypass only the protected profile lookup to avoid recursive policies.
-- They derive identity from auth.uid(), never from user-editable metadata.
create function private.is_employee() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=(select auth.uid()) and active);
$$;
create function private.is_it() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles p join public.departments d on d.id=p.department_id
    where p.id=(select auth.uid()) and p.active and d.name='IT');
$$;
revoke all on function private.is_employee(),private.is_it() from public,anon;
grant execute on function private.is_employee(),private.is_it() to authenticated;

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.ticket_types enable row level security;
alter table public.ticket_subtypes enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_snapshots enable row level security;
revoke all on public.departments,public.profiles,public.ticket_types,public.ticket_subtypes,public.tickets,public.ticket_snapshots from anon,authenticated;
grant select on public.departments,public.profiles,public.ticket_types,public.ticket_subtypes,public.tickets,public.ticket_snapshots to authenticated;
grant insert on public.departments,public.ticket_types,public.ticket_subtypes,public.tickets,public.ticket_snapshots to authenticated;
grant update(assigned_to,department_id,type_id,subtype_id,requirements,description,priority,send_email,status) on public.tickets to authenticated;
grant usage,select on sequence public.tickets_number_seq to authenticated;
grant all on public.departments,public.profiles,public.ticket_types,public.ticket_subtypes,public.tickets,public.ticket_snapshots to service_role;
grant all on sequence public.tickets_number_seq to service_role;

create policy departments_read on public.departments for select to authenticated using((select private.is_employee()));
create policy departments_add on public.departments for insert to authenticated with check((select private.is_it()));
create policy types_read on public.ticket_types for select to authenticated using((select private.is_employee()));
create policy types_add on public.ticket_types for insert to authenticated with check((select private.is_it()));
create policy subtypes_read on public.ticket_subtypes for select to authenticated using((select private.is_employee()));
create policy subtypes_add on public.ticket_subtypes for insert to authenticated with check((select private.is_it()));
create policy profiles_read on public.profiles for select to authenticated using((select private.is_employee()) and active);
-- Profiles are provisioned only through the checked server admin endpoint.
create policy tickets_read on public.tickets for select to authenticated using((select private.is_employee()) and (employee_id=(select auth.uid()) or assigned_to=(select auth.uid()) or (select private.is_it())));
create policy tickets_add on public.tickets for insert to authenticated with check((select private.is_employee()) and employee_id=(select auth.uid()) and status='Open' and email_status='not_requested');
create policy tickets_edit on public.tickets for update to authenticated
  using((select private.is_employee()) and (employee_id=(select auth.uid()) or (select private.is_it())))
  with check((select private.is_employee()) and (employee_id=(select auth.uid()) or (select private.is_it())));

create function private.guard_ticket_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.id is distinct from old.id or new.employee_id is distinct from old.employee_id or new.number is distinct from old.number or new.created_at is distinct from old.created_at then
    raise exception 'Ticket identity cannot be changed' using errcode='42501';
  end if;
  if current_user='authenticated' and new.status is distinct from old.status and not private.is_it() then
    raise exception 'Only IT can change ticket status' using errcode='42501';
  end if;
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function private.guard_ticket_update() from public,anon;
create trigger ticket_update_guard before update on public.tickets for each row execute function private.guard_ticket_update();
create policy snapshots_read on public.ticket_snapshots for select to authenticated using(exists(select 1 from public.tickets t where t.id=ticket_id));
create policy snapshots_add on public.ticket_snapshots for insert to authenticated with check(exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=(select auth.uid()) or (select private.is_it()))));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ticket-snapshots','ticket-snapshots',false,5242880,array['image/png','image/jpeg']);
create policy ticket_files_read on storage.objects for select to authenticated
using(bucket_id='ticket-snapshots' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1)));
create policy ticket_files_add on storage.objects for insert to authenticated
with check(bucket_id='ticket-snapshots' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and (t.employee_id=(select auth.uid()) or (select private.is_it()))));
commit;
