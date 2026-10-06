alter table public.tickets drop constraint tickets_status_check;
alter table public.tickets add constraint tickets_status_check check(status in ('Open','In Progress','Resolved','Closed','Completed'));
drop policy tickets_edit on public.tickets;
create policy tickets_edit on public.tickets for update to authenticated using(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.is_it())) with check(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.is_it()));
create or replace function private.guard_ticket_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id is distinct from old.id or new.employee_id is distinct from old.employee_id or new.number is distinct from old.number or new.created_at is distinct from old.created_at then raise exception 'Ticket identity cannot be changed' using errcode='42501'; end if;
 if current_user='authenticated' then
  if not private.is_it() and old.employee_id<>auth.uid() and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Assigned employees can change status only' using errcode='42501'; end if;
  if new.status is distinct from old.status then
   if new.status='Completed' then
    if old.employee_id<>auth.uid() or old.status<>'Resolved' then raise exception 'Only the ticket creator can complete a resolved ticket' using errcode='42501'; end if;
   elsif old.status='Completed' then raise exception 'Completed tickets cannot change status' using errcode='42501';
   elsif not (private.is_it() or old.assigned_to=auth.uid()) or new.status not in ('Open','In Progress','Resolved') then raise exception 'Only IT or the assigned employee can update work status' using errcode='42501';
   end if;
  end if;
 end if;
 new.updated_at=now();return new;
end; $$;
create table public.ticket_comments(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.tickets(id),author_id uuid not null references public.profiles(id),body text not null check(length(trim(body)) between 1 and 4000),created_at timestamptz not null default now());
create index ticket_comments_ticket_created_idx on public.ticket_comments(ticket_id,created_at);
create index ticket_comments_author_idx on public.ticket_comments(author_id);
alter table public.ticket_comments enable row level security;
revoke all on public.ticket_comments from anon,authenticated;
grant select,insert on public.ticket_comments to authenticated;
grant all on public.ticket_comments to service_role;
create policy comments_read on public.ticket_comments for select to authenticated using(private.is_employee() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.is_it())));
create policy comments_add on public.ticket_comments for insert to authenticated with check(private.is_employee() and author_id=auth.uid() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.is_it())));
