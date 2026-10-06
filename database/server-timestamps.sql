create function private.stamp_ticket_creation() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.created_at=clock_timestamp();if tg_table_name='tickets' then new.updated_at=new.created_at;end if;return new;end; $$;
revoke all on function private.stamp_ticket_creation() from public,anon,authenticated;
create trigger stamp_creation before insert on public.tickets for each row execute function private.stamp_ticket_creation();
create trigger stamp_creation before insert on public.ticket_comments for each row execute function private.stamp_ticket_creation();
