create or replace function private.edit_department_details(department_id uuid,department_name text,department_issues text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required'; end if;
 if department_name is null or length(trim(department_name)) not between 1 and 100 then raise exception 'Department name is required (maximum 100 characters)'; end if;
 if department_issues is null or cardinality(department_issues)=0 or cardinality(department_issues)>50 or exists(select 1 from unnest(department_issues) as issue where length(trim(issue)) not between 1 and 100) then raise exception 'Provide valid department issues'; end if;
 if not exists(select 1 from public.departments where id=$1 and active) then raise exception 'Active department not found'; end if;
 if exists(select 1 from public.departments where id<>$1 and lower(name)=lower(trim($2))) then raise exception 'Department name already exists'; end if;
 update public.departments set name=trim($2),issues=$3 where id=$1;
end $$;
revoke all on function private.edit_department_details(uuid,text,text[]) from public,anon;
grant execute on function private.edit_department_details(uuid,text,text[]) to authenticated;
create or replace function public.edit_department_details(department_id uuid,department_name text,department_issues text[]) returns void language sql security invoker set search_path='' as $$ select private.edit_department_details($1,$2,$3); $$;
revoke all on function public.edit_department_details(uuid,text,text[]) from public,anon;
grant execute on function public.edit_department_details(uuid,text,text[]) to authenticated;
