create or replace function private.deactivate_directory_item(item_kind text,item_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_it() then raise exception 'IT access required'; end if;
 lock table public.departments,public.profiles,public.tickets in share row exclusive mode;
 if item_kind='employee' then
  if item_id=auth.uid() then raise exception 'You cannot delete your own login'; end if;
  if not exists(select 1 from public.profiles where id=item_id and active) then raise exception 'Active employee not found'; end if;
  if exists(select 1 from public.tickets where assigned_to=item_id and status not in ('Completed','Closed')) then raise exception 'Reassign unfinished tickets before deleting this employee'; end if;
  update public.profiles set active=false where id=item_id;
 elsif item_kind='department' then
  if not exists(select 1 from public.departments where id=item_id and active) then raise exception 'Active department not found'; end if;
  if exists(select 1 from public.profiles where department_id=item_id and active) then raise exception 'Delete or move all active employees before deleting this department'; end if;
  if exists(select 1 from public.tickets where department_id=item_id and status not in ('Completed','Closed')) then raise exception 'This department still has unfinished tickets'; end if;
  update public.departments set active=false where id=item_id;
 else raise exception 'Invalid directory item'; end if;
end; $$;
revoke all on function private.deactivate_directory_item(text,uuid) from public,anon;
grant execute on function private.deactivate_directory_item(text,uuid) to authenticated;
create or replace function public.deactivate_directory_item(item_kind text,item_id uuid) returns void
language sql security invoker set search_path='' as $$ select private.deactivate_directory_item(item_kind,item_id); $$;
revoke all on function public.deactivate_directory_item(text,uuid) from public,anon;
grant execute on function public.deactivate_directory_item(text,uuid) to authenticated;
