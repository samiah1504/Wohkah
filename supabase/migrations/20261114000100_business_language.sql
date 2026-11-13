-- =============================================================================
-- WOHKAH · Migration 11: plain business language in database-generated text
--
-- PRODUCT_LANGUAGE_AND_POSITIONING.md: customers see "business account" or
-- "business", never "workspace". Data-only: no tables, columns, functions'
-- names or signatures change. Updated here:
--   * permission descriptions shown on the Roles page;
--   * the Owner role description (existing businesses and create_company());
--   * the "trial has ended" notification text in app.sync_subscription();
--   * internal feature descriptions that still used HR jargon (not shown in
--     the app, tidied so nothing leaks later).
-- Text a business has changed itself is left alone.
--
-- Rollback: reverse the UPDATEs and restore create_company() from migration 9
-- and app.sync_subscription() from migration 10.
-- =============================================================================

update public.permissions set description = 'See who has access and their roles'
 where key = 'members.view' and description = 'View workspace members and their roles';
update public.permissions set description = 'Invite people to the business account'
 where key = 'members.invite' and description = 'Invite people to the workspace';
update public.permissions set description = 'Suspend, restore and remove people''s access'
 where key = 'members.manage' and description = 'Suspend, reactivate and remove members';
update public.permissions set description = 'Give people roles and take them away'
 where key = 'roles.assign' and description = 'Assign and remove roles for members';
update public.permissions set description = 'View the record of changes (audit log)'
 where key = 'audit.view' and description = 'View the workspace audit log';

update public.roles set description = 'Full control of the business account, subscription and roles.'
 where system_key = 'owner' and description = 'Full control of the workspace, billing and roles.';

update public.features set description = 'Approved work locations'
 where key = 'work_locations' and description = 'Geofenced work locations (Phase 4)';
update public.features set description = 'Business and staff reports'
 where key = 'advanced_analytics' and description = 'Workforce analytics (Phase 8)';
update public.features set description = 'Setting up new staff (templates and checklists)'
 where key = 'advanced_onboarding' and description = 'Onboarding templates and workflows (Phase 3)';
update public.features set description = 'Members holding any role other than Staff Member'
 where key = 'admins' and description = 'Members holding any role other than Employee';

-- New businesses get the new Owner description.
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

-- Trial-ended notification wording.
create or replace function app.sync_subscription(p_company uuid)
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
        'Your business is now on the Free plan. All your records are kept. Subscribe to get ' || v_plan_name || ' features back.',
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
