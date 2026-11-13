-- =============================================================================
-- WOHKAH · Migration 10: approved pricing, allowances, staff, work locations,
-- seven-day trials and billing records (Paystack-ready).
--
-- Product owner decisions (2026-11-12/13), see docs/PRICING_AUDIT.md:
--  * Four plans: Free ₦0, Starter ₦5,000, Growth ₦10,000, Business ₦15,000.
--    Annual = 10 × monthly. Scale is withdrawn (hidden, never deleted).
--  * Included active staff 3/10/25/50. Extra staff ₦1,000/month or
--    ₦12,000/year, paid plans only.
--  * Included work locations 1/2/5/10. Extra locations ₦1,000/month or
--    ₦12,000/year.
--  * Branches 1/1/1/unlimited; departments 1/1/10/unlimited.
--  * 7-day trial, no card: one per workspace, one per owner per 12 months.
--    Expiry falls back to Free; nothing is deleted; excess staff are paused
--    only through the owner's selection.
--  * Custom domains are not offered (entitlement disabled everywhere).
--
-- Rollback (development only): drop the new tables, functions, triggers and
-- columns; restore plan rows from migration 4.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Plans: prices, add-on prices, trial length, documented support
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column extra_staff_annual_price_minor bigint not null default 0
    check (extra_staff_annual_price_minor >= 0),
  add column allows_extra_staff boolean not null default false,
  add column extra_work_location_price_minor bigint not null default 0
    check (extra_work_location_price_minor >= 0),
  add column extra_work_location_annual_price_minor bigint not null default 0
    check (extra_work_location_annual_price_minor >= 0),
  add column allows_extra_work_locations boolean not null default false,
  add column trial_days int not null default 0 check (trial_days between 0 and 31),
  add column support_level text,
  add column report_history_months int check (report_history_months is null or report_history_months > 0);

comment on column public.subscription_plans.support_level is
  'Only set where the product owner has approved a support level. NULL = not stated (not shown).';

update public.subscription_plans set
  monthly_price_minor = v.monthly, annual_price_minor = v.annual,
  included_employees = v.staff,
  extra_employee_price_minor = 100000, extra_staff_annual_price_minor = 1200000,
  allows_extra_staff = v.extra_staff,
  extra_work_location_price_minor = 100000, extra_work_location_annual_price_minor = 1200000,
  allows_extra_work_locations = true,
  trial_days = v.trial, support_level = v.support, report_history_months = v.history,
  description = v.description
from (values
  ('free',     0,       null::bigint, 3,  false, 0, null::text,         null::int,
   'For very small teams getting organised. Free forever.'),
  ('starter',  500000,  5000000,      10, true,  7, 'Email support',    12,
   'For small businesses that need professional staff management.'),
  ('growth',   1000000, 10000000,     25, true,  7, 'Priority support', null,
   'For businesses managing more staff, departments and routines.'),
  ('business', 1500000, 15000000,     50, true,  7, 'Priority support', null,
   'For businesses with several branches and busier operations.')
) as v(code, monthly, annual, staff, extra_staff, trial, support, history, description)
where subscription_plans.code = v.code;

-- Scale is withdrawn: never offered again, history kept.
update public.subscription_plans set is_public = false, is_active = false where code = 'scale';

-- ---------------------------------------------------------------------------
-- 2. Feature catalogue and plan matrix (mirrors src/lib/plans/catalog.ts;
--    tests/db/catalog.test.ts checks they are identical)
-- ---------------------------------------------------------------------------
insert into public.features (key, kind, description) values
  ('departments', 'limit', 'Active departments'),
  ('staff_records', 'boolean', 'Plan feature: staff records'),
  ('staff_portal', 'boolean', 'Plan feature: staff portal'),
  ('gps_clock_in', 'boolean', 'Plan feature: gps clock in'),
  ('basic_attendance', 'boolean', 'Plan feature: basic attendance'),
  ('basic_salaries', 'boolean', 'Plan feature: basic salaries'),
  ('leave_requests', 'boolean', 'Plan feature: leave requests'),
  ('basic_tasks', 'boolean', 'Plan feature: basic tasks'),
  ('staff_messaging', 'boolean', 'Plan feature: staff messaging'),
  ('announcements', 'boolean', 'Plan feature: announcements'),
  ('basic_reports', 'boolean', 'Plan feature: basic reports'),
  ('full_attendance', 'boolean', 'Plan feature: full attendance'),
  ('full_salaries', 'boolean', 'Plan feature: full salaries'),
  ('salary_advances', 'boolean', 'Plan feature: salary advances'),
  ('salary_slips', 'boolean', 'Plan feature: salary slips'),
  ('meetings', 'boolean', 'Plan feature: meetings'),
  ('company_documents', 'boolean', 'Plan feature: company documents'),
  ('advanced_salaries', 'boolean', 'Plan feature: advanced salaries'),
  ('advanced_attendance_reports', 'boolean', 'Plan feature: advanced attendance reports'),
  ('staff_performance', 'boolean', 'Plan feature: staff performance'),
  ('meeting_minutes', 'boolean', 'Plan feature: meeting minutes'),
  ('advanced_lifecycle', 'boolean', 'Plan feature: advanced lifecycle'),
  ('advanced_approval_workflows', 'boolean', 'Plan feature: advanced approval workflows'),
  ('detailed_access_controls', 'boolean', 'Plan feature: detailed access controls'),
  ('extended_audit_history', 'boolean', 'Plan feature: extended audit history');

delete from public.plan_features;

with matrix (plan_code, feature_key, enabled, limit_value) as (
  values
  ('free','admins',true,1),
  ('starter','admins',true,2),
  ('growth','admins',true,5),
  ('business','admins',true,10),
  ('scale','admins',true,null::int),
  ('free','branches',true,1),
  ('starter','branches',true,1),
  ('growth','branches',true,1),
  ('business','branches',true,null::int),
  ('scale','branches',true,null::int),
  ('free','departments',true,1),
  ('starter','departments',true,1),
  ('growth','departments',true,10),
  ('business','departments',true,null::int),
  ('scale','departments',true,null::int),
  ('free','work_locations',true,1),
  ('starter','work_locations',true,2),
  ('growth','work_locations',true,5),
  ('business','work_locations',true,10),
  ('scale','work_locations',true,null::int),
  ('free','storage_mb',true,500),
  ('starter','storage_mb',true,5120),
  ('growth','storage_mb',true,20480),
  ('business','storage_mb',true,51200),
  ('scale','storage_mb',true,102400),
  ('free','custom_domains',false,0),
  ('starter','custom_domains',false,0),
  ('growth','custom_domains',false,0),
  ('business','custom_domains',false,0),
  ('scale','custom_domains',false,0),
  ('free','staff_records',true,null::int),
  ('starter','staff_records',true,null::int),
  ('growth','staff_records',true,null::int),
  ('business','staff_records',true,null::int),
  ('scale','staff_records',true,null::int),
  ('free','staff_portal',true,null::int),
  ('starter','staff_portal',true,null::int),
  ('growth','staff_portal',true,null::int),
  ('business','staff_portal',true,null::int),
  ('scale','staff_portal',true,null::int),
  ('free','gps_clock_in',true,null::int),
  ('starter','gps_clock_in',true,null::int),
  ('growth','gps_clock_in',true,null::int),
  ('business','gps_clock_in',true,null::int),
  ('scale','gps_clock_in',true,null::int),
  ('free','basic_attendance',true,null::int),
  ('starter','basic_attendance',true,null::int),
  ('growth','basic_attendance',true,null::int),
  ('business','basic_attendance',true,null::int),
  ('scale','basic_attendance',true,null::int),
  ('free','basic_salaries',true,null::int),
  ('starter','basic_salaries',true,null::int),
  ('growth','basic_salaries',true,null::int),
  ('business','basic_salaries',true,null::int),
  ('scale','basic_salaries',true,null::int),
  ('free','leave_requests',true,null::int),
  ('starter','leave_requests',true,null::int),
  ('growth','leave_requests',true,null::int),
  ('business','leave_requests',true,null::int),
  ('scale','leave_requests',true,null::int),
  ('free','basic_tasks',true,null::int),
  ('starter','basic_tasks',true,null::int),
  ('growth','basic_tasks',true,null::int),
  ('business','basic_tasks',true,null::int),
  ('scale','basic_tasks',true,null::int),
  ('free','staff_messaging',true,null::int),
  ('starter','staff_messaging',true,null::int),
  ('growth','staff_messaging',true,null::int),
  ('business','staff_messaging',true,null::int),
  ('scale','staff_messaging',true,null::int),
  ('free','announcements',true,null::int),
  ('starter','announcements',true,null::int),
  ('growth','announcements',true,null::int),
  ('business','announcements',true,null::int),
  ('scale','announcements',true,null::int),
  ('free','basic_reports',true,null::int),
  ('starter','basic_reports',true,null::int),
  ('growth','basic_reports',true,null::int),
  ('business','basic_reports',true,null::int),
  ('scale','basic_reports',true,null::int),
  ('free','advanced_onboarding',false,null::int),
  ('starter','advanced_onboarding',true,null::int),
  ('growth','advanced_onboarding',true,null::int),
  ('business','advanced_onboarding',true,null::int),
  ('scale','advanced_onboarding',true,null::int),
  ('free','digital_contracts',false,null::int),
  ('starter','digital_contracts',true,null::int),
  ('growth','digital_contracts',true,null::int),
  ('business','digital_contracts',true,null::int),
  ('scale','digital_contracts',true,null::int),
  ('free','job_descriptions',false,null::int),
  ('starter','job_descriptions',true,null::int),
  ('growth','job_descriptions',true,null::int),
  ('business','job_descriptions',true,null::int),
  ('scale','job_descriptions',true,null::int),
  ('free','full_attendance',false,null::int),
  ('starter','full_attendance',true,null::int),
  ('growth','full_attendance',true,null::int),
  ('business','full_attendance',true,null::int),
  ('scale','full_attendance',true,null::int),
  ('free','full_salaries',false,null::int),
  ('starter','full_salaries',true,null::int),
  ('growth','full_salaries',true,null::int),
  ('business','full_salaries',true,null::int),
  ('scale','full_salaries',true,null::int),
  ('free','salary_advances',false,null::int),
  ('starter','salary_advances',true,null::int),
  ('growth','salary_advances',true,null::int),
  ('business','salary_advances',true,null::int),
  ('scale','salary_advances',true,null::int),
  ('free','salary_slips',false,null::int),
  ('starter','salary_slips',true,null::int),
  ('growth','salary_slips',true,null::int),
  ('business','salary_slips',true,null::int),
  ('scale','salary_slips',true,null::int),
  ('free','meetings',false,null::int),
  ('starter','meetings',true,null::int),
  ('growth','meetings',true,null::int),
  ('business','meetings',true,null::int),
  ('scale','meetings',true,null::int),
  ('free','company_documents',false,null::int),
  ('starter','company_documents',true,null::int),
  ('growth','company_documents',true,null::int),
  ('business','company_documents',true,null::int),
  ('scale','company_documents',true,null::int),
  ('free','custom_roles',false,null::int),
  ('starter','custom_roles',false,null::int),
  ('growth','custom_roles',true,null::int),
  ('business','custom_roles',true,null::int),
  ('scale','custom_roles',true,null::int),
  ('free','advanced_approvals',false,null::int),
  ('starter','advanced_approvals',false,null::int),
  ('growth','advanced_approvals',true,null::int),
  ('business','advanced_approvals',true,null::int),
  ('scale','advanced_approvals',true,null::int),
  ('free','advanced_salaries',false,null::int),
  ('starter','advanced_salaries',false,null::int),
  ('growth','advanced_salaries',true,null::int),
  ('business','advanced_salaries',true,null::int),
  ('scale','advanced_salaries',true,null::int),
  ('free','advanced_attendance_reports',false,null::int),
  ('starter','advanced_attendance_reports',false,null::int),
  ('growth','advanced_attendance_reports',true,null::int),
  ('business','advanced_attendance_reports',true,null::int),
  ('scale','advanced_attendance_reports',true,null::int),
  ('free','staff_performance',false,null::int),
  ('starter','staff_performance',false,null::int),
  ('growth','staff_performance',true,null::int),
  ('business','staff_performance',true,null::int),
  ('scale','staff_performance',true,null::int),
  ('free','meeting_minutes',false,null::int),
  ('starter','meeting_minutes',false,null::int),
  ('growth','meeting_minutes',true,null::int),
  ('business','meeting_minutes',true,null::int),
  ('scale','meeting_minutes',true,null::int),
  ('free','advanced_lifecycle',false,null::int),
  ('starter','advanced_lifecycle',false,null::int),
  ('growth','advanced_lifecycle',true,null::int),
  ('business','advanced_lifecycle',true,null::int),
  ('scale','advanced_lifecycle',true,null::int),
  ('free','advanced_analytics',false,null::int),
  ('starter','advanced_analytics',false,null::int),
  ('growth','advanced_analytics',false,null::int),
  ('business','advanced_analytics',true,null::int),
  ('scale','advanced_analytics',true,null::int),
  ('free','advanced_reporting',false,null::int),
  ('starter','advanced_reporting',false,null::int),
  ('growth','advanced_reporting',false,null::int),
  ('business','advanced_reporting',true,null::int),
  ('scale','advanced_reporting',true,null::int),
  ('free','advanced_approval_workflows',false,null::int),
  ('starter','advanced_approval_workflows',false,null::int),
  ('growth','advanced_approval_workflows',false,null::int),
  ('business','advanced_approval_workflows',true,null::int),
  ('scale','advanced_approval_workflows',true,null::int),
  ('free','detailed_access_controls',false,null::int),
  ('starter','detailed_access_controls',false,null::int),
  ('growth','detailed_access_controls',false,null::int),
  ('business','detailed_access_controls',true,null::int),
  ('scale','detailed_access_controls',true,null::int),
  ('free','extended_audit_history',false,null::int),
  ('starter','extended_audit_history',false,null::int),
  ('growth','extended_audit_history',false,null::int),
  ('business','extended_audit_history',true,null::int),
  ('scale','extended_audit_history',true,null::int)
)
insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, m.feature_key, m.enabled, m.limit_value
from matrix m join public.subscription_plans p on p.code = m.plan_code;

-- ---------------------------------------------------------------------------
-- 3. Permissions for staff and work locations
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, description, is_sensitive, sort_order) values
  ('staff.view',             'staff',     'View the staff list', false, 150),
  ('staff.manage',           'staff',     'Add staff, change their details and status', true, 160),
  ('work_locations.manage',  'workspace', 'Add and archive approved work locations', false, 170);

insert into public.role_templates (system_key, permission_key) values
  ('owner', 'staff.view'), ('owner', 'staff.manage'), ('owner', 'work_locations.manage'),
  ('hr_admin', 'staff.view'), ('hr_admin', 'staff.manage'),
  ('ops_manager', 'staff.view'), ('ops_manager', 'work_locations.manage'),
  ('dept_manager', 'staff.view'),
  ('accountant', 'staff.view');

-- Existing companies' system roles receive the same new permissions.
insert into public.role_permissions (company_id, role_id, permission_key)
select r.company_id, r.id, t.permission_key
from public.roles r
join public.role_templates t on t.system_key = r.system_key
where t.permission_key in ('staff.view', 'staff.manage', 'work_locations.manage')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Subscription: purchased add-ons, scheduled changes, staff selection
-- ---------------------------------------------------------------------------
alter table public.company_subscriptions
  add column extra_staff int not null default 0 check (extra_staff >= 0),
  add column extra_work_locations int not null default 0 check (extra_work_locations >= 0),
  add column pending_plan_id uuid references public.subscription_plans (id),
  add column pending_change_at timestamptz,
  add column staff_selection_required boolean not null default false,
  add constraint company_subscriptions_pending_check
    check ((pending_plan_id is null) = (pending_change_at is null));

-- Plan in force: a trial past its end date no longer counts, even before the
-- expiry has been recorded (so entitlements are never over-granted).
create or replace function app.company_plan_id(p_company uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.plan_id
      from public.company_subscriptions s
      where s.company_id = p_company
        and s.status in ('trialing', 'active', 'past_due', 'grace')
        and not (s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at <= now())
    ),
    (select p.id from public.subscription_plans p where p.code = 'free')
  );
$$;

-- Purchased add-ons only count on a paid, non-trial subscription of the plan in force.
create function app.company_paid_extras(p_company uuid, out extra_staff int, out extra_locations int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(max(case when p.allows_extra_staff then s.extra_staff end), 0),
    coalesce(max(case when p.allows_extra_work_locations then s.extra_work_locations end), 0)
  from public.company_subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.company_id = p_company
    and s.status in ('active', 'past_due', 'grace')
    and s.plan_id = app.company_plan_id(p_company);
$$;

create function app.company_staff_allowance(p_company uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select p.included_employees + (select e.extra_staff from app.company_paid_extras(p_company) e)
  from public.subscription_plans p
  where p.id = app.company_plan_id(p_company);
$$;

-- NULL = unlimited.
create function app.company_work_location_allowance(p_company uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when app.company_feature_limit(p_company, 'work_locations') is null then null
    else app.company_feature_limit(p_company, 'work_locations')
         + (select e.extra_locations from app.company_paid_extras(p_company) e)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Staff records (core of Phase 2). "Active staff" counts toward allowances.
-- ---------------------------------------------------------------------------
create type public.staff_status as enum (
  'invited', 'onboarding', 'active', 'on_leave', 'suspended',
  'plan_suspended', 'resigned', 'terminated', 'archived'
);
comment on type public.staff_status is
  'plan_suspended = paused because the subscription allowance was reduced. It is NOT a disciplinary suspension, resignation, termination or leave.';

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  member_id uuid,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 32),
  job_title text check (job_title is null or char_length(job_title) <= 100),
  department_id uuid,
  branch_id uuid,
  status public.staff_status not null default 'active',
  status_before_plan_suspension public.staff_status,
  plan_suspended_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, member_id) references public.company_members (company_id, id),
  foreign key (company_id, department_id) references public.departments (company_id, id),
  foreign key (company_id, branch_id) references public.branches (company_id, id),
  check ((status = 'plan_suspended') = (plan_suspended_at is not null))
);
comment on table public.employees is
  'Staff records ("staff" in the interface). Never hard-deleted. Phase 2 extends this table.';
create unique index employees_member_uniq on public.employees (company_id, member_id)
  where member_id is not null;
create index employees_company_status_idx on public.employees (company_id, status);

create function app.is_active_staff_status(p_status public.staff_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('active', 'on_leave', 'suspended');
$$;

create function app.count_active_staff(p_company uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.employees e
  where e.company_id = p_company and app.is_active_staff_status(e.status);
$$;

-- Clients may add staff as active or invited, and may not move anyone into or
-- out of the subscription pause directly (that goes through the RPCs below).
create function app.employees_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.is_client_context() then
    if tg_op = 'INSERT' and new.status not in ('active', 'invited') then
      raise exception 'New staff can only be added as active or invited' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and (new.status = 'plan_suspended' or old.status = 'plan_suspended') then
      raise exception 'Use the staff selection or reactivation steps for paused staff'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger employees_guard
  before insert or update on public.employees
  for each row execute function app.employees_guard();

-- The allowance check: becoming active must not exceed included + paid extra.
create function app.enforce_staff_allowance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowance int;
begin
  if app.is_active_staff_status(new.status)
     and (tg_op = 'INSERT' or not app.is_active_staff_status(old.status)) then
    v_allowance := app.company_staff_allowance(new.company_id);
    if app.count_active_staff(new.company_id) > v_allowance then
      raise exception 'staff_limit_exceeded:%', v_allowance
        using errcode = 'P0001',
              hint = 'Upgrade the plan or add paid staff capacity, or pause another staff member first.';
    end if;
  end if;
  return null;
end;
$$;

create trigger employees_staff_allowance
  after insert or update of status on public.employees
  for each row execute function app.enforce_staff_allowance();

-- Staff paused by the subscription lose workspace access if they have no
-- management role. Their records stay intact.
create or replace function app.is_member(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    where m.company_id = p_company
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and not exists (
        select 1 from public.employees e
        where e.company_id = m.company_id and e.member_id = m.id and e.status = 'plan_suspended'
          and not exists (
            select 1 from public.member_roles mr
            join public.roles r on r.id = mr.role_id
            where mr.member_id = m.id and r.system_key is distinct from 'employee'
          )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Work locations (approved places for attendance; geofence data in Phase 4)
-- ---------------------------------------------------------------------------
create table public.work_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  branch_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 100),
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  radius_m int check (radius_m is null or radius_m between 10 and 5000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, branch_id) references public.branches (company_id, id)
);
comment on table public.work_locations is
  'Approved work locations. Separate from branches: one branch can have several locations.';
create unique index work_locations_name_uniq
  on public.work_locations (company_id, lower(name)) where archived_at is null;

create function app.enforce_work_location_allowance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowance int;
begin
  if new.archived_at is null and (tg_op = 'INSERT' or old.archived_at is not null) then
    v_allowance := app.company_work_location_allowance(new.company_id);
    if v_allowance is not null and (
      select count(*) from public.work_locations w
      where w.company_id = new.company_id and w.archived_at is null
    ) > v_allowance then
      raise exception 'work_location_limit_exceeded:%', v_allowance using errcode = 'P0001';
    end if;
  end if;
  return null;
end;
$$;

create trigger work_locations_allowance
  after insert or update of archived_at on public.work_locations
  for each row execute function app.enforce_work_location_allowance();

-- Departments limit (Free/Starter 1, Growth 10, Business unlimited).
create function app.enforce_department_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is null and (tg_op = 'INSERT' or old.archived_at is not null) then
    perform app.assert_within_limit(
      new.company_id, 'departments',
      (select count(*)::int from public.departments d
        where d.company_id = new.company_id and d.archived_at is null)
    );
  end if;
  return null;
end;
$$;

create trigger departments_limit
  after insert or update of archived_at on public.departments
  for each row execute function app.enforce_department_limit();

-- ---------------------------------------------------------------------------
-- 7. Trials, subscription history, in-app notifications, billing records
-- ---------------------------------------------------------------------------
create table public.trial_grants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete restrict,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  plan_id uuid not null references public.subscription_plans (id),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  outcome text not null default 'active'
    check (outcome in ('active', 'converted', 'expired', 'cancelled')),
  check (ends_at > started_at)
);
comment on table public.trial_grants is
  'One row per trial ever started. One per workspace (unique) and, enforced in start_trial, one per owner per 12 months.';
create index trial_grants_owner_idx on public.trial_grants (owner_user_id, started_at desc);

create table public.subscription_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete restrict,
  event text not null check (event in (
    'trial_started', 'trial_expired', 'trial_cancelled', 'plan_changed',
    'downgrade_scheduled', 'downgrade_cancelled', 'addons_changed',
    'staff_paused', 'staff_reactivated', 'checkout_started', 'payment_succeeded', 'payment_failed'
  )),
  from_plan_id uuid references public.subscription_plans (id),
  to_plan_id uuid references public.subscription_plans (id),
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
create index subscription_events_company_idx on public.subscription_events (company_id, created_at desc);
create trigger append_only before update or delete on public.subscription_events
  for each row execute function app.block_mutation();

-- In-app notifications. dedupe_key makes every reminder idempotent; an email
-- channel can later read the same rows (outbox pattern, ADR-0005).
create table public.notifications (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  dedupe_key text not null,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, company_id, created_at desc);

-- Billing records. Written only by WOHKAH's server (definer functions or the
-- service role). Paystack confirms payments; WOHKAH decides entitlements.
create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  plan_id uuid not null references public.subscription_plans (id),
  billing_interval public.billing_interval not null,
  extra_staff int not null default 0 check (extra_staff >= 0),
  extra_work_locations int not null default 0 check (extra_work_locations >= 0),
  currency char(3) not null default 'NGN',
  lines jsonb not null,
  total_minor bigint not null check (total_minor >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'void', 'failed')),
  reference text not null unique,
  provider text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (company_id, id),
  check ((status = 'paid') = (paid_at is not null))
);
create index billing_invoices_company_idx on public.billing_invoices (company_id, created_at desc);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null,
  provider text not null,
  provider_reference text not null,
  amount_minor bigint not null,
  currency char(3) not null,
  status text not null check (status in ('pending', 'succeeded', 'failed', 'reversed')),
  verified_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference),
  foreign key (company_id, invoice_id) references public.billing_invoices (company_id, id)
);

create table public.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, event_id)
);
comment on table public.webhook_events is
  'Verified provider webhooks. The unique key makes duplicate deliveries harmless.';

-- Generic triggers for the new tables.
do $$
declare
  t text;
begin
  foreach t in array array['employees', 'work_locations'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function app.set_updated_at()', t);
  end loop;
  foreach t in array array['employees', 'work_locations', 'trial_grants', 'notifications',
                           'billing_invoices', 'payment_transactions'] loop
    execute format('create trigger prevent_company_change before update on public.%I
                    for each row execute function app.prevent_company_change()', t);
  end loop;
  foreach t in array array['employees', 'work_locations', 'trial_grants'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function app.audit_row()', t);
  end loop;
  foreach t in array array['employees', 'work_locations', 'trial_grants', 'subscription_events',
                           'notifications', 'billing_invoices', 'payment_transactions',
                           'webhook_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end;
$$;

-- The current user's membership id in a company (NULL if none).
create function app.member_id_for(p_company uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.company_members m
  where m.company_id = p_company and m.user_id = (select auth.uid()) and m.status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- 8. Row security and privileges for the new tables
-- ---------------------------------------------------------------------------
grant select on public.employees to authenticated;
grant insert (company_id, full_name, email, phone, job_title, department_id, branch_id, status)
  on public.employees to authenticated;
grant update (full_name, email, phone, job_title, department_id, branch_id, status)
  on public.employees to authenticated;
create policy employees_select on public.employees for select to authenticated
  using (
    app.has_company_permission(company_id, 'staff.view')
    or member_id = (select app.member_id_for(company_id))
  );
create policy employees_insert on public.employees for insert to authenticated
  with check (app.has_company_permission(company_id, 'staff.manage'));
create policy employees_update on public.employees for update to authenticated
  using (app.has_company_permission(company_id, 'staff.manage'))
  with check (app.has_company_permission(company_id, 'staff.manage'));

grant select on public.work_locations to authenticated;
grant insert (company_id, branch_id, name, address) on public.work_locations to authenticated;
grant update (branch_id, name, address, archived_at) on public.work_locations to authenticated;
create policy work_locations_select on public.work_locations for select to authenticated
  using (app.is_member(company_id));
create policy work_locations_insert on public.work_locations for insert to authenticated
  with check (app.has_company_permission(company_id, 'work_locations.manage'));
create policy work_locations_update on public.work_locations for update to authenticated
  using (app.has_company_permission(company_id, 'work_locations.manage'))
  with check (app.has_company_permission(company_id, 'work_locations.manage'));

grant select on public.trial_grants, public.subscription_events, public.billing_invoices,
  public.payment_transactions to authenticated;
create policy trial_grants_select on public.trial_grants for select to authenticated
  using (app.has_company_permission(company_id, 'subscription.view'));
create policy subscription_events_select on public.subscription_events for select to authenticated
  using (app.has_company_permission(company_id, 'subscription.view'));
create policy billing_invoices_select on public.billing_invoices for select to authenticated
  using (app.has_company_permission(company_id, 'subscription.view'));
create policy payment_transactions_select on public.payment_transactions for select to authenticated
  using (app.has_company_permission(company_id, 'subscription.view'));

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and app.is_member(company_id));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- webhook_events: no client access at all.

-- ---------------------------------------------------------------------------
-- 9. Subscription logic (all server-side)
-- ---------------------------------------------------------------------------

-- Notify everyone who manages billing (holders of subscription.view).
create function app.notify_billing_admins(
  p_company uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (company_id, user_id, kind, title, body, link, dedupe_key)
  select distinct p_company, m.user_id, p_kind, p_title, p_body, p_link, p_dedupe
  from public.company_members m
  join public.member_roles mr on mr.member_id = m.id and mr.scope_type = 'company'
  join public.role_permissions rp on rp.role_id = mr.role_id and rp.permission_key = 'subscription.view'
  where m.company_id = p_company and m.status = 'active'
  on conflict (user_id, dedupe_key) do nothing;
$$;

create function app.log_subscription_event(
  p_company uuid, p_event text, p_from uuid, p_to uuid, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.subscription_events (company_id, event, from_plan_id, to_plan_id, details, actor_user_id)
  values (p_company, p_event, p_from, p_to, coalesce(p_details, '{}'::jsonb), (select auth.uid()));
$$;

-- Bring a company's subscription up to date: record trial expiry, apply due
-- scheduled downgrades, raise reminders. Idempotent: safe to call on every
-- request and from a scheduler.
create function app.sync_subscription(p_company uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.company_subscriptions;
  v_free uuid := (select id from public.subscription_plans where code = 'free');
  v_plan_name text;
  v_tz text;
  v_grant uuid;
  v_today date;
  v_end_day date;
  v_link text;
begin
  select * into v_sub from public.company_subscriptions where company_id = p_company for update;
  if not found then
    return;
  end if;
  select c.timezone, '/w/' || c.slug || '/settings/subscription' into v_tz, v_link
  from public.companies c where c.id = p_company;
  select name into v_plan_name from public.subscription_plans where id = v_sub.plan_id;

  -- Trial: expiry and reminders.
  if v_sub.status = 'trialing' and v_sub.trial_ends_at is not null then
    select id into v_grant from public.trial_grants where company_id = p_company;
    if v_sub.trial_ends_at <= now() then
      update public.company_subscriptions
      set plan_id = v_free, status = 'active', current_period_start = now(),
          current_period_end = null, extra_staff = 0, extra_work_locations = 0,
          pending_plan_id = null, pending_change_at = null,
          staff_selection_required = app.count_active_staff(p_company)
            > (select included_employees from public.subscription_plans where id = v_free)
      where company_id = p_company;
      update public.trial_grants set outcome = 'expired', ended_at = now()
      where company_id = p_company and outcome = 'active';
      perform app.log_subscription_event(p_company, 'trial_expired', v_sub.plan_id, v_free, '{}'::jsonb);
      perform app.notify_billing_admins(p_company, 'trial_expired',
        'Your ' || v_plan_name || ' trial has ended',
        'Your workspace is now on the Free plan. All your records are kept. Subscribe to get ' || v_plan_name || ' features back.',
        v_link, 'trial:' || v_grant || ':expired');
      if app.count_active_staff(p_company) > (select included_employees from public.subscription_plans where id = v_free) then
        perform app.notify_billing_admins(p_company, 'staff_selection_required',
          'Choose which staff stay active',
          'The Free plan includes 3 active staff. Choose who stays active, or subscribe to keep everyone active. No records are deleted.',
          '/w/' || (select slug from public.companies where id = p_company) || '/staff',
          'trial:' || v_grant || ':selection');
      end if;
      return;
    end if;

    v_today := (now() at time zone v_tz)::date;
    v_end_day := (v_sub.trial_ends_at at time zone v_tz)::date;
    if v_end_day = v_today then
      perform app.notify_billing_admins(p_company, 'trial_ends_today',
        'Your ' || v_plan_name || ' trial ends today',
        'Subscribe today to keep ' || v_plan_name || ' features. Your records are kept either way.',
        v_link, 'trial:' || v_grant || ':today');
    elsif v_end_day - v_today = 1 then
      perform app.notify_billing_admins(p_company, 'trial_1_day',
        '1 day left in your ' || v_plan_name || ' trial',
        'Your trial ends tomorrow. Subscribe to keep ' || v_plan_name || ' features.',
        v_link, 'trial:' || v_grant || ':1day');
    elsif v_end_day - v_today <= 3 then
      perform app.notify_billing_admins(p_company, 'trial_3_days',
        '3 days left in your ' || v_plan_name || ' trial',
        'Your trial ends on ' || to_char(v_end_day, 'DD Mon YYYY') || '. Subscribe to keep ' || v_plan_name || ' features.',
        v_link, 'trial:' || v_grant || ':3days');
    end if;
    return;
  end if;

  -- Scheduled downgrade that has become due.
  if v_sub.pending_plan_id is not null and v_sub.pending_change_at <= now() then
    update public.company_subscriptions
    set plan_id = pending_plan_id,
        status = 'active',
        billing_interval = case when pending_plan_id = v_free then null else billing_interval end,
        current_period_start = now(),
        current_period_end = case when pending_plan_id = v_free then null else current_period_end end,
        extra_staff = case when pending_plan_id = v_free then 0 else extra_staff end,
        pending_plan_id = null, pending_change_at = null
    where company_id = p_company;
    update public.company_subscriptions
    set staff_selection_required = app.count_active_staff(p_company) > app.company_staff_allowance(p_company)
    where company_id = p_company;
    perform app.log_subscription_event(p_company, 'plan_changed', v_sub.plan_id, v_sub.pending_plan_id,
      jsonb_build_object('reason', 'scheduled_downgrade'));
  end if;
end;
$$;

-- Called by the WOHKAH server when a workspace is opened.
create function public.refresh_subscription(p_company uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_member(p_company) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform app.sync_subscription(p_company);
end;
$$;

-- Same, addressed by the workspace slug (what the server has per request).
create function public.refresh_workspace_subscription(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := (select c.id from public.companies c where c.slug = lower(p_slug));
begin
  if v_company is null or not app.is_member(v_company) then
    return; -- not found or not a member: nothing to do, nothing revealed
  end if;
  perform app.sync_subscription(v_company);
end;
$$;

-- For a scheduler (pg_cron) so expiry also happens when nobody signs in.
create function app.sync_due_subscriptions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select company_id from public.company_subscriptions
    where status = 'trialing'
       or (pending_change_at is not null and pending_change_at <= now())
  loop
    perform app.sync_subscription(r.company_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Trial eligibility (one per workspace; one per owner per 12 months).
create function public.trial_eligibility(p_company uuid)
returns table (eligible boolean, reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub public.company_subscriptions;
  v_free uuid := (select id from public.subscription_plans where code = 'free');
begin
  if not app.has_company_permission(p_company, 'subscription.view') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_sub from public.company_subscriptions where company_id = p_company;
  if exists (select 1 from public.trial_grants where company_id = p_company) then
    return query select false, 'workspace_already_trialled';
  elsif app.company_plan_id(p_company) <> v_free then
    return query select false, 'already_on_paid_plan';
  elsif exists (
    select 1 from public.trial_grants
    where owner_user_id = (select auth.uid()) and started_at > now() - interval '12 months'
  ) then
    return query select false, 'owner_trial_used';
  else
    return query select true, null::text;
  end if;
end;
$$;

create function public.start_trial(p_company uuid, p_plan_code text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan public.subscription_plans;
  v_sub public.company_subscriptions;
  v_ends timestamptz;
  v_grant uuid;
  v_ok boolean;
  v_reason text;
begin
  if v_uid is null or not app.has_company_permission(p_company, 'subscription.manage') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_plan from public.subscription_plans
  where code = p_plan_code and is_public and is_active and trial_days > 0;
  if not found then
    raise exception 'trial_plan_invalid' using errcode = '22023';
  end if;

  select * into v_sub from public.company_subscriptions where company_id = p_company for update;
  select e.eligible, e.reason into v_ok, v_reason from public.trial_eligibility(p_company) e;
  if not v_ok then
    raise exception 'trial_not_eligible:%', v_reason using errcode = '22023';
  end if;

  v_ends := now() + make_interval(days => v_plan.trial_days);
  insert into public.trial_grants (company_id, owner_user_id, plan_id, started_at, ends_at)
  values (p_company, v_uid, v_plan.id, now(), v_ends)
  returning id into v_grant;

  update public.company_subscriptions
  set plan_id = v_plan.id, status = 'trialing', billing_interval = null,
      trial_ends_at = v_ends, current_period_start = now(), current_period_end = v_ends,
      extra_staff = 0, extra_work_locations = 0,
      pending_plan_id = null, pending_change_at = null, staff_selection_required = false
  where company_id = p_company;

  perform app.log_subscription_event(p_company, 'trial_started', v_sub.plan_id, v_plan.id,
    jsonb_build_object('ends_at', v_ends, 'days', v_plan.trial_days));
  perform app.notify_billing_admins(p_company, 'trial_started',
    'Your ' || v_plan.name || ' trial has started',
    'You have ' || v_plan.trial_days || ' days to try ' || v_plan.name || '. No card needed.',
    '/w/' || (select slug from public.companies where id = p_company) || '/settings/subscription',
    'trial:' || v_grant || ':started');
  return v_ends;
end;
$$;

-- Owner chooses who stays active; everyone else active is paused by the
-- subscription (records kept). Used after trial expiry, before a downgrade,
-- or whenever active staff exceed the allowance.
create function public.select_active_staff(
  p_company uuid, p_keep uuid[], p_for_plan_code text default null
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowance int;
  v_keep int;
  v_paused int;
begin
  if not (app.has_company_permission(p_company, 'subscription.manage')
          or app.has_company_permission(p_company, 'staff.manage')) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_allowance := case
    when p_for_plan_code is null then app.company_staff_allowance(p_company)
    else (select included_employees from public.subscription_plans
          where code = p_for_plan_code and is_active)
  end;
  if v_allowance is null then
    raise exception 'plan_invalid' using errcode = '22023';
  end if;

  select count(*) into v_keep from public.employees
  where company_id = p_company and id = any (p_keep) and app.is_active_staff_status(status);
  if v_keep > v_allowance then
    raise exception 'too_many_selected:%', v_allowance using errcode = '22023';
  end if;

  update public.employees
  set status_before_plan_suspension = status, status = 'plan_suspended', plan_suspended_at = now()
  where company_id = p_company and app.is_active_staff_status(status) and not (id = any (p_keep));
  get diagnostics v_paused = row_count;

  update public.company_subscriptions
  set staff_selection_required = app.count_active_staff(p_company) > app.company_staff_allowance(p_company)
  where company_id = p_company;

  if v_paused > 0 then
    perform app.log_subscription_event(p_company, 'staff_paused', null, null,
      jsonb_build_object('paused', v_paused, 'kept', v_keep, 'for_plan', p_for_plan_code));
  end if;
  return v_paused;
end;
$$;

-- Bring paused staff back (allowance enforced by the staff trigger).
create function public.reactivate_staff(p_company uuid, p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not (app.has_company_permission(p_company, 'subscription.manage')
          or app.has_company_permission(p_company, 'staff.manage')) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.employees
  set status = coalesce(status_before_plan_suspension, 'active'),
      status_before_plan_suspension = null, plan_suspended_at = null
  where company_id = p_company and id = any (p_ids) and status = 'plan_suspended';
  get diagnostics v_n = row_count;
  update public.company_subscriptions
  set staff_selection_required = app.count_active_staff(p_company) > app.company_staff_allowance(p_company)
  where company_id = p_company;
  if v_n > 0 then
    perform app.log_subscription_event(p_company, 'staff_reactivated', null, null,
      jsonb_build_object('reactivated', v_n));
  end if;
  return v_n;
end;
$$;

-- Move to a cheaper plan (or Free). A trial ends immediately; a paid plan
-- changes at the end of the period already paid for. Active staff above the
-- new allowance must be resolved first for immediate changes, or are flagged
-- for selection when a scheduled change takes effect.
create function public.change_to_lower_plan(p_company uuid, p_plan_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.company_subscriptions;
  v_current public.subscription_plans;
  v_target public.subscription_plans;
begin
  if not app.has_company_permission(p_company, 'subscription.manage') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_target from public.subscription_plans where code = p_plan_code and is_active;
  if not found then
    raise exception 'plan_invalid' using errcode = '22023';
  end if;
  select * into v_sub from public.company_subscriptions where company_id = p_company for update;
  select * into v_current from public.subscription_plans where id = app.company_plan_id(p_company);
  if v_target.monthly_price_minor >= v_current.monthly_price_minor then
    raise exception 'not_a_downgrade' using errcode = '22023';
  end if;

  if v_sub.status = 'trialing' or v_sub.current_period_end is null then
    if app.count_active_staff(p_company) > v_target.included_employees then
      raise exception 'staff_selection_required:%', v_target.included_employees using errcode = '22023';
    end if;
    update public.company_subscriptions
    set plan_id = v_target.id, status = 'active', current_period_start = now(),
        current_period_end = null, billing_interval = null, extra_staff = 0,
        extra_work_locations = case when v_target.allows_extra_work_locations then extra_work_locations else 0 end,
        pending_plan_id = null, pending_change_at = null, staff_selection_required = false
    where company_id = p_company;
    if v_sub.status = 'trialing' then
      update public.trial_grants set outcome = 'cancelled', ended_at = now()
      where company_id = p_company and outcome = 'active';
      perform app.log_subscription_event(p_company, 'trial_cancelled', v_sub.plan_id, v_target.id, '{}'::jsonb);
    else
      perform app.log_subscription_event(p_company, 'plan_changed', v_sub.plan_id, v_target.id, '{}'::jsonb);
    end if;
    return 'applied';
  end if;

  update public.company_subscriptions
  set pending_plan_id = v_target.id, pending_change_at = v_sub.current_period_end
  where company_id = p_company;
  perform app.log_subscription_event(p_company, 'downgrade_scheduled', v_sub.plan_id, v_target.id,
    jsonb_build_object('effective_at', v_sub.current_period_end));
  return 'scheduled';
end;
$$;

create function public.cancel_scheduled_change(p_company uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.has_company_permission(p_company, 'subscription.manage') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.company_subscriptions set pending_plan_id = null, pending_change_at = null
  where company_id = p_company and pending_plan_id is not null;
  if found then
    perform app.log_subscription_event(p_company, 'downgrade_cancelled', null, null, '{}'::jsonb);
  end if;
end;
$$;

-- Price quote from the configured plan prices. Single calculation used for
-- checkout invoices; the interface shows the same numbers (tests compare).
-- Monthly subscription = plan price + extra staff + extra work locations.
create function public.subscription_quote(
  p_plan_code text, p_interval public.billing_interval, p_extra_staff int, p_extra_locations int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.subscription_plans;
  v_base bigint;
  v_staff_unit bigint;
  v_loc_unit bigint;
  v_staff int := greatest(coalesce(p_extra_staff, 0), 0);
  v_locs int := greatest(coalesce(p_extra_locations, 0), 0);
begin
  select * into v from public.subscription_plans where code = p_plan_code and is_active;
  if not found then
    raise exception 'plan_invalid' using errcode = '22023';
  end if;
  if v_staff > 0 and not v.allows_extra_staff then
    raise exception 'extra_staff_not_available' using errcode = '22023';
  end if;
  if v_locs > 0 and not v.allows_extra_work_locations then
    raise exception 'extra_locations_not_available' using errcode = '22023';
  end if;
  if v_staff > 100000 or v_locs > 10000 then
    raise exception 'quantity_too_large' using errcode = '22023';
  end if;
  if p_interval = 'annual' then
    v_base := v.annual_price_minor;
    v_staff_unit := v.extra_staff_annual_price_minor;
    v_loc_unit := v.extra_work_location_annual_price_minor;
  else
    v_base := v.monthly_price_minor;
    v_staff_unit := v.extra_employee_price_minor;
    v_loc_unit := v.extra_work_location_price_minor;
  end if;
  if v_base is null then
    raise exception 'interval_not_available' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'plan', v.code, 'interval', p_interval, 'currency', v.currency,
    'lines', jsonb_build_array(
      jsonb_build_object('item', 'plan', 'quantity', 1, 'unit_minor', v_base, 'amount_minor', v_base),
      jsonb_build_object('item', 'extra_staff', 'quantity', v_staff, 'unit_minor', v_staff_unit,
                         'amount_minor', v_staff * v_staff_unit),
      jsonb_build_object('item', 'extra_work_locations', 'quantity', v_locs, 'unit_minor', v_loc_unit,
                         'amount_minor', v_locs * v_loc_unit)
    ),
    'total_minor', v_base + v_staff * v_staff_unit + v_locs * v_loc_unit
  );
end;
$$;

-- Creates (or reuses) an open invoice for checkout. Payment confirmation and
-- activation happen only after the provider's payment is verified on the
-- server (Stage 2: Paystack). Clicking a button never grants entitlements.
create function public.create_checkout_invoice(
  p_company uuid, p_plan_code text, p_interval public.billing_interval,
  p_extra_staff int, p_extra_locations int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_plan uuid;
  v_id uuid;
begin
  if not app.has_company_permission(p_company, 'subscription.manage') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_quote := public.subscription_quote(p_plan_code, p_interval, p_extra_staff, p_extra_locations);
  select id into v_plan from public.subscription_plans where code = p_plan_code;
  -- Free workspaces may buy extra work locations; nothing else is sold on Free.
  if (v_quote ->> 'total_minor')::bigint = 0 then
    raise exception 'nothing_to_pay' using errcode = '22023';
  end if;

  -- One open invoice per company: replace any previous unpaid checkout.
  update public.billing_invoices set status = 'void'
  where company_id = p_company and status = 'open';

  insert into public.billing_invoices
    (company_id, plan_id, billing_interval, extra_staff, extra_work_locations,
     lines, total_minor, reference, created_by)
  values
    (p_company, v_plan, p_interval, greatest(coalesce(p_extra_staff, 0), 0),
     greatest(coalesce(p_extra_locations, 0), 0), v_quote -> 'lines',
     (v_quote ->> 'total_minor')::bigint,
     'WHK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
     (select auth.uid()))
  returning id into v_id;

  perform app.log_subscription_event(p_company, 'checkout_started', null, v_plan,
    jsonb_build_object('invoice_id', v_id, 'total_minor', (v_quote ->> 'total_minor')::bigint));
  return v_id;
end;
$$;

-- Applies a VERIFIED payment (Stage 2: called by the Paystack webhook/verify
-- handler with the service role, after the server has verified the
-- transaction with Paystack). Idempotent per provider reference. Clients can
-- never call it.
create function public.apply_verified_payment(
  p_invoice_id uuid, p_provider text, p_provider_reference text,
  p_amount_minor bigint, p_currency text, p_raw jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.billing_invoices;
  v_sub public.company_subscriptions;
  v_start timestamptz;
  v_end timestamptz;
begin
  if exists (select 1 from public.payment_transactions
             where provider = p_provider and provider_reference = p_provider_reference
               and status = 'succeeded') then
    return 'already_applied';
  end if;
  select * into v_inv from public.billing_invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'invoice_not_found' using errcode = '22023';
  end if;
  if v_inv.status = 'paid' then
    return 'already_applied';
  end if;
  if p_amount_minor <> v_inv.total_minor or upper(p_currency) <> v_inv.currency then
    insert into public.payment_transactions
      (company_id, invoice_id, provider, provider_reference, amount_minor, currency, status, raw)
    values (v_inv.company_id, v_inv.id, p_provider, p_provider_reference, p_amount_minor,
            upper(p_currency), 'failed', p_raw)
    on conflict (provider, provider_reference) do nothing;
    perform app.log_subscription_event(v_inv.company_id, 'payment_failed', null, v_inv.plan_id,
      jsonb_build_object('invoice_id', v_inv.id, 'reason', 'amount_mismatch'));
    return 'amount_mismatch';
  end if;

  select * into v_sub from public.company_subscriptions where company_id = v_inv.company_id for update;
  -- Renewal of the same plan continues from the end of the paid period.
  v_start := case
    when v_sub.plan_id = v_inv.plan_id and v_sub.status = 'active'
         and v_sub.current_period_end is not null and v_sub.current_period_end > now()
      then v_sub.current_period_end
    else now()
  end;
  v_end := v_start + case when v_inv.billing_interval = 'annual' then interval '1 year' else interval '1 month' end;

  insert into public.payment_transactions
    (company_id, invoice_id, provider, provider_reference, amount_minor, currency, status, verified_at, raw)
  values (v_inv.company_id, v_inv.id, p_provider, p_provider_reference, p_amount_minor,
          upper(p_currency), 'succeeded', now(), p_raw);
  update public.billing_invoices set status = 'paid', paid_at = now(), provider = p_provider
  where id = v_inv.id;
  update public.company_subscriptions
  set plan_id = v_inv.plan_id, status = 'active', billing_interval = v_inv.billing_interval,
      current_period_start = v_start, current_period_end = v_end,
      extra_staff = v_inv.extra_staff, extra_work_locations = v_inv.extra_work_locations,
      pending_plan_id = null, pending_change_at = null
  where company_id = v_inv.company_id;
  update public.company_subscriptions
  set staff_selection_required = app.count_active_staff(v_inv.company_id)
        > app.company_staff_allowance(v_inv.company_id)
  where company_id = v_inv.company_id;
  update public.trial_grants set outcome = 'converted', ended_at = coalesce(ended_at, now())
  where company_id = v_inv.company_id and outcome in ('active', 'expired');
  perform app.log_subscription_event(v_inv.company_id, 'payment_succeeded', v_sub.plan_id, v_inv.plan_id,
    jsonb_build_object('invoice_id', v_inv.id, 'reference', p_provider_reference,
                       'amount_minor', p_amount_minor, 'period_end', v_end));
  return 'applied';
end;
$$;

-- Allowances any member can see (needed on the staff and work-location pages,
-- whose managers may not hold subscription.view). No prices or invoices.
create function public.workspace_allowances(p_company uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_member(p_company) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'plan_code', (select code from public.subscription_plans where id = app.company_plan_id(p_company)),
    'staff', app.company_staff_allowance(p_company),
    'active_staff', app.count_active_staff(p_company),
    'work_locations', app.company_work_location_allowance(p_company),
    'used_work_locations', (select count(*) from public.work_locations w
                            where w.company_id = p_company and w.archived_at is null),
    'staff_selection_required', coalesce((select s.staff_selection_required
                                 from public.company_subscriptions s where s.company_id = p_company), false)
  );
end;
$$;

-- Everything the subscription page needs, in one call.
create function public.subscription_overview(p_company uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub public.company_subscriptions;
  v_plan public.subscription_plans;
  v_pending text;
  v_trial public.trial_grants;
  v_extras record;
begin
  if not app.has_company_permission(p_company, 'subscription.view') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_sub from public.company_subscriptions where company_id = p_company;
  select * into v_plan from public.subscription_plans where id = app.company_plan_id(p_company);
  select code into v_pending from public.subscription_plans where id = v_sub.pending_plan_id;
  select * into v_trial from public.trial_grants where company_id = p_company;
  select * into v_extras from app.company_paid_extras(p_company);

  return jsonb_build_object(
    'plan_code', v_plan.code,
    'status', v_sub.status,
    'billing_interval', v_sub.billing_interval,
    'current_period_end', v_sub.current_period_end,
    'trial', case when v_trial.id is null then null else jsonb_build_object(
      'plan_code', (select code from public.subscription_plans where id = v_trial.plan_id),
      'started_at', v_trial.started_at, 'ends_at', v_trial.ends_at, 'outcome', v_trial.outcome) end,
    'pending_plan_code', v_pending,
    'pending_change_at', v_sub.pending_change_at,
    'staff_selection_required', v_sub.staff_selection_required,
    'usage', jsonb_build_object(
      'active_staff', app.count_active_staff(p_company),
      'paused_staff', (select count(*) from public.employees
                        where company_id = p_company and status = 'plan_suspended'),
      'admins', app.count_admins(p_company),
      'branches', (select count(*) from public.branches where company_id = p_company and archived_at is null),
      'departments', (select count(*) from public.departments where company_id = p_company and archived_at is null),
      'work_locations', (select count(*) from public.work_locations where company_id = p_company and archived_at is null),
      'storage_mb', 0
    ),
    'allowances', jsonb_build_object(
      'staff', app.company_staff_allowance(p_company),
      'extra_staff', v_extras.extra_staff,
      'work_locations', app.company_work_location_allowance(p_company),
      'extra_work_locations', v_extras.extra_locations,
      'admins', app.company_feature_limit(p_company, 'admins'),
      'branches', app.company_feature_limit(p_company, 'branches'),
      'departments', app.company_feature_limit(p_company, 'departments'),
      'storage_mb', app.company_feature_limit(p_company, 'storage_mb')
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Privileges for the new functions
-- ---------------------------------------------------------------------------
revoke all on function public.refresh_subscription(uuid) from public, anon;
revoke all on function public.refresh_workspace_subscription(text) from public, anon;
revoke all on function public.trial_eligibility(uuid) from public, anon;
revoke all on function public.start_trial(uuid, text) from public, anon;
revoke all on function public.select_active_staff(uuid, uuid[], text) from public, anon;
revoke all on function public.reactivate_staff(uuid, uuid[]) from public, anon;
revoke all on function public.change_to_lower_plan(uuid, text) from public, anon;
revoke all on function public.cancel_scheduled_change(uuid) from public, anon;
revoke all on function public.subscription_quote(text, public.billing_interval, int, int) from public, anon;
revoke all on function public.create_checkout_invoice(uuid, text, public.billing_interval, int, int) from public, anon;
revoke all on function public.subscription_overview(uuid) from public, anon;
revoke all on function public.workspace_allowances(uuid) from public, anon;
revoke all on function public.apply_verified_payment(uuid, text, text, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_verified_payment(uuid, text, text, bigint, text, jsonb) to service_role;

grant execute on function public.refresh_subscription(uuid) to authenticated;
grant execute on function public.refresh_workspace_subscription(text) to authenticated;
grant execute on function public.trial_eligibility(uuid) to authenticated;
grant execute on function public.start_trial(uuid, text) to authenticated;
grant execute on function public.select_active_staff(uuid, uuid[], text) to authenticated;
grant execute on function public.reactivate_staff(uuid, uuid[]) to authenticated;
grant execute on function public.change_to_lower_plan(uuid, text) to authenticated;
grant execute on function public.cancel_scheduled_change(uuid) to authenticated;
grant execute on function public.subscription_quote(text, public.billing_interval, int, int) to authenticated;
grant execute on function public.create_checkout_invoice(uuid, text, public.billing_interval, int, int) to authenticated;
grant execute on function public.subscription_overview(uuid) to authenticated;
grant execute on function public.workspace_allowances(uuid) to authenticated;

grant execute on all functions in schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11. Scheduler: record trial expiries and due downgrades hourly, when
--     pg_cron is available (Supabase). Request-time sync covers the rest.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('wohkah-sync-subscriptions', '7 * * * *',
                          'select app.sync_due_subscriptions()');
  end if;
end;
$$;
