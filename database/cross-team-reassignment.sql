alter table public.tickets add column reassignment_reason text,add column escalated_at timestamptz,add column escalated_by uuid references public.profiles(id);
alter table public.tickets drop constraint tickets_assigned_to_department_id_fkey;
alter table public.tickets add constraint tickets_assigned_to_fkey foreign key(assigned_to) references public.profiles(id);
create or replace function private.validate_ticket_poc() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.assigned_to is not distinct from old.assigned_to and new.department_id is not distinct from old.department_id then return new; end if;
  if not exists(select 1 from public.profiles where id=new.assigned_to and active) then raise exception 'Choose an active employee'; end if;
 else
  if not exists(select 1 from public.profiles where id=new.assigned_to and active and is_poc and department_id=new.department_id) then raise exception 'Choose an active department POC'; end if;
 end if;
 return new;
end $$;
drop function public.reassign_ticket(uuid,uuid,timestamptz);
drop function private.reassign_ticket(uuid,uuid,timestamptz);
create function private.reassign_ticket(ticket_id uuid,new_assignee uuid,expected_updated_at timestamptz,reassignment_reason text) returns public.tickets language plpgsql security definer set search_path='' as $$
declare current_ticket public.tickets;
begin
 if not private.is_employee() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
 select * into current_ticket from public.tickets where id=$1 for update;
 if not found or not(private.is_admin() or current_ticket.assigned_to=auth.uid()) then raise exception 'Only Admin or current assignee can reassign' using errcode='42501'; end if;
 if current_ticket.status in ('Completed','Closed') then raise exception 'Closed tickets cannot be reassigned'; end if;
 if current_ticket.updated_at is distinct from $3 then raise exception 'Ticket changed. Refresh before reassigning' using errcode='40001'; end if;
 if $4 is null or length(trim($4)) not between 1 and 4000 then raise exception 'Reassignment / escalation reason is required'; end if;
 perform 1 from public.profiles where id=$2 and active for share;
 if not found then raise exception 'Choose an active employee'; end if;
 if current_ticket.assigned_to=$2 then raise exception 'Choose a different employee'; end if;
 update public.tickets set assigned_to=$2,reassignment_reason=trim($4),escalated_at=coalesce(escalated_at,clock_timestamp()),escalated_by=auth.uid() where id=$1 returning * into current_ticket;
 return current_ticket;
end $$;
revoke all on function private.reassign_ticket(uuid,uuid,timestamptz,text) from public,anon;
grant execute on function private.reassign_ticket(uuid,uuid,timestamptz,text) to authenticated;
create function public.reassign_ticket(ticket_id uuid,new_assignee uuid,expected_updated_at timestamptz,reassignment_reason text) returns public.tickets language sql security invoker set search_path='' as $$ select private.reassign_ticket($1,$2,$3,$4); $$;
revoke all on function public.reassign_ticket(uuid,uuid,timestamptz,text) from public,anon;
grant execute on function public.reassign_ticket(uuid,uuid,timestamptz,text) to authenticated;
do $$ declare definition text; begin
 select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,$find$array['status'$find$,$replace$array['reassignment_reason','escalated_at','status'$replace$);
 execute definition;
 select pg_get_viewdef('public.ticket_milestones'::regclass,true) into definition;
 definition=replace(definition,'NULL::timestamp with time zone AS escalated_at','t.escalated_at');
 execute 'create or replace view public.ticket_milestones with(security_invoker=true) as '||definition;
end $$;
