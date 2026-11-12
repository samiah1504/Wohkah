# Changelog

All notable changes to WOHKAH are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Public website and product language (2026-11-12)

#### Added
- `PRODUCT_LANGUAGE_AND_POSITIONING.md`: mandatory audience, positioning and wording rules for every
  screen, email and page; referenced from AGENTS.md, CLAUDE.md, README, ARCHITECTURE and the roadmap.
- Shared customer wording in `src/lib/copy/` (role names, navigation labels, plan feature labels,
  feature release status) and public pricing in `src/lib/plans.ts`, both checked against the database.
- Redesigned public website: navigation, hero, product preview (labelled sample data), problems and
  solution, features with "Coming soon" labels, who it's for, how it works, benefits, pricing with
  monthly/yearly switch and extra-staff example, FAQs, final call to action, footer.
- About, Contact, Privacy (draft) and Terms (draft) pages.
- SEO: page titles and descriptions, Open Graph sharing image, sitemap, robots rules, structured data.
- Tests: website end-to-end tests, a language-policy test on rendered pages, plan maths unit tests.

#### Changed
- Customer-facing wording across the app: "Staff Manager" and "Staff Member" roles (migration
  `20261112000100`), "Team Access" instead of "People", "staff portal", "staff" instead of
  "employees", plan feature labels.

### Phase 1: Foundation and multi-tenancy (2026-11-10)

#### Added
- Next.js 16 app with the WOHKAH brand theme, app shell (desktop sidebar, mobile bottom navigation)
  and marketing page.
- Authentication: registration with email confirmation, login, logout, password reset and change,
  optional TOTP two-step verification, sign-in history, rate limiting.
- Multi-tenancy: company workspaces, membership across several companies, URL-based workspace
  switching, server-resolved tenant context.
- Workspace settings: company profile and working calendar, departments, branches, holidays, plan
  overview, audit log viewer.
- People and access: invitations (email or copyable link), acceptance, suspension and removal,
  six default roles, role assignment, permission matrix, custom roles (Growth and above).
- Database: 8 migrations, RLS on every table, composite foreign keys, escalation guards, owner rule,
  data-driven plan entitlements and limits, append-only audit log, rate-limit store.
- Tests: 58 database security tests, 10 unit tests, 10 end-to-end tests; GitHub Actions CI.
- DEPLOYMENT.md, API_DOCUMENTATION.md, docs/PHASE_1_REPORT.md.

#### Fixed (found by end-to-end testing)
- Sign-out from the account menu.
- Neutral "Page not found" page for workspaces a user can't access.
- Missing confirmation when saving the last branch a plan allows.
- Prefetch renders no longer start session-bound Supabase work.

### Phase 0

### Added
- Phase 0 project audit (`docs/PHASE_0_AUDIT.md`).
- Architecture, database, security and roadmap documents.
- Architecture decision records ADR-0001 to ADR-0008.
- Draft `.env.example` (variable names only) and `.gitignore`.

### Changed
- Service decisions confirmed: Paystack (Flutterwave as the alternative), Resend, Sentry.
- ADR-0005 rewritten: background jobs use Supabase Cron + Supabase Queues instead of Inngest.
- ADR-0008: rate limiting uses a Supabase Postgres table instead of Upstash.
