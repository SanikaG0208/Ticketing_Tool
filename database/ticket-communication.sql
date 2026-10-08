alter table public.ticket_comments add column snapshot_path text, add column snapshot_name text check(length(snapshot_name)<=255);
create function private.validate_comment_attachment() returns trigger language plpgsql set search_path='' as $$
begin
 if new.snapshot_path is not null then
  if new.snapshot_path not like new.ticket_id::text||'/comments/%' or new.snapshot_name is null or not exists(select 1 from storage.objects where bucket_id='ticket-snapshots' and name=new.snapshot_path and owner_id=auth.uid()::text) then raise exception 'Invalid comment screenshot' using errcode='23514'; end if;
 elsif new.snapshot_name is not null then raise exception 'Screenshot file missing' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.validate_comment_attachment() from public,anon,authenticated;
create trigger validate_comment_attachment before insert on public.ticket_comments for each row execute function private.validate_comment_attachment();
create policy comment_files_add on storage.objects for insert to authenticated with check(bucket_id='ticket-snapshots' and name like '%/comments/%' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and t.status not in ('Completed','Closed') and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.is_it())));
alter policy ticket_files_remove on storage.objects using(bucket_id='ticket-snapshots' and name not like '%/comments/%' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and t.status<>'Completed' and (t.employee_id=auth.uid() or private.is_it())));
create table public.ticket_notifications (
 id bigint generated always as identity primary key,event_id bigint not null references public.ticket_activity(id),ticket_id uuid not null references public.tickets(id),recipient_id uuid not null references public.profiles(id),created_at timestamptz not null default clock_timestamp(),read_at timestamptz,email_status text not null default 'pending' check(email_status in ('pending','sent','not_configured','failed')),unique(event_id,recipient_id)
);
create index ticket_notifications_recipient_idx on public.ticket_notifications(recipient_id,created_at desc);
create index ticket_notifications_ticket_idx on public.ticket_notifications(ticket_id);
alter table public.ticket_notifications enable row level security;
revoke all on public.ticket_notifications from public,anon,authenticated;
grant select,update(read_at) on public.ticket_notifications to authenticated;
create policy notifications_read on public.ticket_notifications for select to authenticated using(recipient_id=(select auth.uid()) and private.is_employee());
create policy notifications_mark_read on public.ticket_notifications for update to authenticated using(recipient_id=(select auth.uid()) and private.is_employee()) with check(recipient_id=(select auth.uid()) and private.is_employee());
create function private.notify_ticket_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.ticket_notifications(event_id,ticket_id,recipient_id)
 select new.id,new.ticket_id,p.id from public.tickets t join public.profiles p on p.id in (t.employee_id,t.assigned_to) where t.id=new.ticket_id and p.active and p.id is distinct from new.actor_id;
 return new;
end $$;
revoke all on function private.notify_ticket_activity() from public,anon,authenticated;
create trigger notify_ticket_activity after insert on public.ticket_activity for each row execute function private.notify_ticket_activity();
