create table public.ticket_activity (
 id bigint generated always as identity primary key,
 ticket_id uuid not null references public.tickets(id),
 actor_id uuid references public.profiles(id),
 actor_name text not null,
 action text not null check(action in ('created','updated','commented')),
 changes jsonb not null default '[]'::jsonb,
 occurred_at timestamptz not null default clock_timestamp()
);
create index ticket_activity_ticket_time_idx on public.ticket_activity(ticket_id,occurred_at desc,id desc);
create index ticket_activity_actor_idx on public.ticket_activity(actor_id);
alter table public.ticket_activity enable row level security;
revoke all on public.ticket_activity from public,anon,authenticated;
grant select on public.ticket_activity to authenticated;
create policy activity_read on public.ticket_activity for select to authenticated using(private.is_employee() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.employee_id=auth.uid() or t.assigned_to=auth.uid() or private.is_it())));
create function private.record_ticket_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare who uuid; person text; target uuid; kind text; diff jsonb='[]'::jsonb; field text;
begin
 who=auth.uid();
 if tg_table_name='ticket_comments' then target=new.ticket_id;who=new.author_id;kind='commented';
 elsif tg_op='INSERT' then target=new.id;who=coalesce(who,new.employee_id);kind='created';
 else
  target=new.id;kind='updated';
  foreach field in array array['status','assigned_to','department_id','type_id','subtype_id','requirements','description','priority'] loop
   if (to_jsonb(old)->field) is distinct from (to_jsonb(new)->field) then diff=diff||jsonb_build_array(jsonb_build_object('field',field,'from',to_jsonb(old)->field,'to',to_jsonb(new)->field)); end if;
  end loop;
  if diff='[]'::jsonb then return new; end if;
 end if;
 select p.name into person from public.profiles p where p.id=who;
 insert into public.ticket_activity(ticket_id,actor_id,actor_name,action,changes,occurred_at)
 values(target,who,coalesce(person,'System'),kind,diff,case when kind in ('created','commented') then new.created_at else clock_timestamp() end);
 return new;
end; $$;
revoke all on function private.record_ticket_activity() from public,anon,authenticated;
create trigger tickets_activity after insert or update on public.tickets for each row execute function private.record_ticket_activity();
create trigger comments_activity after insert on public.ticket_comments for each row execute function private.record_ticket_activity();
insert into public.ticket_activity(ticket_id,actor_id,actor_name,action,occurred_at) select t.id,t.employee_id,p.name,'created',t.created_at from public.tickets t join public.profiles p on p.id=t.employee_id;
insert into public.ticket_activity(ticket_id,actor_id,actor_name,action,occurred_at) select c.ticket_id,c.author_id,p.name,'commented',c.created_at from public.ticket_comments c join public.profiles p on p.id=c.author_id;
