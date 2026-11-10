-- =============================================================================
-- WOHKAH Phase 1 · Migration 4: reference data
-- Permission catalogue, system role templates, features and subscription
-- plans. Reference data lives in migrations (not seed.sql) because every
-- environment, including production, needs it.
--
-- Later phases add permissions with a migration that (1) inserts into
-- permissions, (2) inserts into role_templates, and (3) grants the new key to
-- the matching system roles of existing companies.
--
-- Rollback: delete from the tables below.
-- =============================================================================

insert into public.permissions (key, module, description, is_sensitive, sort_order) values
  ('company.settings.manage', 'workspace', 'Edit company profile, working hours and calendar', false, 10),
  ('departments.manage',      'workspace', 'Create, edit and archive departments', false, 20),
  ('branches.manage',         'workspace', 'Create, edit and archive branches', false, 30),
  ('holidays.manage',         'workspace', 'Manage the company holiday calendar', false, 40),
  ('members.view',            'access',    'View workspace members and their roles', false, 50),
  ('members.invite',          'access',    'Invite people to the workspace', false, 60),
  ('members.manage',          'access',    'Suspend, reactivate and remove members', true, 70),
  ('roles.view',              'access',    'View roles and their permissions', false, 80),
  ('roles.assign',            'access',    'Assign and remove roles for members', true, 90),
  ('roles.manage',            'access',    'Create custom roles and edit role permissions', true, 100),
  ('audit.view',              'security',  'View the workspace audit log', true, 110),
  ('subscription.view',       'billing',   'View plan, usage and invoices', false, 120),
  ('subscription.manage',     'billing',   'Change plan and payment settings', true, 130),
  ('support_access.manage',   'security',  'Approve or revoke WOHKAH support access', true, 140);

-- Owner: everything.
insert into public.role_templates (system_key, permission_key)
select 'owner', key from public.permissions;

insert into public.role_templates (system_key, permission_key) values
  ('hr_admin', 'departments.manage'),
  ('hr_admin', 'holidays.manage'),
  ('hr_admin', 'members.view'),
  ('hr_admin', 'members.invite'),
  ('hr_admin', 'members.manage'),
  ('hr_admin', 'roles.view'),
  ('hr_admin', 'roles.assign'),
  ('ops_manager', 'branches.manage'),
  ('ops_manager', 'holidays.manage'),
  ('ops_manager', 'members.view'),
  ('dept_manager', 'members.view'),
  ('accountant', 'members.view'),
  ('accountant', 'subscription.view');
-- 'employee' has no workspace-administration permissions. Employee self-service
-- (own records, attendance, leave, payslips) is granted by ownership rules in
-- later phases, not by permissions.

insert into public.features (key, kind, description) values
  ('admins',              'limit',   'Members holding any role other than Employee'),
  ('branches',            'limit',   'Active branches'),
  ('work_locations',      'limit',   'Geofenced work locations (Phase 4)'),
  ('storage_mb',          'limit',   'File storage in megabytes'),
  ('custom_domains',      'limit',   'Connected custom domains (Phase 9)'),
  ('custom_roles',        'boolean', 'Create custom roles and edit role permissions'),
  ('advanced_onboarding', 'boolean', 'Onboarding templates and workflows (Phase 3)'),
  ('job_descriptions',    'boolean', 'Versioned job descriptions (Phase 3)'),
  ('digital_contracts',   'boolean', 'Contract templates and e-signature (Phase 3)'),
  ('advanced_approvals',  'boolean', 'Multi-step approval workflows'),
  ('advanced_reporting',  'boolean', 'Advanced reports and exports (Phase 8)'),
  ('advanced_analytics',  'boolean', 'Workforce analytics (Phase 8)');

-- Prices in minor units (kobo). ₦1,000 per extra active employee on every plan.
-- Annual = 10 × monthly.
insert into public.subscription_plans
  (code, name, description, monthly_price_minor, annual_price_minor, included_employees,
   extra_employee_price_minor, sort_order) values
  ('free',     'Free',     'Genuine value for very small teams, free forever.',
     0,        null,      3,   100000, 10),
  ('starter',  'Starter',  'Professional workforce management for small businesses.',
     1250000,  12500000,  10,  100000, 20),
  ('growth',   'Growth',   'More employees, departments and workflows.',
     2950000,  29500000,  25,  100000, 30),
  ('business', 'Business', 'Multiple branches and more complex operations.',
     5950000,  59500000,  50,  100000, 40),
  ('scale',    'Scale',    'Advanced controls, integrations and configuration.',
     10950000, 109500000, 100, 100000, 50);

-- Plan entitlements. Values marked "proposed" are initial settings to be confirmed
-- by the product owner; they are data and can change without a code release.
-- NULL limit = unlimited.
with matrix (plan_code, feature_key, enabled, limit_value) as (
  values
  -- Free (from the master prompt: 1 admin, 1 work location, 500 MB)
  ('free', 'admins', true, 1),
  ('free', 'branches', true, 1),                -- proposed
  ('free', 'work_locations', true, 1),
  ('free', 'storage_mb', true, 500),
  ('free', 'custom_domains', false, 0),
  ('free', 'custom_roles', false, null),
  ('free', 'advanced_onboarding', false, null),
  ('free', 'job_descriptions', false, null),
  ('free', 'digital_contracts', false, null),
  ('free', 'advanced_approvals', false, null),
  ('free', 'advanced_reporting', false, null),
  ('free', 'advanced_analytics', false, null),
  -- Starter (proposed)
  ('starter', 'admins', true, 3),
  ('starter', 'branches', true, 2),
  ('starter', 'work_locations', true, 3),
  ('starter', 'storage_mb', true, 5120),
  ('starter', 'custom_domains', false, 0),      -- available as a paid add-on (override)
  ('starter', 'custom_roles', false, null),
  ('starter', 'advanced_onboarding', true, null),
  ('starter', 'job_descriptions', true, null),
  ('starter', 'digital_contracts', true, null),
  ('starter', 'advanced_approvals', false, null),
  ('starter', 'advanced_reporting', false, null),
  ('starter', 'advanced_analytics', false, null),
  -- Growth (proposed)
  ('growth', 'admins', true, 5),
  ('growth', 'branches', true, 5),
  ('growth', 'work_locations', true, 10),
  ('growth', 'storage_mb', true, 20480),
  ('growth', 'custom_domains', true, 1),
  ('growth', 'custom_roles', true, null),
  ('growth', 'advanced_onboarding', true, null),
  ('growth', 'job_descriptions', true, null),
  ('growth', 'digital_contracts', true, null),
  ('growth', 'advanced_approvals', true, null),
  ('growth', 'advanced_reporting', false, null),
  ('growth', 'advanced_analytics', false, null),
  -- Business (proposed)
  ('business', 'admins', true, 10),
  ('business', 'branches', true, null),
  ('business', 'work_locations', true, 25),
  ('business', 'storage_mb', true, 51200),
  ('business', 'custom_domains', true, 1),
  ('business', 'custom_roles', true, null),
  ('business', 'advanced_onboarding', true, null),
  ('business', 'job_descriptions', true, null),
  ('business', 'digital_contracts', true, null),
  ('business', 'advanced_approvals', true, null),
  ('business', 'advanced_reporting', true, null),
  ('business', 'advanced_analytics', true, null),
  -- Scale (proposed)
  ('scale', 'admins', true, null),
  ('scale', 'branches', true, null),
  ('scale', 'work_locations', true, null),
  ('scale', 'storage_mb', true, 102400),
  ('scale', 'custom_domains', true, 3),
  ('scale', 'custom_roles', true, null),
  ('scale', 'advanced_onboarding', true, null),
  ('scale', 'job_descriptions', true, null),
  ('scale', 'digital_contracts', true, null),
  ('scale', 'advanced_approvals', true, null),
  ('scale', 'advanced_reporting', true, null),
  ('scale', 'advanced_analytics', true, null)
)
insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, m.feature_key, m.enabled, m.limit_value
from matrix m
join public.subscription_plans p on p.code = m.plan_code;
