-- =============================================================================
-- WOHKAH Phase 1 · Migration 5: Row Level Security and privileges
--
-- Two layers, both required:
--  1. Privileges (GRANT): which roles may touch which tables and columns.
--     anon gets nothing except the public plan catalogue. Column grants stop
--     clients from writing columns such as status, slug or token_hash.
--  2. RLS policies: which rows. Every table has RLS enabled. It is not FORCED:
--     the API roles (anon, authenticated) are always subject to RLS, while the
--     table owner (the migration role, which also owns the SECURITY DEFINER
--     helpers) must bypass it or the helpers would recurse into the policies.
--
-- A test fails CI if any public table lacks RLS (tests/db/rls-coverage.test.ts).
--
-- Rollback: drop the policies; revoke the grants; disable RLS (development only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Baseline: enable RLS everywhere; reset privileges explicitly
-- (Supabase grants broad default privileges on public; we don't rely on them).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Defaults for columns that record who acted.
alter table public.member_roles alter column created_by set default auth.uid();
alter table public.company_invitations alter column invited_by set default auth.uid();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path, phone, locale, timezone) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or app.shares_company(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- companies (insert only through public.create_company; never deleted)
-- ---------------------------------------------------------------------------
grant select on public.companies to authenticated;
grant update (
  name, legal_name, business_email, phone, industry, country_code, address, website,
  size_band, timezone, currency, working_days, work_start, work_end, logo_path
) on public.companies to authenticated;

create policy companies_select on public.companies for select to authenticated
  using (app.is_member(id) or app.is_platform_admin());
create policy companies_update on public.companies for update to authenticated
  using (app.has_company_permission(id, 'company.settings.manage'))
  with check (app.has_company_permission(id, 'company.settings.manage'));

-- ---------------------------------------------------------------------------
-- company_members (insert only through RPCs; status changes by members.manage)
-- ---------------------------------------------------------------------------
grant select on public.company_members to authenticated;
grant update (status, removed_at) on public.company_members to authenticated;

create policy company_members_select on public.company_members for select to authenticated
  using (app.is_member(company_id));
create policy company_members_update on public.company_members for update to authenticated
  using (app.has_company_permission(company_id, 'members.manage'))
  with check (app.has_company_permission(company_id, 'members.manage'));

-- ---------------------------------------------------------------------------
-- departments, branches (archived, never deleted), public_holidays
-- ---------------------------------------------------------------------------
grant select on public.departments to authenticated;
grant insert (company_id, name, description, parent_id) on public.departments to authenticated;
grant update (name, description, parent_id, archived_at) on public.departments to authenticated;

create policy departments_select on public.departments for select to authenticated
  using (app.is_member(company_id));
create policy departments_insert on public.departments for insert to authenticated
  with check (app.has_company_permission(company_id, 'departments.manage'));
create policy departments_update on public.departments for update to authenticated
  using (app.has_company_permission(company_id, 'departments.manage'))
  with check (app.has_company_permission(company_id, 'departments.manage'));

grant select on public.branches to authenticated;
grant insert (company_id, name, code, address, phone, timezone, is_headquarters)
  on public.branches to authenticated;
grant update (name, code, address, phone, timezone, is_headquarters, archived_at)
  on public.branches to authenticated;

create policy branches_select on public.branches for select to authenticated
  using (app.is_member(company_id));
create policy branches_insert on public.branches for insert to authenticated
  with check (app.has_company_permission(company_id, 'branches.manage'));
create policy branches_update on public.branches for update to authenticated
  using (app.has_company_permission(company_id, 'branches.manage'))
  with check (app.has_company_permission(company_id, 'branches.manage'));

grant select, delete on public.public_holidays to authenticated;
grant insert (company_id, holiday_date, name, branch_id) on public.public_holidays to authenticated;
grant update (holiday_date, name, branch_id) on public.public_holidays to authenticated;

create policy public_holidays_select on public.public_holidays for select to authenticated
  using (app.is_member(company_id));
create policy public_holidays_insert on public.public_holidays for insert to authenticated
  with check (app.has_company_permission(company_id, 'holidays.manage'));
create policy public_holidays_update on public.public_holidays for update to authenticated
  using (app.has_company_permission(company_id, 'holidays.manage'))
  with check (app.has_company_permission(company_id, 'holidays.manage'));
create policy public_holidays_delete on public.public_holidays for delete to authenticated
  using (app.has_company_permission(company_id, 'holidays.manage'));

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
grant select on public.permissions to authenticated;
create policy permissions_select on public.permissions for select to authenticated using (true);

grant select on public.role_templates to authenticated;
create policy role_templates_select on public.role_templates for select to authenticated
  using (true);

grant select, delete on public.roles to authenticated;
grant insert (company_id, name, description) on public.roles to authenticated;
grant update (name, description) on public.roles to authenticated;

create policy roles_select on public.roles for select to authenticated
  using (app.is_member(company_id));
create policy roles_insert on public.roles for insert to authenticated
  with check (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  );
create policy roles_update on public.roles for update to authenticated
  using (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  )
  with check (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  );
-- System roles can't be deleted (enforced by trigger); custom roles in use can't
-- be deleted (member_roles FK is ON DELETE RESTRICT).
create policy roles_delete on public.roles for delete to authenticated
  using (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  );

grant select, delete on public.role_permissions to authenticated;
grant insert (company_id, role_id, permission_key) on public.role_permissions to authenticated;

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (app.is_member(company_id));
create policy role_permissions_insert on public.role_permissions for insert to authenticated
  with check (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  );
create policy role_permissions_delete on public.role_permissions for delete to authenticated
  using (
    app.has_company_permission(company_id, 'roles.manage')
    and app.company_has_feature(company_id, 'custom_roles')
  );

grant select, delete on public.member_roles to authenticated;
grant insert (company_id, member_id, role_id, scope_type, department_id, branch_id)
  on public.member_roles to authenticated;

create policy member_roles_select on public.member_roles for select to authenticated
  using (app.is_member(company_id));
create policy member_roles_insert on public.member_roles for insert to authenticated
  with check (app.has_company_permission(company_id, 'roles.assign'));
create policy member_roles_delete on public.member_roles for delete to authenticated
  using (app.has_company_permission(company_id, 'roles.assign'));

-- Invitations: token_hash is never readable by clients.
grant select (
  id, company_id, email, role_ids, status, invited_by, expires_at, accepted_at,
  accepted_by, revoked_at, created_at, updated_at
) on public.company_invitations to authenticated;
grant insert (company_id, email, role_ids, token_hash, expires_at)
  on public.company_invitations to authenticated;
grant update (status, revoked_at) on public.company_invitations to authenticated;

create policy company_invitations_select on public.company_invitations for select to authenticated
  using (
    app.has_company_permission(company_id, 'members.invite')
    or app.has_company_permission(company_id, 'members.view')
  );
create policy company_invitations_insert on public.company_invitations for insert to authenticated
  with check (
    app.has_company_permission(company_id, 'members.invite')
    and status = 'pending'
  );
-- Only revocation is possible from the client; acceptance goes through the RPC.
create policy company_invitations_update on public.company_invitations for update to authenticated
  using (app.has_company_permission(company_id, 'members.invite') and status = 'pending')
  with check (app.has_company_permission(company_id, 'members.invite') and status = 'revoked');

-- ---------------------------------------------------------------------------
-- Entitlements: catalogue readable (pricing page); company rows by members.
-- Writes happen through billing (Phase 9) and platform admin RPCs only.
-- ---------------------------------------------------------------------------
grant select on public.features to anon, authenticated;
create policy features_select on public.features for select to anon, authenticated using (true);

grant select on public.subscription_plans to anon, authenticated;
create policy subscription_plans_select on public.subscription_plans for select
  to anon, authenticated
  using (is_public and is_active);

grant select on public.plan_features to anon, authenticated;
create policy plan_features_select on public.plan_features for select to anon, authenticated
  using (true);

grant select on public.company_subscriptions to authenticated;
create policy company_subscriptions_select on public.company_subscriptions for select
  to authenticated
  using (app.is_member(company_id) or app.is_platform_admin());

grant select on public.company_feature_overrides to authenticated;
create policy company_feature_overrides_select on public.company_feature_overrides for select
  to authenticated
  using (app.is_member(company_id) or app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Platform administration
-- ---------------------------------------------------------------------------
grant select on public.platform_admins to authenticated;
create policy platform_admins_select_own on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.support_access_grants to authenticated;
create policy support_access_grants_select on public.support_access_grants for select
  to authenticated
  using (
    app.has_company_permission(company_id, 'support_access.manage')
    or granted_to = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Audit and security logs: readable, never writable, by clients
-- ---------------------------------------------------------------------------
grant select on public.audit_logs to authenticated;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (
    (company_id is not null and app.has_company_permission(company_id, 'audit.view'))
    or app.is_platform_admin()
  );

grant select on public.login_events to authenticated;
create policy login_events_select_own on public.login_events for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.access_events to authenticated;
create policy access_events_select on public.access_events for select to authenticated
  using (app.has_company_permission(company_id, 'audit.view') or app.is_platform_admin());

-- rate_limit_buckets: no client privileges and no policies (service role only).
