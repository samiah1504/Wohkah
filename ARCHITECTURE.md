# WOHKAH — System Architecture

> *Your staff, well managed.* A product of Crift Concepts.

Status: **Proposed (Phase 0)**. Nothing here is implemented yet.

## 0. Product language

Everything customers read (screens, emails, notifications, marketing) follows
[`PRODUCT_LANGUAGE_AND_POSITIONING.md`](PRODUCT_LANGUAGE_AND_POSITIONING.md), using the shared
dictionary in `src/lib/copy/` (terminology, role names, navigation labels, feature status) and
`src/lib/plans.ts` (public pricing, checked against the database). Code, database and API names stay
technical: the translation happens at the interface.

## 1. Architectural style

WOHKAH is a **modular monolith**: one Next.js application and one Supabase project per environment. The
code is divided into **domain modules** with explicit boundaries. There are no microservices. The only
separately running pieces are managed services (Supabase, the job executor, the payment provider and
email).

```
                ┌──────────────────────────────────────────────────────────┐
 Browser /      │                    Vercel (Next.js 16)                    │
 Mobile web ───▶│  proxy.ts: host → tenant rewrite, session refresh         │
                │  App Router: RSC pages, Server Actions, Route Handlers    │
                │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
                │  │  modules/*   │  │    lib/*     │  │ api/webhooks │     │
                │  │ (domain svc) │─▶│ tenancy,     │  │ api/jobs     │     │
                │  └──────────────┘  │ permissions, │  └──────┬───────┘     │
                │                    │ entitlements │         │             │
                │                    │ audit, money │         │             │
                └────────────────────┴──────┬───────┴─────────┼─────────────┘
                     user JWT (RLS applies) │       ▲         │ signed webhooks (Paystack)
                ┌───────────────────────────▼───────┴─────────▼─────────────┐
                │ Supabase                                                   │
                │  Postgres + RLS (security edge)   Auth  Storage  Realtime  │
                │  Cron (pg_cron) ──wakes──▶ /api/jobs/worker every minute   │
                │  Queues (pgmq): outbox → queues → retries → dead letter    │
                │  rate_limit_buckets (rate limiting)                        │
                └────────────────────────────────────────────────────────────┘
                     External: Paystack (payments) · Resend (email) · Sentry (errors)
```

## 2. Core principles

1. **The database is the security boundary.** Every request a user makes runs with *their* JWT, so RLS
   applies. The service-role client exists only in `lib/supabase/admin.ts`, may be imported only by an
   allow-list of server modules (webhooks, jobs, platform admin, onboarding bootstrap), and every call
   through it is audited. A lint rule enforces the allow-list.
2. **The tenant is resolved on the server.** Tenant identity comes from the URL slug or host and is
   checked against `company_members` for the authenticated user. Any `company_id` in a form or request
   body is ignored. Services receive a `TenantContext` object instead (§5).
3. **Thin routes, thick services.** Pages and actions validate input with zod and call module services.
   Business rules live in `modules/<domain>/server/*.ts` and pure calculation libraries (payroll,
   billing, leave accrual, geofence) that can be unit-tested without I/O.
4. **Each check has one home.** Permissions go through `lib/permissions`, plan features through
   `lib/entitlements`, and audit records through `lib/audit`. Plan or role checks are not scattered
   through components. The UI only *hides* what the server already *forbids*.
5. **No fake functionality.** If an integration isn't configured, the UI says so ("Payments require
   configuration") and doesn't simulate success.
6. **Money and time are typed.** Money is stored as `bigint` minor units with a currency code. All
   timestamps are `timestamptz`. Business-day logic uses the company's timezone.

## 3. Environments

| Environment | Next.js | Supabase | Payments | Purpose |
|---|---|---|---|---|
| Local / CI | `next dev` | `supabase start` (Docker) or a dev project | Paystack test keys | Development and the automated suite |
| Staging | Vercel preview / `staging` branch | Staging project | Paystack test keys | Acceptance testing and payroll scenario review |
| Production | Vercel production (`main`) | Production project | Paystack live keys | Customers |

Each environment has separate secrets. Production secrets live only in Vercel and Supabase environment
settings. Only `NEXT_PUBLIC_*` values (the Supabase URL, the anon key and the Sentry DSN) reach the
browser.

## 4. Repository layout

```
src/
  app/
    (marketing)/              # wohkah.com: landing, pricing, legal ("A product of Crift Concepts")
    (auth)/                   # login, register, forgot/reset password, MFA, invite/[token]
    w/[slug]/                 # company workspace. The layout resolves TenantContext once.
      (admin)/                # employer modules, each gated by permission
      (me)/                   # employee portal, mobile-first: home, attendance, tasks, messages, leave, profile
      settings/
    admin/                    # Super Admin (Crift Concepts): separate layout, aal2 required
    api/
      webhooks/paystack/      # signature verified and idempotent
      jobs/worker/            # queue worker, called by Supabase Cron (shared-secret auth)
      health/
  modules/
    workspace/  identity/  access/  employees/  recruitment/  onboarding/  contracts/
    job-descriptions/  attendance/  shifts/  payroll/  leave/  tasks/  messaging/  meetings/
    documents/  performance/  assets/  loans/  training/  recognition/  lifecycle/  reports/
    notifications/  billing/  domains/  branding/  platform/
  lib/
    supabase/   server.ts (user client) · browser.ts · admin.ts (service role, restricted)
    tenancy/    resolveTenant(), TenantContext
    permissions/ can(), require(), the permission key catalogue (typed)
    entitlements/ assertFeature(), assertLimit()
    audit/      audit.record()
    money/      Money type, arithmetic, formatting (kobo ↔ naira)
    jobs/       enqueue() via the outbox, job definitions
    storage/    signed upload and download helpers, MIME and size validation
    rate-limit/ Postgres-backed limiter (app.rate_limit_hit)
  components/ui/              # shadcn/ui with WOHKAH tokens
  proxy.ts
supabase/
  migrations/  tests/  seed.sql  config.toml
tests/  unit/  integration/  e2e/
```

### Module contract

Each module exposes **only** `modules/<x>/index.ts` (types and service functions) to other modules.
Cross-module calls go through these public services, never by reaching into another module's tables
from a query. Examples: payroll calls `attendance.getApprovedSummary()` and `leave.getUnpaidDays()`, and
lifecycle offboarding calls `assets.getOutstanding()` and `loans.getOutstanding()`. An ESLint
`no-restricted-imports` rule enforces this.
## 5. Request flow and tenancy

```
GET acme.wohkah.com/attendance
 └─ proxy.ts: host "acme.wohkah.com" → rewrite to /w/acme/attendance
    (custom domain: look up company_domains where status = 'active', from a cached edge map)
    refresh the Supabase session cookie
 └─ app/w/[slug]/layout.tsx
    resolveTenant(slug):
       company = select … from companies where slug = $1          -- RLS: visible only to members
       member  = select … from company_members where company_id = company.id and user_id = auth.uid()
                 and status = 'active'
       if missing → 404 (we don't reveal that the workspace exists)
       permissions = app.member_permissions(member.id)             -- one query, cached per request
    → TenantContext { companyId, memberId, employeeId?, permissions, scopes, plan }
 └─ page / server action → modules/<x>/server/service(ctx, input)
       require(ctx, 'attendance.view')         -- application check (clear error messages)
       supabase (user JWT) query .eq('company_id', ctx.companyId)
       RLS re-checks membership and permission  -- the real security boundary
```

A user in several companies has one session. The workspace switcher simply moves to another `/w/[slug]`.
Because the active workspace is part of the URL, two tabs can safely show two different companies. RLS
makes a non-member's view of another company empty. The `.eq('company_id', ctx.companyId)` filter makes
sure a multi-company user sees only the *selected* workspace. Both layers are tested (see SECURITY.md §4).

## 6. Authorisation model (summary)

- `permissions`: a global catalogue of keys such as `employees.view`, `employees.edit`,
  `payroll.approve`, `payroll.export` and `salary.view`.
- `roles`: per company, seeded from five system templates (Owner, Staff Manager, Operations
  Manager, Accountant, Staff Member). Custom roles depend on the plan. Departments and the
  Department Manager role were removed on 2026-11-14 (migration `20261114000300`).
- `member_roles`: (member, role, **scope**), where scope is `company` or `branch:<id>`. A role
  scoped to the Lagos branch applies only to that branch.
- The SQL helpers `app.has_permission(company_id, key)` and
  `app.can_access_employee(company_id, employee_id, key)` serve RLS. `lib/permissions` mirrors them for
  the UI and for clear error messages.
- Owner-level permissions **never** include reading private conversations or other employees'
  self-assessments.

## 7. Entitlements

`subscription_plans` → `plan_features (plan_id, feature_key, enabled, limit_value)`, plus company-level
overrides (`company_feature_overrides`) for add-ons and deals. Each request resolves the effective
entitlements once, server-side:

- `assertFeature(ctx, 'contracts.digital')` before gated actions.
- `assertLimit(ctx, 'work_locations', currentCount)` before inserts.
- RLS `WITH CHECK` uses `app.company_has_feature()` for the most important gates, so a forged request
  can't bypass the plan.

Plan entitlements are **data**, not code, so they can be changed without a deploy.

## 8. Background jobs and automation (ADR-0005)

- **Transactional outbox:** domain writes insert an `outbox_events` row *in the same transaction* (for
  example `leave.approved` or `employee.hired`), which also puts a message on a **Supabase Queue
  (`pgmq`)**. No event is lost if a request crashes.
- **Supabase Cron (`pg_cron`)** schedules recurring work (contract expiry, onboarding reminders,
  accruals, billing cycles) and wakes the worker route `/api/jobs/worker` every minute through `pg_net`.
- **The worker** reads batches with a visibility timeout, retries failures with increasing delays, and
  moves a message to a dead-letter queue after the maximum number of attempts. The Super Admin health view
  shows dead letters and can retry them. Handlers are idempotent, keyed by event ID.
- Long tasks (payroll calculation, large exports, bulk notifications) are split into chunked messages. A
  `jobs` table holds user-visible status and progress.
- Jobs that need the service role use it only inside the job module, always with an explicit
  `company_id`, and always audited.

## 9. Realtime (messaging, notifications)

- Supabase Realtime **Broadcast** on **private channels** (`company:{id}:conversation:{id}`,
  `user:{id}:notifications`), authorised by RLS policies on `realtime.messages`.
- Messages are persisted first (insert with a client-generated `client_msg_id` and a unique constraint,
  so duplicates are rejected). A database trigger then broadcasts. History uses keyset pagination
  `(created_at, id)`.
- **Presence** for online status and typing indicators. Neither is persisted.

## 10. Files

- Private Supabase Storage buckets: `employee-documents`, `contracts`, `payslips`,
  `message-attachments`, `company-assets`. Public buckets only for company logos and branding.
- Object keys always start with `company_id/…`. Storage RLS checks that prefix plus permission.
- Downloads use short-lived signed URLs (60–300 s) and every sensitive download is audited.
- Uploads are validated server-side (MIME sniffing, size limits from entitlements and storage quota).

## 11. Payroll engine (ADR-0004), summary

A pure TypeScript calculator: `calculate(inputs, ruleVersion) → result`. Inputs (salary structure,
attendance summary, leave, loans, adjustments) and the statutory rule version are **snapshotted** onto
the payroll run, so any historical run can be recalculated exactly. Statuses:
`draft → calculated → approved → locked → paid (per item)`. Corrections after locking are made only with
adjustment or reversal entries in a later run.

## 12. Billing (ADR-0006), summary

WOHKAH owns the billing logic. Invoice amount = plan price + max(0, billable active employees − included)
× ₦1,000 + add-ons. Paystack is used only to collect payment (card authorisation, transfers). Webhooks are
verified with HMAC-SHA512 and deduplicated by event ID. Customers are always notified before a charge.

## 13. Observability

- Sentry for errors and traces (PII scrubbing enabled, no request bodies).
- Structured logs (`requestId`, `companyId`, `userId`, no PII values).
- `/api/health` checks database reachability and job backlog. The Super Admin system-health view reads
  the same signals.

## 14. Branding and theming

The WOHKAH brand tokens are CSS variables (Tailwind v4 `@theme`):

| Token | Value | Use |
|---|---|---|
| `--brand-primary` | `#D69E00` Deep Yellow | Primary actions, highlights |
| `--brand-walnut` | `#2B1D18` Dark Walnut | Signature dark: sidebar, headers, logo |
| `--brand-charcoal` | `#292929` Deep Charcoal | Body text, neutral dark |
| `--bg` | `#FAF8F2` Warm Ivory | App background |
| `--bg-subtle` | `#F4E8CF` Warm Sand | Secondary panels |
| `--muted` | `#78665B` Walnut Taupe | Secondary text, borders |
| `--surface-dark` | `#42332B` Deep Espresso | Dark surfaces |
| `--surface` | `#FFFFFF` | Cards, forms |

Manrope is used for headings and Inter for body text, both through `next/font`. Text on Deep Yellow uses
Dark Walnut, not white, to meet WCAG AA contrast. **Company branding** (logo, accent colour, welcome
message) applies only to company-scoped surfaces (login on the company domain, the employee portal
header), through a separate `--tenant-accent` token. The WOHKAH core tokens are never overridden.

## 15. Explicitly out of scope

- **Company Expense Management.** It is excluded from navigation, schema and roadmap.
- Native mobile apps and background location tracking. WOHKAH is a responsive web app and the attendance
  module documents that limitation.
- Voice and video calls (possible future phase).
