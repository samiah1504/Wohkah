# WOHKAH — Phase 0: Project Audit

| | |
|---|---|
| Date | 2026-11-07 |
| Branch | `claude/wohkah-architecture-audit-fjcmga` |
| Status | **Complete. Waiting for approval before Phase 1** |

This document covers the ten items PART 14 of the master prompt asks for. The architecture is in
[`ARCHITECTURE.md`](../ARCHITECTURE.md), the database design is in
[`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md), security is in [`SECURITY.md`](../SECURITY.md) and the
plan is in [`DEVELOPMENT_ROADMAP.md`](../DEVELOPMENT_ROADMAP.md). The main decisions are recorded in
[`docs/adr/`](./adr).

---

## 1. Current project audit

| Check | Finding |
|---|---|
| Git history | **No commits.** The remote `samiah1504/Wohkah` has no branches or refs. |
| Source code | None. The working tree held only `.git/`. |
| Database schema / migrations | None. |
| Supabase configuration | None. There is no `supabase/` directory, `config.toml`, project ref or linked project. |
| Authentication | None. |
| Environment variables | None. There is no `.env*` file and no secrets in the repository, which is good. |
| Broken or incomplete functionality | None, because nothing exists yet. |
| Code worth preserving | None. |

**Conclusion:** WOHKAH is a **greenfield** project. There is no existing architecture to protect, so the
recommended stack can be adopted without migration cost. Rule 4 (protect existing functionality) has
nothing to apply to yet. It applies from Phase 1 onward.

### Tooling found in the development container

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.23 | Fine for Next.js 16. |
| npm / pnpm | 10.9 / 10.28 | **pnpm recommended** (see ADR-0001). |
| PostgreSQL client and server | 16.15 | A local cluster exists but is stopped. We can use it for pgTAP/RLS tests if we add an `auth` schema shim. |
| Docker | **Not available** | The Supabase CLI local stack (`supabase start`) **cannot run here**. See risk R-12. |
| Chromium + Playwright | pre-installed | Enough for end-to-end tests. |

### Current upstream versions (checked 2026-11-07)

| Package | Latest | Recommendation |
|---|---|---|
| next | 16.4.x | Adopt the latest 16.x and pin it exactly. |
| react / react-dom | 19.3.x | Use the version that Next 16 pairs with. |
| typescript | 7.0.x (the new native compiler) | **Confirm compatibility** with Next.js, typescript-eslint and Vitest at Phase 1 setup. If any is incompatible, pin the latest supported 5.x/6.x. Strict mode either way. |
| tailwindcss | 4.3.x | v4 (CSS-first config). |
| @supabase/supabase-js / @supabase/ssr | 2.119 / 0.12 | Use `@supabase/ssr` for cookie-based server auth. |
| supabase (CLI) | 3.0.x | For migrations, type generation and `supabase test db`. |
| zod | 4.x | One validation layer, shared by client and server. |
| vitest / @playwright/test | 5.1 / 1.65 | Unit and integration tests, plus end-to-end tests. |
| @sentry/nextjs | 11.x | Error monitoring. |

## 2. Existing technology stack

None. The **recommended** stack follows the master prompt with no deviations:

- **Next.js App Router, React, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Radix UI and Lucide.**
- **Supabase**: PostgreSQL, Auth, Storage and Realtime.
- **Vercel** for hosting, wildcard subdomains and custom domains.

Additions the prompt leaves open (each one justified in an ADR and each needing approval):

| Need | Recommendation | Alternative | ADR |
|---|---|---|---|
| Background jobs and scheduling | ✅ **Supabase Cron + Supabase Queues** with a transactional outbox and a worker route | Inngest (rejected: extra vendor) | 0005 |
| Payments (Nigeria) | ✅ **Paystack**, behind a `PaymentProvider` adapter | Flutterwave (approved alternative) | 0006 |
| E-signature | Built-in **evidence-based click-to-sign** with a provider adapter for later external providers | Dropbox Sign, DocuSign or a Nigerian provider | 0007 |
| Transactional email | ✅ **Resend** (React Email templates) | Postmark | 0008 |
| Rate limiting | ✅ **Counter table in Supabase Postgres** | Upstash (rejected: extra vendor) | 0008 |
| Error monitoring | ✅ **Sentry** | Vercel observability only | 0008 |
| PDF output (payslips, contracts, reports) | `@react-pdf/renderer` | Headless Chromium (too heavy for serverless) | 0008 |
| DOCX templates | `docxtemplater` | Convert to HTML templates only | 0008 |
| Excel export | `exceljs` | CSV only | 0008 |
| SMS / WhatsApp (optional, Phase 10) | Termii (SMS, Nigeria) and Meta WhatsApp Cloud API | Twilio | 0008 |

## 3. Existing database architecture

None. The proposed design is in [`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md). Its key properties:

- Every tenant-owned table has `company_id uuid not null`. **Composite foreign keys** `(company_id, x_id)`
  stop a row in Company A from pointing at a row in Company B, even if application code has a bug.
- RLS is enabled on **every** table in `public`. Policies call a small set of `SECURITY DEFINER` helper
  functions in a private `app` schema (`app.is_member`, `app.has_permission`, `app.can_access_employee`).
- Sensitive employee data (bank details, tax IDs, salary, emergency contacts) lives in **separate
  tables**, each with its own stricter policy. It is never stored as columns on `employees`.
- Money is stored as `bigint` minor units (kobo) together with an ISO-4217 currency code. Floats are
  never used.
- Financial and legal records are append-only or soft-archived. Hard deletes are blocked by policy and
  by trigger.

## 4. Existing authentication implementation

None. Proposed design (ADR-0002, ADR-0003):

- **Supabase Auth** with email and password, magic-link invitations and optional TOTP MFA. Cookie sessions
  through `@supabase/ssr`.
- **One identity per person** (`auth.users` plus `public.profiles`). A person joins a company through
  `company_members`. An employee record (`employees`) is a separate HR object that may link to a member.
- The **active workspace is resolved on the server from the URL** (`/w/[slug]/…`, or from the host for
  subdomains and custom domains). On every request it is checked against `company_members`. A
  `company_id` sent by the browser is never trusted. RLS enforces membership whatever the application
  layer does.
- **Platform super admins** live in a separate `platform_admins` table and must use MFA (`aal2`). Being a
  company owner never grants platform access. Support access to a tenant needs a time-limited, audited
  grant.

## 5. Existing folder structure

Empty. The proposed structure (ARCHITECTURE.md §4):

```
src/
  app/                      # routing only: thin pages, layouts, route handlers
    (marketing)/            # wohkah.com public site
    (auth)/                 # login, register, reset, invite acceptance
    w/[slug]/               # company workspace (admin and employee views, gated by permissions)
    admin/                  # Crift Concepts super admin (separate layout, MFA required)
    api/                    # webhooks (payments, jobs), cron, health
  modules/<domain>/         # one folder per business domain
    server/                 # services, queries, server actions (server-only)
    schemas.ts              # zod schemas shared by client and server
    components/             # domain UI
    types.ts
  lib/                      # cross-cutting: supabase clients, auth, tenancy, permissions,
                            # entitlements, audit, money, jobs, notifications, storage
  components/ui/            # shadcn/ui primitives with WOHKAH theme tokens
  proxy.ts                  # host → tenant rewrite, session refresh (Next 16 replacement for middleware.ts)
supabase/
  migrations/               # timestamped SQL, one concern each
  tests/                    # pgTAP RLS and constraint tests
  seed.sql                  # development-only seed data (never run in production)
tests/
  unit/  integration/  e2e/
docs/
  adr/  PHASE_0_AUDIT.md
```

## 6. Existing components that can be reused

There are no project components. What we will reuse instead of building ourselves:

- **shadcn/ui** components (copied into the repo, themed with WOHKAH tokens): Button, Input, Form, Dialog,
  Sheet, DropdownMenu, Table (TanStack Table), Tabs, Toast (Sonner), Calendar, Command, Badge, Avatar,
  Skeleton.
- **Supabase**: Auth, Storage signed URLs, Realtime Broadcast and Presence with private channels
  authorised by RLS.
- **Zod** schemas, shared by forms (`react-hook-form` + `@hookform/resolvers`) and server actions.

## 7. Technical risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **Nigerian statutory payroll rules change.** Personal income tax was reformed by the Nigeria Tax Act 2025 (effective 2026), and pension and NHF rules apply only in some cases. | Wrong payslips and legal exposure | Versioned rules in the database with effective dates (ADR-0004). **No rates in code.** Each run keeps a snapshot of the rule version it used. **Sign-off from a qualified payroll/tax professional before launch.** |
| R-2 | **Cross-tenant data leak** | Fatal for the business | RLS on every table, composite FKs, pgTAP and integration isolation tests in CI, service-role key used only in reviewed server modules, workspace resolved on the server. |
| R-3 | **Over-privileged admins reading private DMs, reviews or salaries** | Privacy breach and NDPA exposure | Conversation-member-only RLS on messages. Salary and bank data in separate tables with explicit permissions. Tests check that owners **cannot** read private DMs. |
| R-4 | **GPS spoofing.** Browsers cannot detect mock-location apps. | Attendance fraud | Validate on the server (haversine distance, accuracy threshold). Flag rather than punish: low accuracy, impossible travel, repeated identical coordinates, IP/ASN mismatch. Manager review queue. Never claim the check is tamper-proof. |
| R-5 | **Browser geolocation limits**: needs HTTPS and permission, gives no background tracking, iOS Safari has quirks | Users can't clock in | Clear error states, a documented manual-exception workflow, and a device test matrix in Phase 4. |
| R-6 | **E-signature legal validity** | Contracts that can't be enforced | Evidence-based signing (consent, authenticated identity plus email OTP, SHA-256 document hash, timestamp, IP/UA, sealed audit certificate). Provider adapter so a qualified provider can be added. **Legal review** before we make claims about it. |
| R-7 | **Variable per-seat billing on Paystack.** Its native plans have fixed amounts. | Wrong charges | WOHKAH runs its own billing engine and invoices, and charges through stored authorisations. Idempotency keys and verified webhooks. **Customers are notified before every charge.** |
| R-8 | **Serverless timeouts** for payroll runs, large reports and bulk email | Partial operations | Long work goes through the job system with chunking and idempotent steps. The UI polls job status. |
| R-9 | **Custom domains**: SSL, cookie scope and a domain claimed by two tenants | Hijack or broken login | Ownership verified by TXT record before activation, a unique index on active domains, the Vercel Domains API for SSL, and a separate auth cookie per custom domain (a short-lived handoff token through `app.wohkah.com`). |
| R-10 | **Wildcard `*.wohkah.com`** needs Vercel nameservers (or a DNS provider that supports the wildcard challenge) | Subdomains won't provision | Decide on the DNS provider before Phase 9. Path-based `/w/[slug]` works from Phase 1 regardless. |
| R-11 | **Data residency and the NDPA 2023.** Supabase has no Nigeria region. | Compliance | Choose the nearest suitable region, document the cross-border transfer basis, DPIA for location data, legal review. |
| R-12 | **No Docker in this container**, so the full local Supabase stack can't run here | Can't run integration tests against real Supabase Auth | Choose one of: (a) a dedicated **Supabase development project** (credentials needed), (b) CI (GitHub Actions has Docker) runs `supabase start` and the full test suite, (c) locally, pgTAP against the Postgres 16 cluster with an `auth` shim for policy tests. **Recommended: (b) + (c), with (a) for manual testing.** |
| R-13 | **TypeScript 7 toolchain maturity** | Build or lint breakage | Check compatibility at Phase 1 and fall back to the latest supported version if needed. |
| R-14 | **Scope size**: 22 modules | Delivery risk | Strict phase gates, entitlement flags, and no work outside the approved scope. Expense Management is excluded. |
| R-15 | **Realtime scale and cost** | Message latency | Use Broadcast from the database (trigger → `realtime.send`) on private channels instead of `postgres_changes`. Paginate history with keyset cursors. |

## 8. Recommended architecture

A modular monolith on Next.js and Supabase. Domain modules have explicit public service interfaces, the
database enforces security through RLS, and a job system handles scheduled and long-running work. See
[`ARCHITECTURE.md`](../ARCHITECTURE.md).

## 9. Phase-by-phase implementation plan

See [`DEVELOPMENT_ROADMAP.md`](../DEVELOPMENT_ROADMAP.md). One adjustment is proposed: **Phase 1 also
creates the entitlements foundation** (the `subscription_plans` and `plan_features` tables with seed
data, a `company_subscriptions` row set to Free on company creation, and the server-side
`assertFeature` / `assertLimit` helpers). Every later module can then be gated correctly from the day
it is built. Payment integration stays in Phase 9.

## 10. Estimated dependencies and external services

| Service | Phase needed | Credentials required | Cost notes |
|---|---|---|---|
| GitHub (repo + Actions) | 1 | — | Free tier is enough at first |
| Supabase (dev, staging, prod projects) | 1 | URL, anon key, service-role key, DB password (per environment) | Pro plan per project for production (backups, PITR as an add-on) |
| Vercel | 1 | Project linked to the repo | Pro needed for commercial use, wildcard domains and cron |
| Resend (email) | 1 (auth email via Supabase SMTP), 3 (invites) | API key, verified sending domain | Free tier for development |
| Sentry | 1 | DSN, auth token (source maps) | Free or Team tier |
| Paystack | 9 | Secret key, public key, webhook secret (test and live) | Per-transaction fees |
| Vercel Domains API | 9 | API token, team ID | Included |
| DNS for `wohkah.com` | 1 (app), 9 (wildcard) | Registrar access | — |
| Termii / WhatsApp Cloud API | 10 (optional) | API keys, WhatsApp Business verification | Pay per message |
| External e-signature provider | Optional, after launch | API keys | Per envelope |
| **Human expertise** | | | |
| Nigerian payroll/tax professional | 5 (before launch) | — | Required by the master prompt |
| Legal counsel (NDPA, e-signature, terms, DPA) | 3, 11 | — | Required before launch |

---

## Decisions requiring approval before Phase 1

1. ✅ **Decided 2026-11-10:** Paystack for payments (Flutterwave as the alternative), Resend for email,
   Sentry for error monitoring, Supabase Postgres for rate limiting, and Supabase Cron + Queues for
   background jobs. Upstash and Inngest are not used.
2. **Approve URL-based workspace routing** (`app.wohkah.com/w/[slug]`, with `slug.wohkah.com` and custom
   domains rewritten onto it), as in ADR-0003.
3. **Approve moving the entitlements foundation into Phase 1** (§9 above).
4. **Testing environment** (R-12): provide a Supabase development project, or approve CI-based
   integration testing.
5. **Billing rules to confirm** (needed by Phase 9, but they shape the data model now):
   - For **annual** plans, are additional employees billed monthly in arrears at ₦1,000, or annually?
   - Does a **Free** company with more than 3 active employees pay ₦1,000 per extra employee, or must it
     upgrade? The prompt says all plans, so this means Free companies need a payment method on file.
   - Is the extra-employee count measured as the **peak** active count in the period (recommended,
     because it's simple and fair) or as a prorated daily average?
   - Are prices **VAT-inclusive or VAT-exclusive** (Nigerian VAT applies to SaaS)?
6. **Hosting region** for Supabase and Vercel (R-11).
