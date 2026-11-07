# WOHKAH

**Your staff, well managed.**
*Everything your team needs to work better, together.*

WOHKAH is a multi-tenant workforce management and team collaboration SaaS platform for small and growing
businesses. It covers HR, onboarding, contracts, GPS attendance, payroll, leave, tasks, messaging,
meetings, documents, performance and more.

A product of **Crift Concepts**.

---

## Status

**Phase 0: architecture and audit complete, waiting for approval.** No application code exists yet.

| Document | Purpose |
|---|---|
| [docs/PHASE_0_AUDIT.md](docs/PHASE_0_AUDIT.md) | Repository audit, risks, external services, **decisions requiring approval** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, module layout, tenancy, jobs, realtime, branding |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database conventions, RLS helpers, Phase 1 schema, later-phase inventory |
| [SECURITY.md](SECURITY.md) | Threat model, authorisation layers, tenant isolation tests, NDPA 2023 |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Phases 0–11 with acceptance criteria |
| [docs/adr/](docs/adr/README.md) | Architecture decision records |
| [CHANGELOG.md](CHANGELOG.md) | Change history |

## Proposed stack

Next.js 16 (App Router) · React 19 · strict TypeScript · Tailwind CSS v4 · shadcn/ui · Radix · Lucide ·
Supabase (Postgres + RLS, Auth, Storage, Realtime) · Vercel · Inngest (jobs) · Paystack (payments) ·
Resend (email) · Sentry · Vitest · Playwright · pgTAP.

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

Setup instructions will be added in Phase 1, when the application is scaffolded. `.env.example` lists the
planned configuration variables. Never commit real credentials.
