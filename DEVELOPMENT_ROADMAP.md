# WOHKAH — Development Roadmap

Phases run in order. No phase starts until the previous phase's acceptance criteria pass and are
reported (master prompt, PART 13). Status key: ✅ Completed · 🟡 Partially completed · ⬜ Not started ·
⛔ Blocked

| Phase | Name | Status |
|---|---|---|
| 0 | Project audit and architecture | ✅ Completed and approved |
| 1 | Foundation and multi-tenancy (plus the entitlements foundation) | ✅ Acceptance criteria met ([report](docs/PHASE_1_REPORT.md)); follow-ups listed there |
| 2 | Employee management | ⬜ |
| 3 | Recruitment, onboarding, contracts, job descriptions | ⬜ |
| 4 | GPS attendance and shift scheduling | ⬜ |
| 5 | Payroll and leave | ⬜ |
| 6 | Tasks, messaging, meetings | ⬜ |
| 7 | Documents, performance, loans, assets, training, recognition, lifecycle | ⬜ |
| 8 | Reports and analytics | ⬜ |
| 9 | SaaS billing, plans, custom domains, branding | ⬜ |
| 10 | Notifications, automation, integrations | ⬜ |
| 11 | Super Admin, security hardening, production launch | ⬜ |

Every phase starts by reading [PRODUCT_LANGUAGE_AND_POSITIONING.md](PRODUCT_LANGUAGE_AND_POSITIONING.md)
(mandatory: customer-facing wording) and then follows the same loop (Rule 1): review → plan → migrations → RLS policies with tests → services
→ UI → typecheck, lint, unit, integration, RLS and e2e tests → docs and CHANGELOG → phase report.

---

## Phase 1 — Foundation and multi-tenancy

**Prerequisites:** approval of the Phase 0 decisions, a Supabase dev project or CI Docker strategy,
and a Vercel project.

**Build**
1. Scaffold: Next.js 16, strict TS, Tailwind v4 with brand tokens, shadcn/ui, ESLint with module-boundary
   rules, Prettier, Vitest, Playwright, GitHub Actions CI (typecheck, lint, unit, `supabase test db`,
   e2e), `.env.example`, Sentry.
2. Migrations: `app` schema helpers, `profiles`, `companies`, `company_members`, `company_invitations`,
   `departments`, `branches`, `public_holidays`, `permissions` (seeded), `roles`, `role_permissions`,
   `member_roles`, `platform_admins`, `support_access_grants`, `audit_logs`, `login_events`,
   `access_events`, `subscription_plans`, `plan_features` (seeded), `company_subscriptions`,
   `company_feature_overrides`.
3. RPC `create_company()`: company, Owner membership, the six system roles with default permissions, and a
   Free subscription, all in one transaction.
4. Auth: register, login, logout, forgot and reset password, email verification, optional TOTP MFA
   enrolment.
5. Tenancy: `resolveTenant`, `TenantContext`, the workspace switcher, `/w/[slug]` layout, a 404 for
   non-members.
6. Workspace settings: company profile, working days and hours, timezone, currency, departments, branches,
   holidays.
7. Members and roles: invite a member (email via Supabase SMTP or Resend), assign roles with scopes, and
   view the role permission matrix. Custom roles are gated by entitlement.
8. `lib/permissions`, `lib/entitlements`, `lib/audit`, `lib/money`, `lib/rate-limit`.
9. App shell: employer sidebar and the mobile-first employee navigation (Home, Attendance, Tasks,
   Messages, Leave, Profile). Modules that aren't built yet are **hidden**, not shown as dead links.
10. Marketing placeholder page and auth pages with "A product of Crift Concepts".

**Acceptance criteria**
- Users can register, verify, log in, reset their password and log out (e2e).
- A user can create a company and becomes its Owner.
- A user can belong to several companies with different roles and switch between them (e2e).
- The tenant-isolation suite (SECURITY.md §4, items 1–3, 5, 6, 8) passes.
- Every table has RLS enabled (catalog test).
- The audit log records company, membership, role and settings changes, and is append-only (test).
- Typecheck, lint and all tests are green in CI.

## Phase 2 — Employee management
Employees (core and restricted sub-tables), positions, reporting lines (no cycles), statuses and the
status state machine, employee history, search, filters, pagination, export (permission-gated), employee
documents (private storage), profile pages, and employee self-service edits of allowed fields.
**Acceptance:** CRUD with permissions, scoped manager access, sensitive-data tests (SECURITY.md §4 item 4),
no cross-tenant leaks, history preserved, no hard deletes.

## Phase 3 — Recruitment, onboarding, contracts, job descriptions
Vacancies, applicants and stages, interviews and feedback, conversion of a candidate to an employee,
invitation acceptance, onboarding templates and checklists, a form builder with responses, required
document collection, contract templates (with DOCX/PDF upload and merge fields), contract generation,
evidence-based signing (ADR-0007), versioning and amendments, policy acknowledgements, versioned job
descriptions with acknowledgement, onboarding progress, and reminders (first use of the job system).
**Acceptance:** as in the master prompt. Signed documents are immutable and hash-verified.

## Phase 4 — GPS attendance and shift scheduling
Work locations and geofences, the location privacy notice, clock in and out, breaks with server-side
haversine validation, accuracy thresholds, anomaly flags, duplicate prevention, shifts, patterns and
rosters, swaps, late and early and overtime detection, corrections and manual exceptions with
approval, and attendance reports. Device test matrix (Android Chrome, iOS Safari, desktop).
**Acceptance:** as in the master prompt, plus the DPIA completed.

## Phase 5 — Payroll and leave
Salary components and structures, effective-dated assignments, the statutory rules engine (ADR-0004)
with versioned Nigeria rules **entered from professional-verified sources**, payroll periods and
runs (calculate → preview → approve → lock), payment recording (separate from approval), adjustments
and reversals, PDF payslips, the employee payslip view, payroll history. Leave types and policies, accrual
and carryover jobs, the ledger-based balance, requests and approvals, the leave calendar, and team
availability.
**Acceptance:** golden-file payroll scenarios reconcile to the kobo, historical runs reproduce exactly,
locked runs are immutable (test), and approvals update leave balances correctly.
**Blocker before launch:** sign-off from a payroll professional.

## Phase 6 — Tasks, messaging, meetings
Projects, tasks (assignees, subtasks, checklists, dependencies, approvals, attachments, comments) and
personal and team dashboards. Messaging: DMs, groups and team channels, announcements,
attachments, voice notes, reactions, replies, editing, deletion under retention rules, read receipts,
typing, presence, search (Postgres full-text), unread counts, keyset pagination, idempotent sends.
Meetings: agenda, attendees, invitations, minutes, decisions, action items → tasks.
**Acceptance:** as in the master prompt, plus the "owner cannot read private DMs" test.

## Phase 7 — Documents, performance and the employee lifecycle
The document centre (folders, permissions, versions, acknowledgements, expiry), performance (cycles,
goals, KPIs, self and manager reviews, feedback, PIPs), loans and advances (schedules, payroll
deduction integration, settlement), assets (register, assignment, returns, maintenance), training and
certificates, recognition, promotions and transfers, resignation and termination, offboarding with
clearance (assets, loans, final pay, access revocation, archiving).
**Acceptance:** as in the master prompt.

## Phase 8 — Reports and analytics
Report catalogue backed by permission-checked SQL functions, filters, and PDF, Excel and CSV exports as
background jobs, with reconciliation tests against the source tables.

## Phase 9 — Billing, plans, custom domains, branding
The billing engine (ADR-0006), the Paystack adapter, invoices, payment history, trials, upgrade and
downgrade with proration, grace and expiry, the employee-limit and extra-employee calculation,
entitlement enforcement end to end, custom domains (TXT verification, Vercel Domains API, SSL status,
routing, cross-company domain tests), company branding, and Super Admin subscription controls.

## Phase 10 — Notifications, automation, integrations
Notification centre, preferences, templates, email delivery (Resend) with retries and deduplication,
all scheduled automations listed in Module 20, optional SMS and WhatsApp adapters.

## Phase 11 — Super Admin, hardening, launch
Super Admin dashboard (companies, subscriptions, revenue, trials, suspension, announcements, settings,
support, health, platform audit, countries and jurisdictions), penetration-style security review,
accessibility (WCAG 2.2 AA), performance budgets, backups and restore drill, runbooks, DEPLOYMENT.md,
legal pages, and the production go-live checklist.

---

## Documentation plan (Rule 8)

| Document | Created |
|---|---|
| README.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, SECURITY.md, DEVELOPMENT_ROADMAP.md, CHANGELOG.md, ADRs | Phase 0 ✅ |
| `.env.example` | Phase 1 ✅ |
| API_DOCUMENTATION.md | Phase 1 ✅ |
| DEPLOYMENT.md | Phase 1 ✅ (environments, CI); completed in Phase 11 |
