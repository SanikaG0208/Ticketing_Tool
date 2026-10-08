alter table public.tickets add column reopen_reason text check(length(reopen_reason)<=4000);
grant update(reopen_reason) on public.tickets to authenticated;
create or replace function private.lock_completed_ticket() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='Completed' and not (current_user='authenticated' and old.employee_id=auth.uid() and new.status='Open' and length(trim(coalesce(new.reopen_reason,'')))>0) then raise exception 'Completed tickets are read-only; creator may explicitly reopen with a reason' using errcode='42501'; end if;
 return new;
end $$;
do $$ declare definition text; fn text; begin
 foreach fn in array array['guard_ticket_fields','guard_ticket_update'] loop
  select pg_get_functiondef(('private.'||fn||'()')::regprocedure) into definition;
  definition=replace(definition,'''waiting_other''','''waiting_other''-''reopen_reason''');
  if fn='guard_ticket_update' then
   definition=replace(definition,'if current_user=''authenticated'' then','if current_user=''authenticated'' and new.status=''Open'' and old.status in (''Resolved'',''Completed'') then if old.employee_id<>auth.uid() or (new.reopen_reason is null or length(trim(new.reopen_reason))=0) then raise exception ''Only creator can reopen with a reason'' using errcode=''42501''; end if; new.waiting_reason=null;new.waiting_other=null;new.updated_at=clock_timestamp();return new; end if; if new.reopen_reason is distinct from old.reopen_reason then raise exception ''Reopen reason can only be changed while reopening'' using errcode=''42501''; end if; if current_user=''authenticated'' then');
  end if;execute definition;
 end loop;
 select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,'''status'',''waiting_reason''','''status'',''reopen_reason'',''waiting_reason''');execute definition;
end $$;

do $$ declare definition text; begin select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition; definition=replace(definition,'if (to_jsonb(old)->field) is distinct from (to_jsonb(new)->field) then','if (to_jsonb(old)->field) is distinct from (to_jsonb(new)->field) or (field=''reopen_reason'' and new.status=''Open'' and old.status in (''Resolved'',''Completed'')) then');execute definition;end $$;
