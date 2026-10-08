create or replace function private.can_view_department_tickets(dept uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() or private.is_department_poc(dept); $$;
revoke all on function private.can_view_department_tickets(uuid) from public,anon;
grant execute on function private.can_view_department_tickets(uuid) to authenticated;
do $$ declare p record; command text; begin
 for p in select * from pg_policies where schemaname in ('public','storage') and (coalesce(qual,'') like '%private.can_manage_ticket%' or coalesce(with_check,'') like '%private.can_manage_ticket%') loop
 command=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 if p.qual is not null then command=command||' using ('||replace(p.qual,'private.can_manage_ticket','private.can_view_department_tickets')||')'; end if;
 if p.with_check is not null then command=command||' with check ('||replace(p.with_check,'private.can_manage_ticket','private.can_view_department_tickets')||')'; end if;
 execute command;
 end loop;
end $$;
alter policy tickets_edit on public.tickets using(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.is_admin())) with check(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.is_admin()));
do $$ declare definition text; begin
 select pg_get_functiondef('private.guard_ticket_update()'::regprocedure) into definition;
 definition=replace(definition,'private.can_manage_ticket(old.department_id)','private.is_admin() or old.assigned_to=auth.uid()');
 definition=replace(definition,'Only Admin or department POC','Only Admin or assigned employee');
 execute definition;
 select pg_get_functiondef('private.reassign_ticket(uuid,uuid,timestamptz)'::regprocedure) into definition;
 definition=replace(definition,'private.can_manage_ticket(current_ticket.department_id)','private.is_admin() or current_ticket.assigned_to=auth.uid()');
 definition=replace(definition,'Only Admin or department POC','Only Admin or current POC');
 execute definition;
end $$;
create or replace function private.can_manage_ticket(dept uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;

