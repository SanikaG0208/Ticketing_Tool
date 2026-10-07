alter table public.tickets add column issue_started_at timestamptz;
alter table public.tickets add constraint ticket_issue_start_before_raised check(issue_started_at is null or (isfinite(issue_started_at) and issue_started_at<=created_at));
