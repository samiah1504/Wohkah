# WOHKAH

**Your staff, well managed.**
*Everything your team needs to work better, together.*

WOHKAH is a multi-tenant workforce management and team collaboration SaaS platform for small and growing
businesses. It covers HR, onboarding, contracts, GPS attendance, payroll, leave, tasks, messaging,
meetings, documents, performance and more.

A product of **Crift Concepts**.

---

## Status

**Phase 1: foundation and multi-tenancy.** Accounts, sign-in with optional two-step verification,
company workspaces, departments, branches, holidays, members, invitations, roles and permissions,
plan entitlements and the audit log. See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).

| Document | Purpose |
|---|---|
| [docs/PHASE_0_AUDIT.md](docs/PHASE_0_AUDIT.md) | Repository audit, risks, external services, **decisions requiring approval** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, module layout, tenancy, jobs, realtime, branding |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database conventions, RLS helpers, Phase 1 schema, later-phase inventory |
| [SECURITY.md](SECURITY.md) | Threat model, authorisation layers, tenant isolation tests, NDPA 2023 |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Phases 0–11 with acceptance criteria |
| [docs/adr/](docs/adr/README.md) | Architecture decision records |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environments, configuration, CI, setting up Supabase |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Server Actions, route handlers and database RPCs |
| [CHANGELOG.md](CHANGELOG.md) | Change history |

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · strict TypeScript 5.9 · Tailwind CSS v4 ·
shadcn-style UI on Radix · Lucide · zod ·
Supabase (Postgres + RLS, Auth, Storage, Realtime, Cron, Queues) · Vercel · Paystack (payments) ·
Resend (email) · Sentry · Vitest (unit and database security tests) · Playwright.

## Brand

| Colour | HEX | Role |
|---|---|---|
| Deep Yellow | `#D69E00` | Primary |
| Dark Walnut | `#2B1D18` | Signature dark |
| Deep Charcoal | `#292929` | Supporting neutral |
| Warm Ivory | `#FAF8F2` | App background |
| Warm Sand | `#F4E8CF` | Secondary background |
| Walnut Taupe | `#78665B` | Supporting |
| Deep Espresso | `#42332B` | Dark surfaces |

Headings use Manrope. Body text, forms, tables and buttons use Inter.

## Getting started

Requirements: Node.js 22+, pnpm 10, and either a Supabase project or Docker for a local stack.

```bash
pnpm install
cp .env.example .env.local      # fill in Supabase URL and keys (never commit real values)
pnpm dev                        # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm check` | Typecheck, lint and unit tests |
| `pnpm db:local:reset && pnpm test:db` | Database security tests on plain PostgreSQL (no Docker) |
| `pnpm exec supabase start` | Full local Supabase stack (Docker) |
| `pnpm test:e2e` | End-to-end tests (needs the local stack and a build) |
| `pnpm db:types` | Regenerate database types after a migration |

Full details: [DEPLOYMENT.md](DEPLOYMENT.md).

## Project layout

```
src/app/            routes (thin): marketing, auth, signed-in pages, /w/[slug] workspaces
src/modules/        business domains: identity, workspace, access (more per phase)
src/lib/            cross-cutting: supabase clients, tenancy, permissions, entitlements, rate limits
src/components/     UI primitives and the app shell
supabase/           migrations, config, seed
tests/              unit, db (RLS and isolation), e2e (Playwright)
```
