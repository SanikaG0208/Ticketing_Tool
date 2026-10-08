create function private.reassign_ticket(ticket_id uuid,new_assignee uuid,expected_updated_at timestamptz) returns public.tickets language plpgsql security definer set search_path='' as $$
declare current_ticket public.tickets;
begin
 if auth.uid() is null or not private.is_employee() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
 select * into current_ticket from public.tickets where id=ticket_id for update;
 if not found or not(private.is_it() or current_ticket.assigned_to=auth.uid()) then raise exception 'Only IT or current POC can reassign' using errcode='42501'; end if;
 if current_ticket.status in ('Completed','Closed') then raise exception 'Closed tickets cannot be reassigned' using errcode='42501'; end if;
 if current_ticket.updated_at is distinct from expected_updated_at then raise exception 'Ticket changed. Refresh before reassigning' using errcode='40001'; end if;
 if not exists(select 1 from public.profiles where id=new_assignee and department_id=current_ticket.department_id and active) then raise exception 'Choose an active POC from the ticket department' using errcode='23514'; end if;
 if new_assignee=current_ticket.assigned_to then raise exception 'Choose a different POC' using errcode='23514'; end if;
 update public.tickets set assigned_to=new_assignee where id=ticket_id returning * into current_ticket;
 return current_ticket;
end $$;
revoke all on function private.reassign_ticket(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.reassign_ticket(uuid,uuid,timestamptz) to authenticated;
create function public.reassign_ticket(ticket_id uuid,new_assignee uuid,expected_updated_at timestamptz) returns public.tickets language sql security invoker set search_path='' as $$ select private.reassign_ticket(ticket_id,new_assignee,expected_updated_at) $$;
revoke all on function public.reassign_ticket(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.reassign_ticket(uuid,uuid,timestamptz) to authenticated;
