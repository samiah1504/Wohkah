-- =============================================================================
-- WOHKAH · Migration 14: businesses define their own roles (product owner,
-- 2026-11-14: "remove any hard coded roles … businesses can add any roles …
-- add any access"; every plan; new businesses start with Owner only)
--
-- * Owner is the only built-in role (a business must always have someone with
--   full control). Every other existing role becomes an ordinary role the
--   business can rename, change or delete. Nobody's access changes.
-- * New businesses start with the Owner role only.
-- * Creating and editing roles is no longer a plan feature: the custom_roles
--   feature is removed and every plan can manage roles.
-- * People invited without a role get basic access (their staff portal).
-- * "Administrator" (for the plan's administrator allowance) now means a
--   person whose roles give them any access, instead of "any role except the
--   built-in Staff Member role". Adding access to a role is checked too.
-- * Kept on purpose (security, not business rules): Owner can't be deleted or
--   emptied; at least one active Owner; nobody can grant access they don't
--   have themselves.
--
-- Rollback: restore system_key values from the audit log, the custom_roles
-- feature and policies from migrations 5 and 10, count_admins/is_member from
-- migrations 6 and 10, accept_invitation from migration 7 and create_company
-- from migration 13.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Existing built-in roles (other than Owner) become the business's own
-- ---------------------------------------------------------------------------
update public.roles set system_key = null where system_key is distinct from 'owner';

delete from public.role_templates where system_key <> 'owner';
alter table public.role_templates drop constraint if exists role_templates_system_key_check;
alter table public.role_templates add constraint role_templates_system_key_check
  check (system_key = 'owner');
alter table public.roles drop constraint if exists roles_system_key_check;
alter table public.roles add constraint roles_system_key_check
  check (system_key is null or system_key = 'owner');

-- New businesses: Owner only.
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
    (v_company, 'Owner', 'Full control of the business account, subscription and roles.', 'owner', true);

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
-- 2. Roles on every plan: drop the custom_roles feature from the policies
-- ---------------------------------------------------------------------------
drop policy roles_insert on public.roles;
drop policy roles_update on public.roles;
drop policy roles_delete on public.roles;
drop policy role_permissions_insert on public.role_permissions;
drop policy role_permissions_delete on public.role_permissions;

create policy roles_insert on public.roles for insert to authenticated
  with check (app.has_company_permission(company_id, 'roles.manage'));
create policy roles_update on public.roles for update to authenticated
  using (app.has_company_permission(company_id, 'roles.manage'))
  with check (app.has_company_permission(company_id, 'roles.manage'));
-- The Owner role can't be deleted (trigger); roles still given to someone
-- can't be deleted (member_roles FK is ON DELETE RESTRICT).
create policy roles_delete on public.roles for delete to authenticated
  using (app.has_company_permission(company_id, 'roles.manage'));
create policy role_permissions_insert on public.role_permissions for insert to authenticated
  with check (app.has_company_permission(company_id, 'roles.manage'));
create policy role_permissions_delete on public.role_permissions for delete to authenticated
  using (app.has_company_permission(company_id, 'roles.manage'));

delete from public.plan_features where feature_key = 'custom_roles';
delete from public.company_feature_overrides where feature_key = 'custom_roles';
delete from public.features where key = 'custom_roles';

-- ---------------------------------------------------------------------------
-- 3. "Administrator" = someone whose roles give them any access
-- ---------------------------------------------------------------------------
create or replace function app.count_admins(p_company uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct m.id)::int
  from public.company_members m
  join public.member_roles mr on mr.member_id = m.id
  join public.role_permissions rp on rp.role_id = mr.role_id
  where m.company_id = p_company
    and m.status = 'active';
$$;

-- Giving a role access can turn the people who hold it into administrators.
create function app.enforce_admin_limit_on_access()
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

create trigger role_permissions_admin_limit
  after insert on public.role_permissions
  for each row execute function app.enforce_admin_limit_on_access();

-- Staff paused by the plan limit lose access unless their roles give them
-- access (previously: unless they held a role other than Staff Member).
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
            join public.role_permissions rp on rp.role_id = mr.role_id
            where mr.member_id = m.id
          )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Invitations without a role give basic access
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.company_invitations;
  v_email text;
  v_confirmed timestamptz;
  v_member uuid;
  v_role uuid;
  v_roles uuid[];
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv
  from public.company_invitations i
  where i.token_hash = app.hash_token(p_token)
  for update;

  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = '22023';
  end if;

  select c.slug::text into v_slug
  from public.companies c where c.id = v_inv.company_id and c.status = 'active';
  if v_slug is null then
    raise exception 'invitation_invalid' using errcode = '22023';
  end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed
  from auth.users u where u.id = v_uid;

  if lower(v_email) <> lower(v_inv.email::text) then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;
  if v_confirmed is null then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  insert into public.company_members (company_id, user_id, status, invited_by)
  values (v_inv.company_id, v_uid, 'active', v_inv.invited_by)
  on conflict (company_id, user_id)
    do update set status = 'active', removed_at = null
  returning id into v_member;

  -- No roles = basic access only (their own staff portal). Businesses decide
  -- every other role themselves.
  v_roles := coalesce(v_inv.role_ids, '{}');

  foreach v_role in array v_roles loop
    insert into public.member_roles (company_id, member_id, role_id, scope_type, created_by)
    values (v_inv.company_id, v_member, v_role, 'company', v_inv.invited_by)
    on conflict do nothing;
  end loop;

  update public.company_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  return v_slug;
end;
$$;
