alter table public.ticket_activity add column comment_body text;
update public.ticket_activity a set comment_body=c.body from public.ticket_comments c where a.action='commented' and a.ticket_id=c.ticket_id and a.actor_id=c.author_id and a.occurred_at=c.created_at;
create function private.record_comment_body() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.ticket_activity set comment_body=new.body where ticket_id=new.ticket_id and action='commented' and actor_id=new.author_id and occurred_at=new.created_at;
 return new;
end; $$;
revoke all on function private.record_comment_body() from public,anon,authenticated;
create trigger z_comment_body after insert on public.ticket_comments for each row execute function private.record_comment_body();
create function private.lock_completed_ticket() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='Completed' then raise exception 'Completed tickets are read-only' using errcode='42501'; end if;
 return new;
end; $$;
revoke all on function private.lock_completed_ticket() from public,anon,authenticated;
create trigger completed_ticket_lock before update on public.tickets for each row execute function private.lock_completed_ticket();
create function private.guard_ticket_comment() returns trigger language plpgsql security invoker set search_path='' as $$
declare current_status text;
begin
 select status into current_status from public.tickets where id=new.ticket_id for share;
 if current_status is null or current_status='Completed' then raise exception 'Completed tickets are read-only' using errcode='42501'; end if;
 return new;
end; $$;
revoke all on function private.guard_ticket_comment() from public,anon,authenticated;
create trigger comment_completed_lock before insert on public.ticket_comments for each row execute function private.guard_ticket_comment();
drop policy snapshots_add on public.ticket_snapshots;
create policy snapshots_add on public.ticket_snapshots for insert to authenticated with check(exists(select 1 from public.tickets t where t.id=ticket_id and t.status<>'Completed' and (t.employee_id=auth.uid() or private.is_it())));
drop policy snapshots_remove on public.ticket_snapshots;
create policy snapshots_remove on public.ticket_snapshots for delete to authenticated using(exists(select 1 from public.tickets t where t.id=ticket_id and t.status<>'Completed' and (t.employee_id=auth.uid() or private.is_it())));
drop policy ticket_files_add on storage.objects;
create policy ticket_files_add on storage.objects for insert to authenticated with check(bucket_id='ticket-snapshots' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and t.status<>'Completed' and (t.employee_id=auth.uid() or private.is_it())));
drop policy ticket_files_remove on storage.objects;
create policy ticket_files_remove on storage.objects for delete to authenticated using(bucket_id='ticket-snapshots' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and t.status<>'Completed' and (t.employee_id=auth.uid() or private.is_it())));
