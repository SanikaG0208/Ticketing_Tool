create or replace function private.guard_ticket_comment() returns trigger language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
 if not private.is_employee() or new.author_id<>auth.uid() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
 select t.status into current_status from public.tickets t where t.id=new.ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.can_view_department_tickets(t.department_id)) for share;
 if current_status is null then raise exception 'Ticket access required' using errcode='42501'; end if;
 if current_status in ('Completed','Closed') then raise exception 'Completed tickets are read-only' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.guard_ticket_comment() from public,anon,authenticated;

