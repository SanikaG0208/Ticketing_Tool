create or replace function public.admin_service_metrics() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 result=public.ticket_insights();
 return result||jsonb_build_object('recorded_downtime_seconds',(select sum(employee_downtime_seconds) from public.ticket_milestones),'unrecorded_downtime',(select count(*) from public.tickets where work_blocked is null or (work_blocked and issue_started_at is null)),
 'ownership',coalesce((select jsonb_agg(x) from (select p.id,p.name as owner,d.name as department,count(*) as total,count(*) filter(where t.status not in ('Resolved','Completed','Closed')) as active,count(*) filter(where t.status in ('Resolved','Completed','Closed')) as resolved,avg(m.response_seconds) as response_seconds,avg(m.resolution_seconds) as resolution_seconds from public.tickets t join public.profiles p on p.id=t.assigned_to left join public.departments d on d.id=t.department_id left join public.ticket_metrics m on m.id=t.id group by p.id,p.name,d.name order by active desc,p.name)x),'[]'::jsonb));
end $$;
revoke all on function public.admin_service_metrics() from public,anon;
grant execute on function public.admin_service_metrics() to authenticated;
