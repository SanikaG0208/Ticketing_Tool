create function private.guard_ticket_fields() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then
 raise exception 'Existing tickets allow status updates and comments only' using errcode='42501';
 end if;
 return new;
end; $$;
revoke all on function private.guard_ticket_fields() from public,anon,authenticated;
create trigger ticket_fields_read_only before update on public.tickets for each row execute function private.guard_ticket_fields();
