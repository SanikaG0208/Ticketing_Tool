create or replace function private.edit_ticket_details(ticket_id uuid,expected_updated_at timestamptz,new_department uuid,new_poc uuid,new_issue text,new_requirements text,new_description text,new_priority text) returns public.tickets
language plpgsql security definer set search_path='' as $$
declare current_ticket public.tickets;
begin
 if not private.is_employee() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
 select * into current_ticket from public.tickets where id=$1 for update;
 if not found or not(private.is_admin() or current_ticket.employee_id=auth.uid()) then raise exception 'Only Admin or ticket creator can edit ticket details' using errcode='42501'; end if;
 if current_ticket.status in ('Completed','Closed') then raise exception 'Completed tickets are read-only' using errcode='42501'; end if;
 if current_ticket.updated_at is distinct from $2 then raise exception 'Ticket changed. Refresh before editing' using errcode='40001'; end if;
 if not exists(select 1 from public.departments where id=$3 and active and ($5=any(issues) or $5='Other')) then raise exception 'Choose a valid department issue'; end if;
 if not exists(select 1 from public.profiles where id=$4 and active and is_poc and department_id=$3) then raise exception 'Choose an active designated POC in this department'; end if;
 if $6 is null or length(trim($6)) not between 1 and 4000 or $7 is null or length(trim($7)) not between 1 and 20000 then raise exception 'Issue summary and description are required'; end if;
 if $8 not in ('Low','Medium','High') or $8 is null then raise exception 'Invalid priority'; end if;
 update public.tickets set department_id=$3,assigned_to=$4,issue=$5,requirements=trim($6),description=trim($7),priority=$8 where id=$1 returning * into current_ticket;
 return current_ticket;
end $$;
revoke all on function private.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text) from public,anon;
grant execute on function private.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text) to authenticated;
create or replace function public.edit_ticket_details(ticket_id uuid,expected_updated_at timestamptz,new_department uuid,new_poc uuid,new_issue text,new_requirements text,new_description text,new_priority text) returns public.tickets language sql security invoker set search_path='' as $$ select private.edit_ticket_details($1,$2,$3,$4,$5,$6,$7,$8); $$;
revoke all on function public.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text) to authenticated;
