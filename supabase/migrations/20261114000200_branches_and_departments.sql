-- =============================================================================
-- WOHKAH · Migration 12: branch allowances corrected; departments removed from plans
--
-- Product owner decisions (2026-11-14):
--   * Included branches: Free 1, Starter 2, Growth 5, Business 10 (no plan is
--     unlimited). Enforced by the existing branches_limit trigger, which reads
--     plan_features, so API requests can't bypass it.
--   * Departments are no longer a plan feature or a limit. The department
--     limit, its entitlement rows and its trigger are removed.
--   * Work-location allowances (1/2/5/10, extras at NGN 1,000) are unchanged
--     and stay a separate entitlement from branches.
--
-- NOT destructive: no department, branch, staff or role records are deleted.
-- public.departments, member_roles.department_id, employees.department_id,
-- the departments.manage permission and the Department Manager role all stay
-- so existing data and roles keep working (see docs/PRICING_AUDIT.md §7).
-- Businesses already above a new branch allowance keep their branches; they
-- just can't add or restore more until they're within it.
--
-- Rollback: restore the previous plan_features rows from migration 10,
-- re-create app.enforce_department_limit() and its trigger from migration 10,
-- and restore public.subscription_overview() from migration 10.
-- =============================================================================

update public.plan_features pf
   set limit_value = v.limit_value, enabled = true
  from (values ('free', 1), ('starter', 2), ('growth', 5), ('business', 10)) as v(code, limit_value)
  join public.subscription_plans p on p.code = v.code
 where pf.plan_id = p.id and pf.feature_key = 'branches';

-- Plan descriptions no longer mention departments.
update public.subscription_plans
   set description = 'For businesses managing more staff, branches and routines.'
 where code = 'growth' and description ilike '%departments%';

-- Departments: no longer limited or sold.
drop trigger if exists departments_limit on public.departments;
drop function if exists app.enforce_department_limit();
delete from public.plan_features where feature_key = 'departments';
delete from public.company_feature_overrides where feature_key = 'departments';
delete from public.features where key = 'departments';

-- Subscription overview without department usage or allowance.
create or replace function public.subscription_overview(p_company uuid)
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
      'storage_mb', app.company_feature_limit(p_company, 'storage_mb')
    )
  );
end;
$$;
