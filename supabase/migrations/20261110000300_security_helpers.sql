-- =============================================================================
-- WOHKAH Phase 1 · Migration 3: security helper functions (ADR-0003)
-- SECURITY DEFINER so policies can consult membership tables without
-- recursive RLS evaluation. Each one is scoped to auth.uid(): a caller can only
-- ever ask about their own access. search_path is empty; names are qualified.
--
-- Rollback: drop the functions below.
-- =============================================================================

-- Is the current user an active member of the company?
create function app.is_member(p_company uuid)
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
  );
$$;

-- Does the current user hold permission p_key in the company, in any scope?
create function app.has_permission(p_company uuid, p_key text)
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
  );
$$;

-- Company-wide permission only (scope = company). Used for actions that must not
-- be granted through a department or branch scope, such as settings and roles.
create function app.has_company_permission(p_company uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.member_roles mr on mr.member_id = m.id and mr.scope_type = 'company'
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.company_id = p_company
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and rp.permission_key = p_key
  );
$$;

-- Scope-aware check: company scope, or a role scoped to the given department/branch.
create function app.has_permission_for(
  p_company uuid, p_key text, p_department uuid, p_branch uuid
)
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
      and (
        mr.scope_type = 'company'
        or (mr.scope_type = 'department' and mr.department_id = p_department)
        or (mr.scope_type = 'branch' and mr.branch_id = p_branch)
      )
  );
$$;

-- Is the current user an owner of the company?
create function app.is_owner(p_company uuid)
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
    join public.roles r on r.id = mr.role_id and r.system_key = 'owner'
    where m.company_id = p_company
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

-- Does the current user share an active workspace with another user?
-- Lets co-workers see each other's name and avatar, nothing more.
create function app.shares_company(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members me
    join public.company_members other
      on other.company_id = me.company_id and other.status in ('active', 'suspended')
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and other.user_id = p_user
  );
$$;

-- Platform admin, and only with a multi-factor (aal2) session.
create function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
    )
    and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

-- ---------------------------------------------------------------------------
-- Entitlements
-- ---------------------------------------------------------------------------

-- The plan currently governing the company. A subscription that has lapsed
-- (canceled or expired) falls back to the Free plan: data is never removed.
create function app.company_plan_id(p_company uuid)
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
    ),
    (select p.id from public.subscription_plans p where p.code = 'free')
  );
$$;

create function app.company_has_feature(p_company uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select o.enabled
      from public.company_feature_overrides o
      where o.company_id = p_company
        and o.feature_key = p_feature
        and (o.expires_at is null or o.expires_at > now())
    ),
    (
      select pf.enabled
      from public.plan_features pf
      where pf.plan_id = app.company_plan_id(p_company)
        and pf.feature_key = p_feature
    ),
    false
  );
$$;

-- Limit for a 'limit' feature. NULL = unlimited. 0 when the feature is off.
create function app.company_feature_limit(p_company uuid, p_feature text)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_limit int;
  v_found boolean := false;
begin
  select o.enabled, o.limit_value, true into v_enabled, v_limit, v_found
  from public.company_feature_overrides o
  where o.company_id = p_company
    and o.feature_key = p_feature
    and (o.expires_at is null or o.expires_at > now());

  if not coalesce(v_found, false) then
    select pf.enabled, pf.limit_value, true into v_enabled, v_limit, v_found
    from public.plan_features pf
    where pf.plan_id = app.company_plan_id(p_company)
      and pf.feature_key = p_feature;
  end if;

  if not coalesce(v_found, false) or not v_enabled then
    return 0;
  end if;
  return v_limit;
end;
$$;

-- Raise a recognisable error when adding one more item would exceed a plan limit.
create function app.assert_within_limit(p_company uuid, p_feature text, p_count_after int)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := app.company_feature_limit(p_company, p_feature);
begin
  if v_limit is not null and p_count_after > v_limit then
    raise exception 'plan_limit_exceeded:%:%', p_feature, v_limit
      using errcode = 'P0001',
            hint = 'Upgrade the subscription plan to raise this limit.';
  end if;
end;
$$;

-- Helpers are callable by signed-in users (policies run as the caller) and the
-- service role. Never by anon.
grant execute on all functions in schema app to authenticated, service_role;
