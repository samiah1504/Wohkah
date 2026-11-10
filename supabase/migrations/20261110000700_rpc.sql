-- =============================================================================
-- WOHKAH Phase 1 · Migration 7: RPC functions
-- Multi-table operations that must be atomic, plus a single-round-trip
-- workspace context loader. Every SECURITY DEFINER function derives the user
-- from auth.uid() and never accepts a user id or company id it would trust.
--
-- Rollback: drop the functions below.
-- =============================================================================

-- Slugs that would collide with routes or infrastructure subdomains.
create function app.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'www', 'app', 'api', 'admin', 'auth', 'login', 'logout', 'register', 'signup', 'signin',
    'mail', 'email', 'smtp', 'support', 'help', 'docs', 'status', 'billing', 'pay', 'payments',
    'static', 'assets', 'cdn', 'files', 'storage', 'dashboard', 'settings', 'account',
    'wohkah', 'crift', 'criftconcepts', 'staging', 'dev', 'test', 'demo', 'blog', 'w',
    'invite', 'invitations', 'security', 'legal', 'privacy', 'terms', 'about', 'pricing'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- create_company: company + owner membership + six system roles + Free plan,
-- in one transaction.
-- ---------------------------------------------------------------------------
create function public.create_company(
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
    (v_company, 'HR Administrator', 'People records, invitations and HR processes.', 'hr_admin', false),
    (v_company, 'Operations Manager', 'Branches, attendance, shifts and operations.', 'ops_manager', false),
    (v_company, 'Department Manager', 'Their department''s team, tasks and approvals.', 'dept_manager', false),
    (v_company, 'Accountant', 'Payroll and financial records.', 'accountant', false),
    (v_company, 'Employee', 'Self-service access to their own records.', 'employee', false);

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

-- ---------------------------------------------------------------------------
-- Slug availability (subdomains are public, so existence is not secret)
-- ---------------------------------------------------------------------------
create function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(p_slug) ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
    and not app.is_reserved_slug(p_slug)
    and not exists (select 1 from public.companies c where c.slug = lower(p_slug));
$$;

revoke all on function public.is_slug_available(text) from public, anon;
grant execute on function public.is_slug_available(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------
create function app.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- What an invitation link points to, without accepting it. Possession of the
-- (random, 256-bit) token is the only key.
create function public.invitation_preview(p_token text)
returns table (company_name text, company_slug text, email text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.slug::text, i.email::text, i.expires_at
  from public.company_invitations i
  join public.companies c on c.id = i.company_id and c.status = 'active'
  where i.token_hash = app.hash_token(p_token)
    and i.status = 'pending'
    and i.expires_at > now();
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated;

create function public.accept_invitation(p_token text)
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

  v_roles := v_inv.role_ids;
  if coalesce(array_length(v_roles, 1), 0) = 0 then
    select array[r.id] into v_roles
    from public.roles r where r.company_id = v_inv.company_id and r.system_key = 'employee';
  end if;

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

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Workspace context: one round trip for the server's TenantContext.
-- SECURITY INVOKER: it runs under the caller's RLS, so a non-member gets NULL.
-- ---------------------------------------------------------------------------
create function public.workspace_context(p_slug text)
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
        'scope_type', mr.scope_type, 'department_id', mr.department_id, 'branch_id', mr.branch_id
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

revoke all on function public.workspace_context(text) from public, anon;
grant execute on function public.workspace_context(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Rate limiting (ADR-0008). Fixed window. Service role only: the WOHKAH server
-- calls it before login, sign-up, password reset and invitations.
-- ---------------------------------------------------------------------------
create function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count int;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets as b (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = b.count + 1
  returning b.count into v_count;

  -- Opportunistic cleanup (about 1% of calls) so no scheduler is needed yet.
  if random() < 0.01 then
    delete from public.rate_limit_buckets where window_start < now() - interval '1 day';
  end if;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

grant execute on all functions in schema app to authenticated, service_role;
