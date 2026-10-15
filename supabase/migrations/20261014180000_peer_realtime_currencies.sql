-- 1. Realtime: the app listens for changes to the user's own transactions
--    (e.g. a transfer a linked person just sent, mirrored into their
--    ledger) and to their links (an invite was accepted), so those show up
--    without reloading. Realtime applies each table's RLS to what it sends,
--    so a user only ever receives their own rows.
-- 2. `linked_peers` also returns, for each person, the currencies they can
--    receive in (they have an active receiving account for), so the app can
--    tell the sender up front instead of failing on save.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
    ) then
      alter publication supabase_realtime add table public.transactions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'peer_links'
    ) then
      alter publication supabase_realtime add table public.peer_links;
    end if;
  end if;
end;
$$;

-- The return type changes, so it has to be dropped and recreated.
drop function public.linked_peers();

create function public.linked_peers()
returns table (
  link_id uuid,
  peer_id uuid,
  peer_name text,
  status text,
  code text,
  expires_at timestamptz,
  is_inviter boolean,
  receive_currencies text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select
      l.*,
      case when l.inviter_id = (select auth.uid()) then l.invitee_id else l.inviter_id end as other
    from public.peer_links l
    where (select auth.uid()) in (l.inviter_id, l.invitee_id)
      and (l.status = 'accepted' or l.expires_at > now())
  )
  select
    m.id,
    m.other,
    (select left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)), 60)
       from public.profiles p where p.id = m.other),
    m.status,
    case when m.inviter_id = (select auth.uid()) then m.code end,
    m.expires_at,
    m.inviter_id = (select auth.uid()),
    -- Where the other person has an active account set to receive from me.
    coalesce((
      select array_agg(distinct c.currency order by c.currency)
      from public.accounts c
      join public.accounts r on r.id = c.receive_into_account_id
      where c.user_id = m.other
        and c.peer_user_id = (select auth.uid())
        and c.type = 'contact'
        and not r.archived
    ), '{}')
  from mine m
  order by m.status, m.created_at desc;
$$;

grant execute on function public.linked_peers() to authenticated;
