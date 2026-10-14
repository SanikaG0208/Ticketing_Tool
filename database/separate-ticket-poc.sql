alter table public.tickets add column if not exists tracking_poc_id uuid references public.profiles(id);
create index if not exists tickets_tracking_poc_idx on public.tickets(tracking_poc_id);
-- Preserve the original POC on existing records without changing their handler.
update public.tickets t set tracking_poc_id=t.assigned_to where tracking_poc_id is null and exists(select 1 from public.profiles p where p.id=t.assigned_to and p.is_poc);
create or replace function private.resolve_tracking_poc(dept uuid,handler uuid,selected uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare chosen uuid; total integer;
begin
 if not exists(select 1 from public.profiles p where p.id=$2 and p.active and p.department_id=$1) then raise exception 'Choose an active employee from this department'; end if;
 select p.id into chosen from public.profiles p where p.id=$2 and p.active and p.is_poc and p.department_id=$1;
 if chosen is not null then return chosen; end if;
 select count(*),(array_agg(p.id order by p.id))[1] into total,chosen from public.profiles p where p.active and p.is_poc and p.department_id=$1;
 if total=0 then raise exception 'Department needs an active POC; contact Admin'; end if;
 if total=1 then return chosen; end if;
 if not exists(select 1 from public.profiles p where p.id=$3 and p.active and p.is_poc and p.department_id=$1) then raise exception 'Select a department POC'; end if;
 return $3;
end $$;
revoke all on function private.resolve_tracking_poc(uuid,uuid,uuid) from public,anon;
grant execute on function private.resolve_tracking_poc(uuid,uuid,uuid) to authenticated;
create or replace function private.route_new_ticket() returns trigger language plpgsql set search_path='' as $$
declare options text[];
begin
 if current_user='authenticated' then
  if auth.uid() is null or not private.is_employee() then raise exception 'Active employee authentication required' using errcode='42501'; end if;
  new.employee_id=auth.uid();
 end if;
 select issues into options from public.departments where id=new.department_id and active;
 if options is null then raise exception 'Select an active department'; end if;
 if new.issue is null or not(new.issue=any(options) or new.issue='Other') then raise exception 'Issue does not belong to selected department'; end if;
 new.tracking_poc_id=private.resolve_tracking_poc(new.department_id,new.assigned_to,new.tracking_poc_id);
 new.poc_mode='manual';new.poc_other=null;
 if length(trim(coalesce(new.description,'')))=0 then raise exception 'Describe the issue'; end if;
 return new;
end $$;
create or replace function private.validate_ticket_poc() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.tracking_poc_id=private.resolve_tracking_poc(new.department_id,new.assigned_to,new.tracking_poc_id);
 elsif new.assigned_to is distinct from old.assigned_to then
  if not exists(select 1 from public.profiles where id=new.assigned_to and active) then raise exception 'Choose an active employee'; end if;
 end if;
 return new;
end $$;
create or replace function private.edit_ticket_details(ticket_id uuid,expected_updated_at timestamptz,new_department uuid,new_poc uuid,new_issue text,new_requirements text,new_description text,new_priority text,new_tracking_poc uuid) returns public.tickets
language plpgsql security definer set search_path='' as $$
declare current_ticket public.tickets; tracking uuid;
begin
 if not private.is_employee() then raise exception 'Active employee authentication required'; end if;
 select * into current_ticket from public.tickets where id=$1 for update;
 if not found or current_ticket.employee_id<>auth.uid() then raise exception 'Only ticket creator can edit ticket details'; end if;
 if current_ticket.status in ('Completed','Closed') then raise exception 'Completed tickets are read-only'; end if;
 if current_ticket.updated_at is distinct from $2 then raise exception 'Ticket changed. Refresh before editing'; end if;
 if not exists(select 1 from public.departments where id=$3 and active and ($5=any(issues) or $5='Other')) then raise exception 'Choose a valid department issue'; end if;
 tracking=private.resolve_tracking_poc($3,$4,$9);
 if $6 is null or length(trim($6)) not between 1 and 4000 or $7 is null or length(trim($7)) not between 1 and 20000 then raise exception 'Issue summary and description are required'; end if;
 if $8 not in ('Low','Medium','High') or $8 is null then raise exception 'Invalid priority'; end if;
 update public.tickets set department_id=$3,assigned_to=$4,tracking_poc_id=tracking,issue=$5,requirements=trim($6),description=trim($7),priority=$8 where id=$1 returning * into current_ticket;
 return current_ticket;
end $$;
revoke all on function private.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text,uuid) from public,anon;
grant execute on function private.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text,uuid) to authenticated;
create or replace function public.edit_ticket_details(ticket_id uuid,expected_updated_at timestamptz,new_department uuid,new_poc uuid,new_issue text,new_requirements text,new_description text,new_priority text,new_tracking_poc uuid) returns public.tickets language sql security invoker set search_path='' as $$select private.edit_ticket_details($1,$2,$3,$4,$5,$6,$7,$8,$9);$$;
revoke all on function public.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text,uuid) from public,anon;
grant execute on function public.edit_ticket_details(uuid,timestamptz,uuid,uuid,text,text,text,text,uuid) to authenticated;

do $$ declare definition text; begin
 select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,'''assigned_to'',''department_id''','''assigned_to'',''tracking_poc_id'',''issue'',''department_id''');execute definition;
 select pg_get_functiondef('private.notify_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,'(t.employee_id,t.assigned_to)','(t.employee_id,t.assigned_to,t.tracking_poc_id)');execute definition;
end $$;
