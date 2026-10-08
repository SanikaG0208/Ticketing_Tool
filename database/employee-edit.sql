create or replace function private.edit_employee_details(employee_id uuid,employee_name text,new_department_id uuid) returns void
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
 update public.profiles set name=trim($2),department_id=$3 where id=$1;
end; $$;
revoke all on function private.edit_employee_details(uuid,text,uuid) from public,anon;
grant execute on function private.edit_employee_details(uuid,text,uuid) to authenticated;
create or replace function public.edit_employee_details(employee_id uuid,employee_name text,new_department_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.edit_employee_details(employee_id,employee_name,new_department_id); $$;
revoke all on function public.edit_employee_details(uuid,text,uuid) from public,anon;
grant execute on function public.edit_employee_details(uuid,text,uuid) to authenticated;
