# WOHKAH — Database Architecture

Status: **Proposed (Phase 0)**. Tables are created **incrementally by phase** through migrations in
`supabase/migrations/`. This document is updated whenever a migration lands.

## 1. Conventions

| Concern | Rule |
|---|---|
| Primary keys | `id uuid primary key default gen_random_uuid()` |
| Tenancy | Every tenant-owned table has `company_id uuid not null references companies(id)`, plus `unique (company_id, id)` so composite foreign keys can target it. |
| Cross-tenant integrity | References between tenant tables use **composite FKs**: `foreign key (company_id, department_id) references departments (company_id, id)`. The database therefore refuses to link Company A's employee to Company B's department. |
| Timestamps | `created_at timestamptz not null default now()`, `updated_at` maintained by trigger. Every column is `timestamptz`. Business dates (pay period, leave day) are `date`, interpreted in the company's timezone. |
| Actors | `created_by uuid references auth.users(id)` where meaningful |
| Money | `amount_minor bigint not null` + `currency char(3) not null` (NGN = kobo). Never `float`/`numeric` for stored amounts. Rates are stored as `numeric(9,6)`. |
| Enums | Postgres `enum` for stable state machines (`employee_status`), lookup tables for configurable values (leave types, salary components). |
| Retention | `archived_at timestamptz` instead of deleting. Financial and legal tables (payroll, payslips, contracts, signatures, loans, audit) **block DELETE and post-lock UPDATE** through policy *and* trigger. |
| Indexes | Every FK and every `company_id` (leading column of composite indexes used by RLS). Partial unique indexes for business rules (one open attendance record per employee). |
| Naming | `snake_case`, plural tables, `<thing>_id` FKs, `idx_<table>_<cols>`, `<table>_<rule>_check`. |
| RLS | Enabled on **every** table in `public`, `force row level security`. No table is reachable without a policy. |
| Functions | Security helpers live in a private `app` schema (not exposed through the API) as `security definer`, `stable` and `set search_path = ''`. |
| Migrations | One concern per file, forward-only in production. Each migration documents its rollback steps in a header comment. Generated TS types (`supabase gen types`) are committed. |

## 2. RLS helper functions (Phase 1)

```sql
-- private schema, not exposed through PostgREST
create schema if not exists app;

app.uid() returns uuid                         -- (select auth.uid()), wrapped so the planner caches it
app.is_member(p_company uuid) returns boolean  -- active membership of the current user
app.member_id(p_company uuid) returns uuid
app.has_permission(p_company uuid, p_key text) returns boolean
       -- true if any of the user's member_roles in p_company grants p_key (any scope)
app.has_permission_for(p_company uuid, p_key text, p_department uuid, p_branch uuid) returns boolean
       -- scope-aware: company scope, or a matching department/branch scope
app.can_access_employee(p_company uuid, p_employee uuid, p_key text) returns boolean
       -- self, or a scoped permission over that employee's department/branch
app.company_has_feature(p_company uuid, p_feature text) returns boolean
app.is_platform_admin() returns boolean        -- platform_admins + aal2 in the JWT
```

Typical policy shapes:

```sql
-- membership-gated read
create policy departments_select on departments for select to authenticated
  using (app.is_member(company_id));

-- permission-gated write
create policy departments_write on departments for insert to authenticated
  with check (app.has_permission(company_id, 'departments.manage'));

-- employee-private data: self or scoped permission
create policy bank_details_select on employee_bank_details for select to authenticated
  using (app.can_access_employee(company_id, employee_id, 'employees.bank.view'));
```

## 3. Phase 1 tables (detailed)

### Identity and tenancy

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `avatar_path`, `phone`, `locale`, `timezone` | Global person profile. Created by trigger on signup. A user reads and updates their own row. Co-members can read `full_name` and `avatar` through a view. |
| `companies` | `id`, `slug` (unique, citext), `name`, `legal_name`, `business_email`, `phone`, `industry`, `country_code`, `address jsonb`, `website`, `size_band`, `timezone`, `currency`, `working_days int[]`, `work_start time`, `work_end time`, `logo_path`, `status` (`active`, `suspended`, `closed`), `created_by` | Created only through an RPC `app.create_company()` that also seeds the owner member, roles and the Free subscription in one transaction. |
| `company_members` | `id`, `company_id`, `user_id`, `status` (`invited`, `active`, `suspended`, `removed`), `invited_by`, `joined_at` | `unique (company_id, user_id)`. A user ↔ company link, separate from the HR record. |
| `company_invitations` | `id`, `company_id`, `email`, `token_hash`, `role_ids uuid[]`, `expires_at`, `accepted_at` | Only a SHA-256 hash of the token is stored. |
| `departments` | `id`, `company_id`, `name`, `parent_id`, `head_employee_id` (FK added in Phase 2), `archived_at` | `unique (company_id, lower(name))` where not archived |
| `branches` | `id`, `company_id`, `name`, `address jsonb`, `timezone`, `archived_at` | |
| `public_holidays` | `id`, `company_id`, `date`, `name`, `branch_id?` | Company calendar |

### Access control

| Table | Key columns | Notes |
|---|---|---|
| `permissions` | `key text pk`, `module`, `description`, `is_sensitive` | Global catalogue, seeded by migration. Read-only to clients. |
| `roles` | `id`, `company_id`, `name`, `system_key` (`owner`, `hr_admin`, `ops_manager`, `dept_manager`, `accountant`, `employee`, or null for custom roles), `is_locked` | The Owner role can't be deleted or emptied. |
| `role_permissions` | `role_id`, `permission_key`, `company_id` | Composite FK to `roles (company_id, id)` |
| `member_roles` | `id`, `company_id`, `member_id`, `role_id`, `scope_type` (`company`, `department`, `branch`), `scope_id` | Check constraint: `scope_id` is null exactly when `scope_type = 'company'`. A trigger ensures each company always has ≥1 active Owner. |

### Platform

| Table | Notes |
|---|---|
| `platform_admins` | `user_id`, `role` (`super_admin`, `support`, `finance`), `created_by`. No client-side write policy. Managed only by migration or super admin RPC. |
| `support_access_grants` | `company_id`, `granted_to` (platform admin), `approved_by` (company owner), `reason`, `expires_at`, `revoked_at`. Time-limited and audited. |

### Audit

| Table | Notes |
|---|---|
| `audit_logs` | `id bigint identity`, `company_id?`, `actor_user_id`, `actor_type` (`user`, `platform_admin`, `system`, `job`), `action` (`employee.updated`), `entity_type`, `entity_id`, `changes jsonb` (before/after with sensitive fields redacted), `ip inet`, `user_agent`, `request_id`, `created_at`. **Append-only**: INSERT through `app.audit()` only, no UPDATE or DELETE for anyone, and readable by holders of `audit.view` in the same company. Partitioned by month once volume justifies it. |
| `login_events` | Sign-in, failure, MFA and password reset events (from an Auth hook and the app) |
| `access_events` | Sensitive reads: payslip downloads, salary views, document downloads, support access |

### Entitlements foundation (proposed for Phase 1)

| Table | Notes |
|---|---|
| `subscription_plans` | `id`, `code` (`free`, `starter`, `growth`, `business`, `scale`), `name`, `monthly_price_minor`, `annual_price_minor`, `included_employees`, `extra_employee_price_minor` (100000 = ₦1,000), `currency`, `is_public`, `version` |
| `plan_features` | `plan_id`, `feature_key`, `enabled`, `limit_value int?` (for example `storage_mb = 500`, `work_locations = 1`, `admins = 1`) |
| `company_subscriptions` | `company_id`, `plan_id`, `billing_interval`, `status` (`trialing`, `active`, `past_due`, `grace`, `canceled`, `expired`), `current_period_start`, `current_period_end`, `trial_ends_at` |
| `company_feature_overrides` | Add-ons and negotiated limits |

Seed prices (minor units, NGN):

| Plan | Monthly | Annual | Included |
|---|---|---|---|
| free | 0 | — | 3 |
| starter | 1 250 000 | 12 500 000 | 10 |
| growth | 2 950 000 | 29 500 000 | 25 |
| business | 5 950 000 | 59 500 000 | 50 |
| scale | 10 950 000 | 109 500 000 | 100 |

## 4. Later-phase inventory (designed when each phase starts)

| Phase | Tables |
|---|---|
| 2 Employees | `positions`, `employees` (core HR identity: number, names, work email, status, department/branch/manager, employment type, dates; `member_id` nullable), `employee_personal_details` (DOB, gender, address: restricted), `employee_emergency_contacts`, `employee_next_of_kin`, `employee_bank_details`, `employee_tax_records` (TIN, pension PIN/PFA, NHF number), `employee_compensation` (effective-dated salary: restricted), `employee_documents`, `employee_history` (append-only status, role, transfer and promotion events) |
| 3 Recruitment / onboarding / contracts / JDs | `job_vacancies`, `applicants`, `applicant_stages`, `interviews`, `interview_feedback`, `onboarding_templates`, `onboarding_template_items`, `onboarding_assignments`, `onboarding_tasks`, `form_definitions`, `form_responses`, `contract_templates`, `contract_template_versions`, `employment_contracts`, `contract_versions`, `contract_signatures` (signer, consent text and hash, document SHA-256, IP, UA, OTP verification, timestamp), `signature_events`, `job_descriptions`, `job_description_versions`, `job_description_acknowledgements`, `policy_acknowledgements` |
| 4 Attendance / shifts | `work_locations` (lat, lng, radius_m, operating hours), `work_location_assignments`, `attendance_records` (one per employee per work day), `attendance_events` (clock in/out and breaks with lat, lng, accuracy_m, distance_m, validation_outcome, flags, device info), `attendance_corrections`, `attendance_exceptions`, `shifts`, `shift_patterns`, `shift_assignments`, `shift_swap_requests` |
| 5 Payroll / leave | `salary_components`, `salary_structures`, `salary_structure_components`, `employee_salary_assignments`, `statutory_jurisdictions`, `statutory_rule_versions` (country, effective_from, effective_to, rules jsonb, checksum, approved_by), `payroll_periods`, `payroll_runs` (status, rule_version_id, inputs_snapshot, totals, idempotency_key), `payroll_items`, `payroll_item_lines`, `payroll_adjustments`, `payroll_payments`, `payslips`, `leave_types`, `leave_policies`, `leave_balances`, `leave_ledger` (accruals, usage, carryover as ledger entries), `leave_requests`, `leave_approvals` |
| 6 Collaboration | `projects`, `project_members`, `tasks`, `task_assignees`, `task_dependencies`, `task_checklist_items`, `task_comments`, `task_attachments`, `conversations` (type: `direct`, `group`, `channel`, `announcement`), `conversation_members`, `messages` (`client_msg_id` unique per sender), `message_attachments`, `message_reactions`, `message_read_receipts`, `meetings`, `meeting_attendees`, `meeting_agenda_items`, `meeting_minutes`, `meeting_action_items` (`task_id` link) |
| 7 Docs / performance / lifecycle | `document_folders`, `company_documents`, `document_versions`, `document_permissions`, `document_acknowledgements`, `performance_cycles`, `performance_goals`, `kpis`, `performance_reviews`, `self_assessments`, `performance_feedback`, `improvement_plans`, `employee_loans`, `loan_schedules`, `loan_repayments`, `assets`, `asset_categories`, `asset_assignments`, `asset_returns`, `asset_maintenance`, `training_programmes`, `training_materials`, `training_assignments`, `training_completions`, `certificates`, `recognitions`, `offboarding_cases`, `offboarding_checklist_items`, `exit_interviews` |
| 8 Reports | `report_exports` (job status, file path, filters, expires_at). Reports read through permission-checked SQL views/functions. |
| 9 Billing / domains | `subscription_items`, `subscription_invoices`, `invoice_lines`, `payment_transactions`, `payment_methods` (provider token references only, **never card data**), `webhook_events` (`provider`, `event_id` unique, payload, processed_at), `usage_records` (daily active-employee counts), `company_domains` (hostname unique where active), `domain_verifications`, `company_branding` |
| 10 Notifications / automation | `notifications`, `notification_preferences`, `notification_templates`, `notification_deliveries` (channel, status, attempts, idempotency key), `outbox_events`, `jobs` |
| 11 Platform | `platform_announcements`, `support_tickets`, `support_messages`, `system_settings`, `supported_countries` |

**Excluded:** no expense or expense-claim tables (Rule 10).

## 5. Integrity rules worth calling out

- **One open attendance session per employee:** partial unique index on `attendance_records (employee_id)
  where clock_out_at is null`.
- **Locked payroll is immutable:** a trigger raises an error on UPDATE/DELETE of `payroll_items` or lines
  when the run status is `locked` or `paid`.
- **Payment ≠ approval:** `payroll_payments` is a separate table, written only by holders of `payroll.pay`
  or by the verified webhook/job path.
- **Unique active domain:** `unique (hostname) where status in ('pending','verified','active')`.
- **Webhook idempotency:** `unique (provider, event_id)` on `webhook_events`.
- **Messages deduplicated:** `unique (conversation_id, sender_user_id, client_msg_id)`.
- **Leave balance consistency:** balances are derived from `leave_ledger`. An approval writes the ledger
  entry and the request state change in one transaction.
- **Billable employees:** `employees.status = 'active'` is the only billable state. A daily job writes
  the count to `usage_records`.
