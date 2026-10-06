grant delete on public.ticket_snapshots to authenticated;
create policy snapshots_remove on public.ticket_snapshots for delete to authenticated
using(exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=(select auth.uid()) or (select private.is_it()))));
create policy ticket_files_remove on storage.objects for delete to authenticated
using(bucket_id='ticket-snapshots' and exists(select 1 from public.tickets t where t.id::text=split_part(name,'/',1) and (t.employee_id=(select auth.uid()) or (select private.is_it()))));
