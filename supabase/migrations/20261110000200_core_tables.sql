-- =============================================================================
-- WOHKAH Phase 1 · Migration 2: core tables
-- Identity, tenancy, organisation structure, access control, entitlements,
-- platform administration, audit and rate limiting.
--
-- Conventions (DATABASE_SCHEMA.md §1):
--  * every tenant table has company_id NOT NULL and UNIQUE (company_id, id)
--  * references between tenant tables use composite FKs (company_id, x_id),
--    so a row can never point at another company's row
--  * no hard deletes for records that must be retained (archived_at instead)
--
-- Rollback (development only): drop the tables in reverse order.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_path text,
  phone text check (phone is null or char_length(phone) <= 32),
  locale text not null default 'en-NG',
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is
  'Global person profile, one per auth user. Not an employee record (ADR-0002).';

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  legal_name text check (legal_name is null or char_length(legal_name) <= 200),
  business_email extensions.citext
    check (business_email is null or business_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 32),
  industry text check (industry is null or char_length(industry) <= 80),
  country_code char(2) not null default 'NG' check (country_code ~ '^[A-Z]{2}$'),
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  website text check (website is null or website ~* '^https?://'),
  size_band text check (size_band in ('1-10', '11-25', '26-50', '51-100', '101+')),
  timezone text not null default 'Africa/Lagos',
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  working_days smallint[] not null default '{1,2,3,4,5}'
    check (working_days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  work_start time not null default '08:00',
  work_end time not null default '17:00',
  logo_path text,
  status public.company_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_work_hours_check check (work_end > work_start)
);
comment on table public.companies is 'A tenant workspace. Created only through public.create_company().';

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  status public.member_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id),
  unique (company_id, id)
);
comment on table public.company_members is
  'Access to a workspace (ADR-0002). Separate from the HR employee record.';
create index company_members_user_idx on public.company_members (user_id, company_id, status);

-- ---------------------------------------------------------------------------
-- Organisation structure
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  parent_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, parent_id) references public.departments (company_id, id),
  check (parent_id is null or parent_id <> id)
);
create unique index departments_name_uniq
  on public.departments (company_id, lower(name)) where archived_at is null;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 100),
  code text check (code is null or code ~ '^[A-Za-z0-9_-]{1,20}$'),
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  phone text check (phone is null or char_length(phone) <= 32),
  timezone text,
  is_headquarters boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index branches_name_uniq
  on public.branches (company_id, lower(name)) where archived_at is null;
create unique index branches_one_hq
  on public.branches (company_id) where is_headquarters and archived_at is null;

create table public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  holiday_date date not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, branch_id) references public.branches (company_id, id)
);
create unique index public_holidays_uniq
  on public.public_holidays (company_id, holiday_date, branch_id) nulls not distinct;

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  module text not null,
  description text not null,
  is_sensitive boolean not null default false,
  sort_order int not null default 0
);
comment on table public.permissions is 'Global permission catalogue. Seeded and extended by migrations only.';

-- Default permissions of the six system roles, copied into each new company.
create table public.role_templates (
  system_key text not null
    check (system_key in ('owner', 'hr_admin', 'ops_manager', 'dept_manager', 'accountant', 'employee')),
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (system_key, permission_key)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  system_key text
    check (system_key in ('owner', 'hr_admin', 'ops_manager', 'dept_manager', 'accountant', 'employee')),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index roles_name_uniq on public.roles (company_id, lower(name));
create unique index roles_system_key_uniq on public.roles (company_id, system_key)
  where system_key is not null;

create table public.role_permissions (
  company_id uuid not null,
  role_id uuid not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key),
  foreign key (company_id, role_id) references public.roles (company_id, id) on delete cascade
);
create index role_permissions_company_idx on public.role_permissions (company_id);

create table public.member_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  member_id uuid not null,
  role_id uuid not null,
  scope_type public.role_scope not null default 'company',
  department_id uuid,
  branch_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, member_id) references public.company_members (company_id, id) on delete cascade,
  foreign key (company_id, role_id) references public.roles (company_id, id) on delete restrict,
  foreign key (company_id, department_id) references public.departments (company_id, id),
  foreign key (company_id, branch_id) references public.branches (company_id, id),
  constraint member_roles_scope_check check (
    (scope_type = 'company' and department_id is null and branch_id is null)
    or (scope_type = 'department' and department_id is not null and branch_id is null)
    or (scope_type = 'branch' and branch_id is not null and department_id is null)
  )
);
create unique index member_roles_uniq
  on public.member_roles (member_id, role_id, scope_type, department_id, branch_id) nulls not distinct;
create index member_roles_member_idx on public.member_roles (member_id, role_id);
create index member_roles_role_idx on public.member_roles (role_id);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  email extensions.citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role_ids uuid[] not null default '{}',
  -- SHA-256 (hex) of the invitation token. The raw token is only ever in the email/link.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index company_invitations_pending_uniq
  on public.company_invitations (company_id, email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Entitlements (plans and features are data, not code: ARCHITECTURE.md §7)
-- ---------------------------------------------------------------------------
create table public.features (
  key text primary key check (key ~ '^[a-z_]+$'),
  kind text not null check (kind in ('boolean', 'limit')),
  description text not null
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z_]+$'),
  name text not null,
  description text,
  monthly_price_minor bigint not null check (monthly_price_minor >= 0),
  annual_price_minor bigint check (annual_price_minor is null or annual_price_minor >= 0),
  included_employees int not null check (included_employees >= 0),
  extra_employee_price_minor bigint not null check (extra_employee_price_minor >= 0),
  currency char(3) not null default 'NGN',
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_features (
  plan_id uuid not null references public.subscription_plans (id) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  enabled boolean not null default true,
  -- For 'limit' features: maximum allowed; NULL means unlimited.
  limit_value int check (limit_value is null or limit_value >= 0),
  primary key (plan_id, feature_key)
);

create table public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete restrict,
  plan_id uuid not null references public.subscription_plans (id),
  billing_interval public.billing_interval,
  status public.subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create table public.company_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  feature_key text not null references public.features (key) on delete cascade,
  enabled boolean not null default true,
  limit_value int check (limit_value is null or limit_value >= 0),
  reason text not null,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Platform (Crift Concepts) administration
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete restrict,
  role text not null check (role in ('super_admin', 'support', 'finance')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.platform_admins is
  'Platform staff. Unrelated to company roles. Managed by migration or service role only.';

create table public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  granted_to uuid not null references auth.users (id) on delete restrict,
  requested_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 500),
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  check (expires_at is null or starts_at is null or expires_at > starts_at),
  check (expires_at is null or starts_at is null or expires_at <= starts_at + interval '72 hours')
);

-- ---------------------------------------------------------------------------
-- Audit and security logs (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid,
  actor_user_id uuid,
  actor_type text not null check (actor_type in ('user', 'platform_admin', 'system', 'job')),
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  metadata jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_company_idx on public.audit_logs (company_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  email_hash text,
  event text not null check (event in (
    'signup', 'login_success', 'login_failure', 'logout',
    'password_reset_requested', 'password_reset_completed',
    'mfa_enrolled', 'mfa_unenrolled', 'mfa_challenge_failed', 'rate_limited'
  )),
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index login_events_user_idx on public.login_events (user_id, created_at desc);

create table public.access_events (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  user_id uuid,
  resource_type text not null,
  resource_id text,
  action text not null,
  created_at timestamptz not null default now()
);
create index access_events_company_idx on public.access_events (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting (ADR-0008): fixed-window counters, server access only
-- ---------------------------------------------------------------------------
create table public.rate_limit_buckets (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at and immutable company_id
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'companies', 'company_members', 'departments', 'branches',
    'public_holidays', 'roles', 'company_invitations', 'subscription_plans',
    'company_subscriptions', 'support_access_grants'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function app.set_updated_at()', t);
  end loop;

  foreach t in array array[
    'company_members', 'departments', 'branches', 'public_holidays', 'roles',
    'role_permissions', 'member_roles', 'company_invitations',
    'company_subscriptions', 'company_feature_overrides', 'support_access_grants'
  ] loop
    execute format(
      'create trigger prevent_company_change before update on public.%I
         for each row execute function app.prevent_company_change()', t);
  end loop;

  foreach t in array array['audit_logs', 'login_events', 'access_events'] loop
    execute format(
      'create trigger append_only before update or delete on public.%I
         for each row execute function app.block_mutation()', t);
  end loop;
end;
$$;
