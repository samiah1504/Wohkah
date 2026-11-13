-- =============================================================================
-- WOHKAH · Migration 13: departments removed entirely; Department Manager
-- replaced by Operations Manager (product owner, 2026-11-14)
--
-- 1. Anyone holding Department Manager gets Operations Manager (company-wide)
--    instead; pending invitations offering it are switched the same way.
-- 2. Department-scoped role assignments of any other role are removed
--    (fail closed: nobody gains access they didn't have).
-- 3. The Department Manager system role, the departments.manage permission,
--    the departments table, member_roles.department_id,
--    employees.department_id and the 'department' role scope are removed.
--
-- Safety net: everything removed in step 2–3 that held data is first copied
-- into the private `archive` schema (no grants to app users, not exposed by
-- the API), so it can be restored or inspected. Drop that schema in a later
-- migration once the product owner confirms it is no longer needed.
--
-- Audit-log entries about departments stay (the audit log is append-only).
--
-- Rollback: recreate the objects from migrations 1–12 and copy rows back from
-- the archive tables; restore member_roles for Department Manager holders from
-- archive.dept_manager_assignments.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Archive copies (private)
-- ---------------------------------------------------------------------------
create schema if not exists archive;
revoke all on schema archive from public, anon, authenticated;

create table archive.departments_20261114 as select * from public.departments;
create table archive.department_scoped_roles_20261114 as
  select * from public.member_roles where scope_type = 'department';
create table archive.employee_departments_20261114 as
  select id as employee_id, company_id, department_id from public.employees
  where department_id is not null;
create table archive.dept_manager_assignments_20261114 as
  select mr.* from public.member_roles mr
  join public.roles r on r.id = mr.role_id
  where r.system_key = 'dept_manager';
alter table archive.department_scoped_roles_20261114 alter column scope_type type text;
alter table archive.dept_manager_assignments_20261114 alter column scope_type type text;

-- ---------------------------------------------------------------------------
-- 1. Department Manager → Operations Manager
-- ---------------------------------------------------------------------------
insert into public.member_roles (company_id, member_id, role_id, scope_type)
select distinct mr.company_id, mr.member_id, ops.id, 'company'::public.role_scope
from public.member_roles mr
join public.roles dm on dm.id = mr.role_id and dm.system_key = 'dept_manager'
join public.roles ops on ops.company_id = mr.company_id and ops.system_key = 'ops_manager'
on conflict do nothing;

update public.company_invitations i
   set role_ids = (
     select coalesce(array_agg(distinct coalesce(ops.id, x.role_id)), '{}')
     from unnest(i.role_ids) as x(role_id)
     left join public.roles dm on dm.id = x.role_id and dm.system_key = 'dept_manager'
     left join public.roles ops on dm.id is not null
       and ops.company_id = i.company_id and ops.system_key = 'ops_manager'
   )
 where exists (
   select 1 from unnest(i.role_ids) as x(role_id)
   join public.roles dm on dm.id = x.role_id and dm.system_key = 'dept_manager'
 );

delete from public.member_roles mr
 using public.roles dm
 where dm.id = mr.role_id and dm.system_key = 'dept_manager';

-- System roles can't normally be deleted; this is the one deliberate exception.
alter table public.roles disable trigger roles_guard;
delete from public.roles where system_key = 'dept_manager';
alter table public.roles enable trigger roles_guard;

delete from public.role_templates where system_key = 'dept_manager';
alter table public.role_templates drop constraint if exists role_templates_system_key_check;
alter table public.role_templates add constraint role_templates_system_key_check
  check (system_key in ('owner', 'hr_admin', 'ops_manager', 'accountant', 'employee'));
alter table public.roles drop constraint if exists roles_system_key_check;
alter table public.roles add constraint roles_system_key_check
  check (system_key in ('owner', 'hr_admin', 'ops_manager', 'accountant', 'employee'));

-- New businesses no longer get a Department Manager role.
create or replace function public.create_company(
  p_name text,
  p_slug text,
  p_country_code text default 'NG',
  p_timezone text default 'Africa/Lagos',
  p_currency text default 'NGN',
  p_industry text default null,
  p_size_band text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_confirmed timestamptz;
  v_company uuid;
  v_member uuid;
  v_owner_role uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select u.email_confirmed_at into v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  if app.is_reserved_slug(p_slug) then
    raise exception 'slug_reserved' using errcode = '22023';
  end if;

  -- Abuse guard: at most 5 new companies per user per 24 hours.
  if (select count(*) from public.companies c
        where c.created_by = v_uid and c.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too_many_companies' using errcode = '54000';
  end if;

  begin
    insert into public.companies
      (name, slug, country_code, timezone, currency, industry, size_band, created_by)
    values
      (trim(p_name), lower(trim(p_slug)), upper(p_country_code), p_timezone, upper(p_currency),
       nullif(trim(p_industry), ''), nullif(p_size_band, ''), v_uid)
    returning id into v_company;
  exception when unique_violation then
    raise exception 'slug_taken' using errcode = '23505';
  end;

  insert into public.company_members (company_id, user_id, status)
  values (v_company, v_uid, 'active')
  returning id into v_member;

  insert into public.roles (company_id, name, description, system_key, is_locked)
  values
    (v_company, 'Owner', 'Full control of the business account, subscription and roles.', 'owner', true),
    (v_company, 'Staff Manager', 'Manages staff records, invitations and day-to-day staff matters.', 'hr_admin', false),
    (v_company, 'Operations Manager', 'Branches, attendance, shifts and daily operations.', 'ops_manager', false),
    (v_company, 'Accountant', 'Salaries and financial records.', 'accountant', false),
    (v_company, 'Staff Member', 'Access to their own information in the staff portal.', 'employee', false);

  insert into public.role_permissions (company_id, role_id, permission_key)
  select v_company, r.id, t.permission_key
  from public.roles r
  join public.role_templates t on t.system_key = r.system_key
  where r.company_id = v_company;

  select r.id into v_owner_role
  from public.roles r where r.company_id = v_company and r.system_key = 'owner';

  insert into public.member_roles (company_id, member_id, role_id, scope_type, created_by)
  values (v_company, v_member, v_owner_role, 'company', v_uid);

  insert into public.company_subscriptions (company_id, plan_id, status, current_period_start)
  select v_company, p.id, 'active', now()
  from public.subscription_plans p where p.code = 'free';

  return v_company;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Department-scoped assignments (none are created by the app)
-- ---------------------------------------------------------------------------
delete from public.member_roles where scope_type = 'department';

-- ---------------------------------------------------------------------------
-- 3. Remove departments from the schema
-- ---------------------------------------------------------------------------
-- Permission (role_permissions and role_templates rows cascade).
delete from public.permissions where key = 'departments.manage';

-- Scope-aware permission helper: company or branch scope only.
drop function if exists app.has_permission_for(uuid, text, uuid, uuid);
create function app.has_permission_for(p_company uuid, p_key text, p_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.member_roles mr on mr.member_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.company_id = p_company
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and rp.permission_key = p_key
      and (mr.scope_type = 'company' or (mr.scope_type = 'branch' and mr.branch_id = p_branch))
  );
$$;
revoke all on function app.has_permission_for(uuid, text, uuid) from public, anon;
grant execute on function app.has_permission_for(uuid, text, uuid) to authenticated, service_role;

-- Workspace context no longer returns a department id.
create or replace function public.workspace_context(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'company', jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'name', c.name, 'status', c.status,
      'country_code', c.country_code, 'timezone', c.timezone, 'currency', c.currency,
      'logo_path', c.logo_path
    ),
    'member_id', m.id,
    'permissions', coalesce((
      select jsonb_agg(distinct rp.permission_key)
      from public.member_roles mr
      join public.role_permissions rp on rp.role_id = mr.role_id
      where mr.member_id = m.id
    ), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role_id', r.id, 'name', r.name, 'system_key', r.system_key,
        'scope_type', mr.scope_type, 'branch_id', mr.branch_id
      ))
      from public.member_roles mr
      join public.roles r on r.id = mr.role_id
      where mr.member_id = m.id
    ), '[]'::jsonb),
    'plan', (
      select jsonb_build_object('code', p.code, 'name', p.name)
      from public.subscription_plans p
      where p.id = app.company_plan_id(c.id)
    ),
    'subscription_status', (
      select s.status from public.company_subscriptions s where s.company_id = c.id
    ),
    'features', (
      select jsonb_object_agg(f.key, jsonb_build_object(
        'enabled', app.company_has_feature(c.id, f.key),
        'limit', case when f.kind = 'limit' then app.company_feature_limit(c.id, f.key) end
      ))
      from public.features f
    )
  )
  from public.companies c
  join public.company_members m
    on m.company_id = c.id and m.user_id = (select auth.uid()) and m.status = 'active'
  where c.slug = lower(p_slug);
$$;

-- member_roles: drop the department column and the 'department' scope.
alter table public.member_roles drop constraint member_roles_scope_check;
drop index public.member_roles_uniq;
alter table public.member_roles drop column department_id;
alter table public.member_roles alter column scope_type drop default;
alter type public.role_scope rename to role_scope_old;
create type public.role_scope as enum ('company', 'branch');
alter table public.member_roles
  alter column scope_type type public.role_scope using scope_type::text::public.role_scope;
alter table public.member_roles alter column scope_type set default 'company';
drop type public.role_scope_old;
alter table public.member_roles add constraint member_roles_scope_check check (
  (scope_type = 'company' and branch_id is null)
  or (scope_type = 'branch' and branch_id is not null)
);
create unique index member_roles_uniq
  on public.member_roles (member_id, role_id, scope_type, branch_id) nulls not distinct;

-- Staff records.
alter table public.employees drop column department_id;

-- The departments table (policies, triggers and grants go with it).
drop table public.departments;
drop function if exists app.departments_no_cycle();
