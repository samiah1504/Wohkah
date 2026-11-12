-- =============================================================================
-- WOHKAH · Migration 9: customer-facing role names (product language policy)
--
-- PRODUCT_LANGUAGE_AND_POSITIONING.md: customers see "Staff Manager" and
-- "Staff Member", not "HR Administrator" and "Employee". Only the display
-- names and descriptions change; system_key values stay the same, so code,
-- policies and tests are unaffected. Roles a business has already renamed
-- itself are left alone.
--
-- Rollback: rename back with the reverse UPDATEs and restore the previous
-- create_company() from migration 7.
-- =============================================================================

update public.roles set name = 'Staff Manager',
       description = 'Manages staff records, invitations and day-to-day staff matters.'
 where system_key = 'hr_admin' and name = 'HR Administrator';

update public.roles set name = 'Staff Member',
       description = 'Access to their own information in the staff portal.'
 where system_key = 'employee' and name = 'Employee';

update public.roles set description = 'Salaries and financial records.'
 where system_key = 'accountant' and description = 'Payroll and financial records.';

update public.roles set description = 'Branches, attendance, shifts and daily operations.'
 where system_key = 'ops_manager' and description = 'Branches, attendance, shifts and operations.';

update public.roles set description = 'Their department''s staff, tasks and approvals.'
 where system_key = 'dept_manager' and description = 'Their department''s team, tasks and approvals.';

update public.subscription_plans set description = 'More staff, departments and routines.'
 where code = 'growth' and description = 'More employees, departments and workflows.';

-- New workspaces get the new names.
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

  -- Abuse guard: at most 5 new workspaces per user per 24 hours.
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
    (v_company, 'Owner', 'Full control of the workspace, billing and roles.', 'owner', true),
    (v_company, 'Staff Manager', 'Manages staff records, invitations and day-to-day staff matters.', 'hr_admin', false),
    (v_company, 'Operations Manager', 'Branches, attendance, shifts and daily operations.', 'ops_manager', false),
    (v_company, 'Department Manager', 'Their department''s staff, tasks and approvals.', 'dept_manager', false),
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


revoke all on function public.create_company(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_company(text, text, text, text, text, text, text)
  to authenticated;
