alter table public.tickets add column waiting_reason text, add column waiting_other text check(length(waiting_other)<=1000);
alter table public.tickets drop constraint tickets_status_check;
alter table public.tickets add constraint tickets_status_check check(status in ('Open','In Progress','Waiting','Resolved','Closed','Completed'));
alter table public.tickets add constraint ticket_waiting_reason check(status<>'Waiting' or (coalesce(waiting_reason in ('Employee','IT','Developer','Approval','HR','Vendor','Other'),false) and (waiting_reason<>'Other' or length(trim(coalesce(waiting_other,'')))>0)));
do $$ declare definition text; fn text; begin
 foreach fn in array array['guard_ticket_fields','guard_ticket_update'] loop
  select pg_get_functiondef(('private.'||fn||'()')::regprocedure) into definition;
  definition=replace(definition,'''status''-''updated_at''','''status''-''updated_at''-''waiting_reason''-''waiting_other''');
  if fn='guard_ticket_update' then
   definition=replace(definition,'''Open'',''In Progress'',''Resolved''','''Open'',''In Progress'',''Waiting'',''Resolved''');
   definition=replace(definition,'new.updated_at=now();', 'if current_user=''authenticated'' and (new.waiting_reason is distinct from old.waiting_reason or new.waiting_other is distinct from old.waiting_other) and not (private.is_it() or old.assigned_to=auth.uid()) then raise exception ''Only IT or assigned employee can change waiting reasons'' using errcode=''42501''; end if; if new.status<>''Waiting'' then new.waiting_reason=null;new.waiting_other=null; elsif new.waiting_reason<>''Other'' then new.waiting_other=null; end if; new.updated_at=now();');
  end if;
  execute definition;
 end loop;
 select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,'''status'',''assigned_to''','''status'',''waiting_reason'',''waiting_other'',''assigned_to''');execute definition;
end $$;
create view public.ticket_milestones with(security_invoker=true) as
select t.id as ticket_id,t.issue_started_at,t.created_at,t.created_at as assigned_at,
a.work_started_at,a.resolved_at,a.completed_at,null::timestamptz as escalated_at,m.response_seconds,m.resolution_seconds,
case when t.work_blocked and t.issue_started_at is not null then extract(epoch from(coalesce(a.resolved_at,now())-t.issue_started_at)) end as employee_downtime_seconds
from public.tickets t join public.ticket_metrics m on m.id=t.id left join lateral (
 select min(occurred_at) filter(where changes @> '[{"field":"status","to":"In Progress"}]'::jsonb) work_started_at,
 min(occurred_at) filter(where changes @> '[{"field":"status","to":"Resolved"}]'::jsonb) resolved_at,
 min(occurred_at) filter(where changes @> '[{"field":"status","to":"Completed"}]'::jsonb or changes @> '[{"field":"status","to":"Closed"}]'::jsonb) completed_at
 from public.ticket_activity where ticket_id=t.id
) a on true;
revoke all on public.ticket_milestones from public,anon,authenticated;
grant select on public.ticket_milestones to authenticated;
grant update(waiting_reason,waiting_other) on public.tickets to authenticated;
