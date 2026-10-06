create view public.ticket_activity_times with (security_invoker=true) as
select ticket_id,
 max(occurred_at) filter(where action<>'created') as last_action_at,
 max(occurred_at) filter(where action='updated' and changes @> '[{"field":"status","to":"Completed"}]'::jsonb) as completed_at
from public.ticket_activity group by ticket_id;
revoke all on public.ticket_activity_times from public,anon;
grant select on public.ticket_activity_times to authenticated;
