# WOHKAH — Phase 1 Report: Foundation and Multi-Tenancy

| | |
|---|---|
| Date | 2026-11-10 |
| Branch | `claude/wohkah-architecture-audit-fjcmga` |
| Verified commit | `a4112ab` (CI run 42870634311: all jobs green) |
| Status | **Acceptance criteria met.** Follow-ups listed in §8. |

## 1. Phase completed
Phase 1: foundation and multi-tenancy, including the entitlements foundation approved in Phase 0.

## 2. Features implemented

| Area | Status | Notes |
|---|---|---|
| Registration, email confirmation, login, logout | ✅ Completed | E2E-tested |
| Forgot / reset password, change password | ✅ Completed | E2E-tested |
| Optional TOTP two-step verification | 🟡 Partially completed | Built (enrol, challenge at login, disable). Not yet covered by an automated test |
| Sign-in history (own) | ✅ Completed | |
| Company creation (owner, six roles, Free plan) | ✅ Completed | One transaction (`create_company`) |
| Company membership, multiple companies per user | ✅ Completed | E2E-tested |
| Workspace switching | ✅ Completed | URL-based (`/w/[slug]`); E2E-tested |
| Company profile, working days and hours, timezone, currency, address | ✅ Completed | |
| Company logo | ⬜ Not started | Needs secure file storage (Phase 2) |
| Departments (hierarchy, archive) | ✅ Completed | |
| Branches (head office, archive, plan limit) | ✅ Completed | |
| Holiday calendar | ✅ Completed | |
| Members: invite, accept, suspend, reactivate, remove | ✅ Completed | Invitation email via Resend, or a copyable link when email isn't configured |
| Roles: six defaults, assignment, permission matrix | ✅ Completed | |
| Custom roles and role permissions | ✅ Completed | Growth plan and above |
| Department- or branch-scoped roles | 🟡 Partially completed | Supported and enforced by the database; the UI assigns company-wide roles only |
| Plans, features, limits (data-driven) | ✅ Completed | Admins, branches and custom roles enforced in the database |
| Audit log (append-only) and viewer | ✅ Completed | |
| Rate limiting (Supabase-backed) | ✅ Completed | Fails closed |
| App shell: desktop sidebar, mobile bottom nav | ✅ Completed | Unbuilt modules hidden |
| Marketing page, auth pages with "A product of Crift Concepts" | ✅ Completed | |
| Sentry error monitoring | ⬜ Not started | Needs a Sentry DSN; planned before launch |
| Subdomains (`company.wohkah.com`) | ⬜ Not started | Deferred to Phase 9 with custom domains (as planned) |

## 3. Files and modules created
- `src/modules/identity`, `src/modules/workspace` and `src/modules/access`, each with schemas, Server Actions, queries and components.
- `src/lib`: Supabase clients, tenancy, permissions, entitlements, rate limiting, audit events, email, errors, dates and forms.
- `src/components`: UI primitives and the app shell.
- `src/proxy.ts`; routes under `src/app` for marketing, auth, signed-in pages, `/invite/[token]` and `/w/[slug]/**`.
- Tests: `tests/unit`, `tests/db` (security) and `tests/e2e` (Playwright).
- CI: `.github/workflows/ci.yml`.
- Documentation: `DEPLOYMENT.md` and `API_DOCUMENTATION.md`, plus updates to the README, architecture, database, security and ADR documents.

## 4. Database tables and migrations
Eight migrations (listed in `DATABASE_SCHEMA.md`). 22 tables:
- **Identity and tenancy:** `profiles`, `companies`, `company_members`, `company_invitations`
- **Organisation:** `departments`, `branches`, `public_holidays`
- **Access:** `permissions`, `role_templates`, `roles`, `role_permissions`, `member_roles`
- **Plans:** `features`, `subscription_plans`, `plan_features`, `company_subscriptions`, `company_feature_overrides`
- **Platform:** `platform_admins`, `support_access_grants`
- **Logs:** `audit_logs`, `login_events`, `access_events`
- **Rate limiting:** `rate_limit_buckets`

## 5. Security measures implemented
See `SECURITY.md` §0, which maps each control to the test that proves it. Highlights:
- RLS and explicit column grants on every table.
- Composite foreign keys, so no record can point at another company's data.
- The workspace is resolved on the server; company ids sent by the browser are ignored.
- Privilege escalation is blocked in the database.
- Every company keeps at least one owner.
- Plan limits are enforced by the database.
- The audit log is append-only.
- Invitation tokens are hashed and single use.
- Platform admins need two-step verification.
- Rate limits; no account enumeration; open-redirect protection.
- The service-role key is restricted by a lint rule.
- Baseline security headers.

## 6. Tests performed

| Suite | Where it runs | Result |
|---|---|---|
| Typecheck, lint, formatting, production build | Locally and CI | ✅ Pass |
| Unit tests | Locally and CI | ✅ 10/10 |
| Database security tests | Local PostgreSQL 16 with auth shim, **and** real Supabase Postgres in CI | ✅ 58/58 in both |
| Sabotage check (an RLS policy deliberately broken) | Locally | ✅ The isolation test caught it and named the leaking table |
| End-to-end on a full Supabase stack | CI | ✅ 10/10, no retries |

## 7. Test results and issues found by testing
The first end-to-end runs found three real defects, all now fixed:
1. Sign-out from the account menu did nothing.
2. People without access to a workspace saw a generic 404 page instead of WOHKAH's own page.
3. Saving the last branch your plan allows showed no confirmation.

They also surfaced background prefetch errors from the Supabase client. Those are fixed and the
server log is now clean.

## 8. Outstanding issues and follow-ups
- Not yet tried by a person on a hosted Supabase project. The development project is waiting on setup (`DEPLOYMENT.md` §5).
- No automated test yet for two-step verification. Resend email sending is untested with a real key.
- Company logo upload (Phase 2, with storage policies).
- A UI for department- and branch-scoped roles (Phase 2, when managers and employees exist).
- Sentry, nonce-based Content-Security-Policy, legal pages (Terms and Privacy are referenced on the sign-up page but don't exist yet), all before launch.
- The `branches`, `admins`, storage and other limits for paid plans are proposals stored as data. Please confirm them.
- Billing questions from Phase 0 (annual extras, the Free plan above 3 employees, VAT) are still open, for Phase 9.

## 9. External integrations still requiring credentials

| Service | Needed for | Status |
|---|---|---|
| Supabase development project | Manual testing and Vercel previews | Waiting on you |
| Vercel project | Preview deployments | Waiting on you |
| Resend | Invitation and auth emails from your domain | Optional now; the app shows copyable links without it |
| Sentry | Error monitoring | Before launch |
| Paystack | Billing | Phase 9 |

## 10. Recommended next phase
**Phase 2: Employee management.** It covers:
- employee records with separately protected personal, bank, tax and pay data;
- positions and reporting lines;
- the employee status lifecycle and history;
- search, filters and export;
- employee document storage, including the storage security rules and the Phase 0 isolation tests 3 and 4;
- scoped manager access.
