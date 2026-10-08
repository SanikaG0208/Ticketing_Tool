alter table public.profiles add column if not exists is_poc boolean not null default false;
-- Preserve current ticket owners as designated POCs during the transition.
update public.profiles p set is_poc=true where active and exists(select 1 from public.tickets t where t.assigned_to=p.id);
drop function public.edit_employee_details(uuid,text,uuid);
drop function private.edit_employee_details(uuid,text,uuid);
create or replace function private.edit_employee_details(employee_id uuid,employee_name text,new_department_id uuid,employee_is_poc boolean) returns void
language plpgsql security definer set search_path='' as $$
declare current_department uuid;
begin
 if auth.uid() is null or not private.is_it() then raise exception 'IT access required'; end if;
 if employee_name is null or length(trim(employee_name))=0 or length(employee_name)>100 then raise exception 'Employee name is required (maximum 100 characters)'; end if;
 lock table public.departments,public.profiles,public.tickets in share row exclusive mode;
 select department_id into current_department from public.profiles where id=$1 and active;
 if not found then raise exception 'Active employee not found'; end if;
 if not exists(select 1 from public.departments where id=$3 and active) then raise exception 'Choose an active department'; end if;
 if current_department<>$3 then
  if $1=auth.uid() then raise exception 'You cannot change your own department'; end if;
  if exists(select 1 from public.tickets where assigned_to=$1) then raise exception 'Department cannot change while tickets reference this employee as their assigned POC'; end if;
 end if;
 update public.profiles set name=trim($2),department_id=$3,is_poc=coalesce($4,false) where id=$1;
end; $$;
revoke all on function private.edit_employee_details(uuid,text,uuid,boolean) from public,anon;
grant execute on function private.edit_employee_details(uuid,text,uuid,boolean) to authenticated;
create or replace function public.edit_employee_details(employee_id uuid,employee_name text,new_department_id uuid,employee_is_poc boolean) returns void
language sql security invoker set search_path='' as $$ select private.edit_employee_details(employee_id,employee_name,new_department_id,employee_is_poc); $$;
revoke all on function public.edit_employee_details(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.edit_employee_details(uuid,text,uuid,boolean) to authenticated;

-- Reuse existing routing and reassignment, restricting recipient lookups to POCs.
do $$ declare definition text; begin
 select pg_get_functiondef('private.route_new_ticket()'::regprocedure) into definition;
 definition=replace(definition,'department_id=new.department_id and active','department_id=new.department_id and active and is_poc');
 execute definition;
 select pg_get_functiondef('private.reassign_ticket(uuid,uuid,timestamptz)'::regprocedure) into definition;
 definition=replace(definition,'department_id=current_ticket.department_id and active','department_id=current_ticket.department_id and active and is_poc');
 execute definition;
end $$;
create or replace function private.validate_ticket_poc() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then if new.assigned_to is not distinct from old.assigned_to and new.department_id is not distinct from old.department_id then return new; end if; end if;
 if not exists(select 1 from public.profiles p where p.id=new.assigned_to and p.department_id=new.department_id and p.active and p.is_poc) then raise exception 'Choose an active designated POC from this department' using errcode='23514'; end if;
 return new;
end $$;
create trigger zz_validate_ticket_poc before insert or update of assigned_to,department_id on public.tickets for each row execute function private.validate_ticket_poc();
