-- =============================================================================
-- WOHKAH Phase 1 · Migration 6: integrity rules and audit logging
--
--  * profile created for every new auth user
--  * every company always keeps at least one active owner (deferred check)
--  * no privilege escalation: a member can only grant roles and permissions
--    they hold themselves; only owners grant or remove the Owner role
--  * plan limits (admins, branches) enforced in the database
--  * department hierarchy can't contain cycles
--  * generic row-level audit trigger on administrative tables
--
-- Rollback: drop the triggers and functions below.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- New auth user -> profile
-- ---------------------------------------------------------------------------
create function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- Permissions held by the current user with company scope
-- ---------------------------------------------------------------------------
create function app.my_company_permissions(p_company uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_key
  from public.company_members m
  join public.member_roles mr on mr.member_id = m.id and mr.scope_type = 'company'
  join public.role_permissions rp on rp.role_id = mr.role_id
  where m.company_id = p_company
    and m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

-- May the current user grant (or remove) this role? Owner role: owners only.
-- Any other role: only if every permission in it is one the user already holds.
create function app.can_grant_role(p_company uuid, p_role uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_system_key text;
begin
  select r.system_key into v_system_key
  from public.roles r
  where r.id = p_role and r.company_id = p_company;

  if not found then
    return false;
  end if;

  if v_system_key = 'owner' then
    return app.is_owner(p_company);
  end if;

  return not exists (
    select rp.permission_key
    from public.role_permissions rp
    where rp.role_id = p_role
    except
    select app.my_company_permissions(p_company)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- member_roles: escalation guard (client writes), owner scope, admin limit
-- ---------------------------------------------------------------------------
create function app.member_roles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row public.member_roles;
  v_system_key text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;

  select r.system_key into v_system_key from public.roles r where r.id = v_row.role_id;

  if v_system_key = 'owner' and v_row.scope_type <> 'company' then
    raise exception 'The Owner role can only be assigned company-wide' using errcode = '23514';
  end if;

  if app.is_client_context() and not app.can_grant_role(v_row.company_id, v_row.role_id) then
    raise exception 'You can only assign or remove roles whose permissions you hold yourself'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger member_roles_guard
  before insert or delete on public.member_roles
  for each row execute function app.member_roles_guard();

-- Free plan: one administrator. "Administrator" = active member holding any
-- role other than the system Employee role.
create function app.count_admins(p_company uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct m.id)::int
  from public.company_members m
  join public.member_roles mr on mr.member_id = m.id
  join public.roles r on r.id = mr.role_id
  where m.company_id = p_company
    and m.status = 'active'
    and r.system_key is distinct from 'employee';
$$;

create function app.enforce_admin_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.assert_within_limit(new.company_id, 'admins', app.count_admins(new.company_id));
  return null;
end;
$$;

create trigger member_roles_admin_limit
  after insert on public.member_roles
  for each row execute function app.enforce_admin_limit();

create trigger company_members_admin_limit
  after update of status on public.company_members
  for each row
  when (new.status = 'active' and old.status <> 'active')
  execute function app.enforce_admin_limit();

-- Every company keeps at least one active owner. Deferred, so ownership can be
-- transferred inside one transaction (add new owner, then remove the old one).
create function app.assert_company_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := old.company_id;
begin
  if exists (select 1 from public.companies c where c.id = v_company)
     and not exists (
       select 1
       from public.company_members m
       join public.member_roles mr on mr.member_id = m.id
       join public.roles r on r.id = mr.role_id and r.system_key = 'owner'
       where m.company_id = v_company and m.status = 'active'
     ) then
    raise exception 'A workspace must always have at least one active owner'
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger member_roles_keep_owner
  after delete on public.member_roles
  deferrable initially deferred
  for each row execute function app.assert_company_has_owner();

create constraint trigger company_members_keep_owner
  after update of status on public.company_members
  deferrable initially deferred
  for each row
  when (old.status = 'active' and new.status <> 'active')
  execute function app.assert_company_has_owner();

-- Only owners may change the status of an owner; nobody changes their own status.
create function app.company_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not app.is_client_context() then
    return new;
  end if;

  if new.user_id = (select auth.uid()) then
    raise exception 'You cannot change your own membership status' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.member_roles mr
    join public.roles r on r.id = mr.role_id and r.system_key = 'owner'
    where mr.member_id = new.id
  ) and not app.is_owner(new.company_id) then
    raise exception 'Only an owner can change the status of another owner' using errcode = '42501';
  end if;

  new.removed_at := case when new.status = 'removed' then coalesce(new.removed_at, now()) else null end;
  return new;
end;
$$;

create trigger company_members_guard
  before update on public.company_members
  for each row execute function app.company_members_guard();

-- ---------------------------------------------------------------------------
-- roles and role_permissions
-- ---------------------------------------------------------------------------
create function app.roles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.system_key is not null then
    raise exception 'System roles cannot be deleted' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.is_locked and app.is_client_context() then
    raise exception 'The Owner role cannot be changed' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger roles_guard
  before update or delete on public.roles
  for each row execute function app.roles_guard();

create function app.role_permissions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row public.role_permissions;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;

  if not app.is_client_context() then
    return v_row;
  end if;

  if exists (select 1 from public.roles r where r.id = v_row.role_id and r.is_locked) then
    raise exception 'The Owner role''s permissions cannot be changed' using errcode = '42501';
  end if;

  if not exists (
    select 1 from app.my_company_permissions(v_row.company_id) p where p = v_row.permission_key
  ) then
    raise exception 'You can only grant or remove permissions you hold yourself'
      using errcode = '42501';
  end if;

  return v_row;
end;
$$;

create trigger role_permissions_guard
  before insert or delete on public.role_permissions
  for each row execute function app.role_permissions_guard();

-- ---------------------------------------------------------------------------
-- Invitations: the roles offered must belong to the company and be grantable
-- ---------------------------------------------------------------------------
create function app.company_invitations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role uuid;
begin
  if tg_op = 'INSERT' then
    foreach v_role in array new.role_ids loop
      if not exists (
        select 1 from public.roles r where r.id = v_role and r.company_id = new.company_id
      ) then
        raise exception 'Invitation role does not belong to this workspace' using errcode = '23503';
      end if;
      if app.is_client_context() and not app.can_grant_role(new.company_id, v_role) then
        raise exception 'You can only invite people into roles whose permissions you hold'
          using errcode = '42501';
      end if;
    end loop;
  end if;

  if tg_op = 'UPDATE' and new.status = 'revoked' and old.status = 'pending' then
    new.revoked_at := now();
  end if;
  return new;
end;
$$;

create trigger company_invitations_guard
  before insert or update on public.company_invitations
  for each row execute function app.company_invitations_guard();

-- ---------------------------------------------------------------------------
-- Branches: plan limit on active branches
-- ---------------------------------------------------------------------------
create function app.enforce_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is null then
    perform app.assert_within_limit(
      new.company_id,
      'branches',
      (select count(*)::int from public.branches b
        where b.company_id = new.company_id and b.archived_at is null)
    );
  end if;
  return null;
end;
$$;

create trigger branches_limit
  after insert or update of archived_at on public.branches
  for each row execute function app.enforce_branch_limit();

-- ---------------------------------------------------------------------------
-- Departments: no cycles in the hierarchy
-- ---------------------------------------------------------------------------
create function app.departments_no_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and exists (
    with recursive ancestors as (
      select d.id, d.parent_id, 1 as depth
      from public.departments d
      where d.id = new.parent_id
      union all
      select d.id, d.parent_id, a.depth + 1
      from public.departments d
      join ancestors a on d.id = a.parent_id
      where a.depth < 50
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A department cannot be placed under itself or one of its sub-departments'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger departments_no_cycle
  before insert or update of parent_id on public.departments
  for each row execute function app.departments_no_cycle();

-- ---------------------------------------------------------------------------
-- Generic audit trigger
-- Records who changed what. The WOHKAH server forwards the end user's IP and
-- user agent as request headers (x-wohkah-client-ip, x-wohkah-user-agent);
-- they are informational, not a security control.
-- ---------------------------------------------------------------------------
create function app.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_company uuid;
  v_headers jsonb;
  v_ip inet;
  v_actor uuid := (select auth.uid());
  v_redact text[] := array['token_hash', 'created_at', 'updated_at'];
begin
  v_company := case
    when tg_table_name = 'companies' then (v_row ->> 'id')::uuid
    else (v_row ->> 'company_id')::uuid
  end;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)), '{}'::jsonb)
      into v_changes
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key <> all (v_redact);
    if v_changes = '{}'::jsonb then
      return null; -- nothing meaningful changed
    end if;
  else
    v_changes := v_row - v_redact;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := nullif(split_part(v_headers ->> 'x-wohkah-client-ip', ',', 1), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.audit_logs
    (company_id, actor_user_id, actor_type, action, entity_type, entity_id, changes, ip, user_agent)
  values (
    v_company,
    v_actor,
    case when v_actor is null then 'system' else 'user' end,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'role_id'),
    v_changes,
    v_ip,
    left(v_headers ->> 'x-wohkah-user-agent', 300)
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'company_members', 'departments', 'branches', 'public_holidays',
    'roles', 'role_permissions', 'member_roles', 'company_invitations',
    'company_subscriptions', 'company_feature_overrides', 'platform_admins',
    'support_access_grants'
  ] loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I
         for each row execute function app.audit_row()', t);
  end loop;
end;
$$;

grant execute on all functions in schema app to authenticated, service_role;
