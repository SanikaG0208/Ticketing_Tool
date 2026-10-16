alter table public.profiles add column if not exists left_at timestamptz;
alter table public.profiles add column if not exists left_by uuid references public.profiles(id);
alter table public.tickets add column if not exists needs_reassignment boolean not null default false;
alter table public.ticket_notifications add column if not exists message text;
create policy profiles_admin_read_history on public.profiles for select to authenticated using (private.is_admin());
create or replace function private.mark_employee_left(employee_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare person public.profiles; actor text; ticket record; left_event_id bigint; affected integer=0; note text;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator access required';end if;
 lock table public.profiles,public.tickets in share row exclusive mode;
 select * into person from public.profiles where id=$1 and active for update;
 if not found then raise exception 'Active employee not found';end if;
 if person.id=auth.uid() then raise exception 'You cannot mark your own account as left';end if;
 if person.role='admin' and (select count(*) from public.profiles where active and role='admin')<=1 then raise exception 'At least one active Admin must remain';end if;
 select name into actor from public.profiles where id=auth.uid();
 update public.profiles set active=false,left_at=clock_timestamp(),left_by=auth.uid() where id=$1;
 note=person.name||' has left the organization. Please reassign this ticket to an active employee.';
 for ticket in select t.id,t.employee_id from public.tickets t where t.assigned_to=$1 and t.status not in ('Completed','Closed') for update loop
  update public.tickets set needs_reassignment=true where id=ticket.id;
  insert into public.ticket_activity(ticket_id,actor_id,actor_name,action,changes,occurred_at)
  values(ticket.id,auth.uid(),actor,'updated',jsonb_build_array(jsonb_build_object('field','employee_left','from',person.name,'to',note)),clock_timestamp()) returning id into left_event_id;
  insert into public.ticket_notifications(event_id,ticket_id,recipient_id,message) values(left_event_id,ticket.id,ticket.employee_id,note) on conflict do nothing;
  update public.ticket_notifications set message=note where ticket_notifications.event_id=left_event_id;
  affected=affected+1;
 end loop;
 return affected;
end $$;
revoke all on function private.mark_employee_left(uuid) from public,anon;
grant execute on function private.mark_employee_left(uuid) to authenticated;
create or replace function public.mark_employee_left(employee_id uuid) returns integer language sql security invoker set search_path='' as $$select private.mark_employee_left($1);$$;
revoke all on function public.mark_employee_left(uuid) from public,anon;
grant execute on function public.mark_employee_left(uuid) to authenticated;
-- Extend reassignment only for creators whose handler has left.
do $$declare definition text;begin
 select pg_get_functiondef('private.reassign_ticket(uuid,uuid,timestamptz,text)'::regprocedure) into definition;
 definition=replace(definition,'private.is_admin() or current_ticket.assigned_to=auth.uid()','private.is_admin() or current_ticket.assigned_to=auth.uid() or (current_ticket.employee_id=auth.uid() and current_ticket.needs_reassignment)');
 definition=replace(definition,'set assigned_to=$2,reassignment_reason','set needs_reassignment=false,assigned_to=$2,reassignment_reason');
 execute definition;
end $$;
