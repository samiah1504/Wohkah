-- =============================================================================
-- WOHKAH Phase 1 · Migration 8: member directory
--
-- Sign-in emails live in auth.users, which clients can't read. Administrators
-- need them to manage members, but ordinary employees should not get a list
-- of every colleague's email. This function returns the directory only to
-- holders of members.view in that company.
--
-- Rollback: drop function public.workspace_member_directory(uuid).
-- =============================================================================

create function public.workspace_member_directory(p_company uuid)
returns table (
  member_id uuid,
  user_id uuid,
  full_name text,
  email text,
  status public.member_status,
  joined_at timestamptz,
  roles jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_company_permission(p_company, 'members.view') then
    raise exception 'You don''t have permission to view members' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.user_id,
    coalesce(p.full_name, ''),
    u.email::text,
    m.status,
    m.joined_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_role_id', mr.id, 'role_id', r.id, 'name', r.name, 'system_key', r.system_key,
        'scope_type', mr.scope_type
      ) order by r.name)
      from public.member_roles mr
      join public.roles r on r.id = mr.role_id
      where mr.member_id = m.id
    ), '[]'::jsonb)
  from public.company_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.company_id = p_company
    and m.status <> 'removed'
  order by m.status, lower(coalesce(p.full_name, u.email));
end;
$$;

revoke all on function public.workspace_member_directory(uuid) from public, anon;
grant execute on function public.workspace_member_directory(uuid) to authenticated;
