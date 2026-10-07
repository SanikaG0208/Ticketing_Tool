alter table public.departments add column active boolean not null default true, add column issues text[] not null default array['Other'];
update public.departments set issues=case lower(trim(name)) when 'it' then array['Internet','Computer / Laptop','Email','Login / Access','Other'] when 'developer' then array['Gandiva','HRMS','Login / Access','Other'] when 'development' then array['Gandiva','HRMS','Login / Access','Other'] when 'hr' then array['HRMS','Login / Access','Other'] else array['Other'] end;
alter table public.tickets add column issue text, add column poc_mode text not null default 'manual' check(poc_mode in ('auto','manual','other')), add column poc_other text check(length(poc_other)<=200);
create function private.route_new_ticket() returns trigger language plpgsql set search_path='' as $$
declare options text[];
begin
 if current_user='authenticated' then
  if auth.uid() is null or not private.is_employee() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
  new.employee_id=auth.uid();
 end if;
 select issues into options from public.departments where id=new.department_id and active;
 if options is null then raise exception 'Select an active department' using errcode='23514'; end if;
 if new.issue is null or not (new.issue=any(options) or new.issue='Other') then raise exception 'Issue does not belong to selected department' using errcode='23514'; end if;
 if new.poc_mode='other' and length(trim(coalesce(new.poc_other,'')))=0 then raise exception 'Specify person/team for Other POC' using errcode='23514'; end if;
 if new.poc_mode<>'other' then new.poc_other=null; end if;
 if new.poc_mode in ('auto','other') then
  select id into new.assigned_to from public.profiles where department_id=new.department_id and active order by lower(name),id limit 1;
 end if;
 if not exists(select 1 from public.profiles where id=new.assigned_to and department_id=new.department_id and active) then raise exception 'Department needs an active POC; contact IT' using errcode='23514'; end if;
 if length(trim(coalesce(new.description,'')))=0 then raise exception 'Describe the issue' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.route_new_ticket() from public,anon,authenticated;
create trigger route_new_ticket before insert on public.tickets for each row execute function private.route_new_ticket();
