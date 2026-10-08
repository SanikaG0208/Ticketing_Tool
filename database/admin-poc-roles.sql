alter table public.profiles add column if not exists role text not null default 'employee' check(role in ('employee','admin'));
update public.profiles set role='admin' where id='bca36675-d75c-48e0-ae64-1c21dd3b9b1b' and active;
update public.profiles set is_poc=true,role='employee' where lower(email)='manik@b2bindemand.com';
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=(select auth.uid()) and active and role='admin'); $$;
create or replace function private.is_department_poc(dept uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=(select auth.uid()) and active and is_poc and department_id=dept); $$;
create or replace function private.can_manage_ticket(dept uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() or private.is_department_poc(dept); $$;
-- Compatibility for older stored policies: IT membership no longer grants administration.
create or replace function private.is_it() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;
revoke all on function private.is_admin(),private.is_department_poc(uuid),private.can_manage_ticket(uuid) from public,anon;
grant execute on function private.is_admin(),private.is_department_poc(uuid),private.can_manage_ticket(uuid) to authenticated;
alter policy tickets_read on public.tickets using(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.can_manage_ticket(department_id)));
alter policy tickets_edit on public.tickets using(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.can_manage_ticket(department_id))) with check(private.is_employee() and (employee_id=auth.uid() or assigned_to=auth.uid() or private.can_manage_ticket(department_id)));
alter policy comments_read on public.ticket_comments using(private.is_employee() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.can_manage_ticket(t.department_id))));
alter policy comments_add on public.ticket_comments with check(private.is_employee() and author_id=auth.uid() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.can_manage_ticket(t.department_id))));
alter policy activity_read on public.ticket_activity using(private.is_employee() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.can_manage_ticket(t.department_id))));
alter policy comment_files_add on storage.objects with check(bucket_id='ticket-snapshots' and name like '%/comments/%' and exists(select 1 from public.tickets t where t.id::text=split_part(objects.name,'/',1) and t.status not in ('Completed','Closed') and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.can_manage_ticket(t.department_id))));
do $$ declare definition text; begin
 select pg_get_functiondef('private.guard_ticket_update()'::regprocedure) into definition;
 definition=replace(definition,'private.is_it() or old.assigned_to=auth.uid()','private.can_manage_ticket(old.department_id)');
 definition=replace(definition,'private.is_it()','private.is_admin()');
 definition=replace(definition,'Only IT or the assigned employee','Only Admin or department POC');
 definition=replace(definition,'Only IT or assigned employee','Only Admin or department POC');
 execute definition;
 select pg_get_functiondef('private.reassign_ticket(uuid,uuid,timestamptz)'::regprocedure) into definition;
 definition=replace(definition,'private.is_it() or current_ticket.assigned_to=auth.uid()','private.can_manage_ticket(current_ticket.department_id)');
 definition=replace(definition,'Only IT or current POC','Only Admin or department POC');
 execute definition;
end $$;

