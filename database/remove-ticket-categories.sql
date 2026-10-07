-- Remove categories while preserving ticket rows and activity history.
drop view public.ticket_metrics;
alter table public.tickets drop column type_id, drop column subtype_id;
drop table public.ticket_subtypes;
drop table public.ticket_types;
create view public.ticket_metrics with(security_invoker=true) as
select t.id,t.number,t.employee_id,t.assigned_to,t.department_id,t.status,t.created_at,t.affected_system,t.work_blocked,
 a.responded_at,a.resolved_at,a.completed_at,
 extract(epoch from(a.responded_at-t.created_at)) as response_seconds,
 extract(epoch from(a.resolved_at-t.created_at)) as resolution_seconds,
 case when t.work_blocked=true then extract(epoch from(coalesce(a.resolved_at,now())-t.created_at)) end as downtime_seconds
from public.tickets t left join lateral (
 select min(occurred_at) filter(where actor_id<>t.employee_id and (actor_id=t.assigned_to or exists(select 1 from public.profiles p join public.departments d on d.id=p.department_id where p.id=actor_id and d.name='IT')) and (action='commented' or changes @> '[{"field":"status"}]'::jsonb)) as responded_at,
 min(occurred_at) filter(where changes @> '[{"field":"status","to":"Resolved"}]'::jsonb) as resolved_at,
 min(occurred_at) filter(where changes @> '[{"field":"status","to":"Completed"}]'::jsonb) as completed_at
 from public.ticket_activity where ticket_id=t.id
) a on true;
revoke all on public.ticket_metrics from public,anon;
grant select on public.ticket_metrics to authenticated;
create or replace function public.ticket_insights() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.is_it() then raise exception 'IT administrator access required' using errcode='42501'; end if;
 select jsonb_build_object('total',count(*),'awaiting_response',count(*) filter(where responded_at is null and status not in ('Completed','Closed')),'average_response_seconds',avg(response_seconds),'average_resolution_seconds',avg(resolution_seconds),'recorded_downtime_seconds',sum(downtime_seconds),'unrecorded_downtime',count(*) filter(where work_blocked is null),'active_downtime',count(*) filter(where work_blocked and resolved_at is null)) into result from public.ticket_metrics;
 return result || jsonb_build_object(
 'ownership',coalesce((select jsonb_agg(x) from(select p.name as owner,count(*) as total,count(*) filter(where t.status not in ('Resolved','Completed','Closed')) as active from public.tickets t join public.profiles p on p.id=t.assigned_to group by p.id,p.name order by active desc limit 50)x),'[]'::jsonb),
 'recurring',coalesce((select jsonb_agg(x) from(select d.name as department,coalesce(nullif(lower(trim(t.affected_system)),''),'Unspecified') as system,count(*) as occurrences from public.tickets t join public.departments d on d.id=t.department_id where t.created_at>=now()-interval '90 days' and nullif(trim(t.affected_system),'') is not null group by d.name,coalesce(nullif(lower(trim(t.affected_system)),''),'Unspecified') having count(*)>1 order by occurrences desc limit 30)x),'[]'::jsonb));
end; $$;
revoke all on function public.ticket_insights() from public,anon;
grant execute on function public.ticket_insights() to authenticated;

-- Keep the existing audit trigger, omitting removed fields.
do $$ declare definition text; begin
 select pg_get_functiondef('private.record_ticket_activity()'::regprocedure) into definition;
 definition=replace(definition,'''type_id'', ''subtype_id'', ', '');
 definition=replace(definition,'''type_id'',''subtype_id'',', '');
 execute definition;
end $$;
