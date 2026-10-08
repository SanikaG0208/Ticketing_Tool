create or replace view public.ticket_export with(security_invoker=true) as
select t.id,t.number,t.employee_id,t.assigned_to,t.department_id,
coalesce(creator.name,(select actor_name from public.ticket_activity where ticket_id=t.id and action='created' order by id limit 1)) as employee,
d.name as department,t.issue,t.affected_system,t.requirements,t.description,t.priority,t.status,pocdept.name as assigned_team,poc.name as poc,
t.issue_started_at,t.created_at,m.responded_at as first_response_at,ms.work_started_at,ms.escalated_at,ms.resolved_at,ms.completed_at as closed_at,
m.response_seconds,m.resolution_seconds,ms.employee_downtime_seconds as downtime_seconds,'Not configured'::text as sla_status,
null::text as root_cause,null::text as resolution,a.last_action_at
from public.tickets t left join public.departments d on d.id=t.department_id
left join public.profiles creator on creator.id=t.employee_id left join public.profiles poc on poc.id=t.assigned_to
left join public.departments pocdept on pocdept.id=poc.department_id
left join public.ticket_metrics m on m.id=t.id left join public.ticket_milestones ms on ms.ticket_id=t.id
left join public.ticket_activity_times a on a.ticket_id=t.id;
revoke all on public.ticket_export from public,anon,authenticated;
grant select on public.ticket_export to authenticated;
