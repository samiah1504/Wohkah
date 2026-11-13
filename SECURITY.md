# WOHKAH — Security Architecture

Status: **Proposed (Phase 0)**. Each phase adds verified controls to this document.

## 0. Implemented and tested in Phase 1

| Control | Where | Proven by |
|---|---|---|
| RLS on every table; anon reads only the pricing catalogue | migration 5 | `tests/db/rls-coverage.test.ts` (catalog checks cover future tables automatically) |
| Company A can't read or change Company B data in any tenant table | RLS + column grants | `tests/db/tenant-isolation.test.ts` (iterates every table with `company_id`), `tests/e2e/tenancy.spec.ts` |
| Cross-tenant references impossible | composite foreign keys | `tenant-isolation.test.ts` |
| Browser-supplied company ids ignored | `TenantContext` from URL slug + session; `company_id` not updatable | `tenant-isolation.test.ts`, e2e |
| Multi-company users act only in the selected workspace | per-workspace permissions, URL-scoped context | `tenant-isolation.test.ts` §5, e2e workspace switch |
| No privilege escalation (roles, permissions, Owner) | triggers + `app.can_grant_role` | `tests/db/access-control.test.ts` |
| At least one active owner; owners managed only by owners | deferred constraint triggers | `access-control.test.ts` |
| Plan limits enforced in the database | triggers + RLS (`admins`, `branches`, `custom_roles`) | `access-control.test.ts`, `tests/e2e/workspace.spec.ts` |
| Append-only audit log of administrative changes | generic audit trigger; UPDATE/DELETE blocked for every role | `tests/db/workspace-and-audit.test.ts` |
| Invitations: 256-bit tokens, stored hashed, single use, email-bound, 7-day expiry | `company_invitations`, `accept_invitation` | `workspace-and-audit.test.ts`, e2e |
| Platform admin access requires an aal2 (MFA) session | `app.is_platform_admin` | `workspace-and-audit.test.ts` |
| Rate limits (login, sign-up, reset, MFA, invitations, workspace creation); fail closed | `rate_limit_hit` + `src/lib/rate-limit` | `workspace-and-audit.test.ts` |
| No account enumeration on login, sign-up or reset | identity actions | `tests/e2e/auth.spec.ts` |
| Open-redirect protection on `next` | `safeNextPath` | unit tests |
| Service-role client restricted to allow-listed modules | ESLint `no-restricted-imports` | `pnpm lint` in CI |
| Session cookies never cached by CDNs | proxy sets `Cache-Control: private, no-store` | — |
| Baseline security headers (HSTS, no framing, nosniff, referrer, permissions) | `next.config.ts` | — |

**Not yet in place (planned):** nonce-based Content-Security-Policy and Sentry (before launch),
storage policies (Phase 2, with the first file uploads), support-access approval flow (Phase 11),
data-subject request workflow (Phase 7), breach runbook (Phase 11).

### Subscriptions and payments (2026-11-13)

- Staff, work-location and branch allowances are enforced by database triggers; the UI
  only explains them. Plan-suspended staff fail `app.is_member()` (when that is their only role), so
  they lose workspace access without their records changing.
- Trial eligibility (one per workspace, one per owner every 12 months) is checked in `start_trial()`.
- Checkout prices come from `subscription_quote()` in the database, never from the browser.
- Paid entitlements change only in `apply_verified_payment()`, executable by `service_role` only and
  called after the transaction is verified with Paystack's API (webhook or callback). Amount and
  currency must match the invoice; repeat calls are idempotent. There is no simulated payment path in
  the app; tests use a clearly separated service-role fixture.
- Webhooks: HMAC-SHA512 over the raw body with `timingSafeEqual`, stored once per event id.
- `PAYSTACK_SECRET_KEY` is server-only (`src/lib/payments` is `server-only` and on the service-role
  allow-list). Live keys are refused unless `PAYSTACK_LIVE_APPROVED=true`.

## 1. Threat model (top concerns)

| Threat | Control |
|---|---|
| Tenant A reads or modifies tenant B data | RLS on every table, composite FKs, workspace resolved on the server, isolation test suite in CI |
| Forged `company_id` / IDs in requests | Request-body `company_id` is ignored. RLS checks every row. IDOR tests in the integration suite |
| Over-privileged insiders (owner reads DMs, salaries) | Least-privilege permission keys, sensitive tables separated, conversation-member-only messaging |
| Service-role key misuse or exposure | Server-only module, import allow-list lint rule, never a `NEXT_PUBLIC_*` variable, each use audited, keys rotated |
| Platform staff overreach | Separate `platform_admins` table, MFA (aal2), time-limited support grants approved by the company, full audit |
| Account takeover | Supabase Auth, leaked-password protection, rate-limited login and reset, optional TOTP MFA (required for owners on paid plans if approved, always for platform admins) |
| Payment fraud / replayed webhooks | HMAC-SHA512 signature verification, event-ID deduplication, amount and currency re-verified against the provider API before state changes |
| Malicious uploads | MIME sniffing, extension allow-list, size limits, private buckets, signed URLs, no inline HTML/SVG rendering of user files |
| GPS spoofing | Server-side validation and anomaly flags. Records are flagged, never auto-punished |
| Domain takeover | DNS TXT ownership verification, unique active hostname, periodic re-verification, automatic deactivation on DNS drift |
| XSS / CSRF | React escaping, strict CSP with nonces, Server Actions' origin checks, `SameSite=Lax` httpOnly cookies |

## 2. Authentication

- Supabase Auth (email and password, invitation links, password reset, optional TOTP MFA).
- Session cookies via `@supabase/ssr`, refreshed in `proxy.ts`. Server code calls `auth.getUser()`, which
  validates with the Auth server, and never trusts an unverified session.
- Platform admin routes require `aal2`. A sensitive step-up (approving payroll, changing bank details)
  can require re-authentication or MFA.
- Custom domains: authentication goes through a one-time, short-lived handoff token issued by
  `app.wohkah.com` and exchanged for a session on the custom domain. Cookies are never set on a domain we
  don't control.

## 3. Authorisation layers

1. **Proxy:** session refresh and host-to-tenant rewrite only. *Not* an authorisation layer.
2. **Tenant resolution:** membership check, otherwise 404.
3. **Service layer:** `require(ctx, permission)` and `assertFeature(ctx, feature)` give clear errors.
4. **RLS:** the authoritative check on every row, independent of layers 1–3.
5. **Storage RLS:** object path prefix `company_id/` plus a permission check.
6. **Realtime RLS:** private channels authorised against conversation membership.

## 4. Tenant isolation test suite (required by the master prompt, Phase 1+)

These run in CI on every push (`tests/db`, Vitest + `pg`, executing as the `authenticated` role with
real JWT claims exactly as PostgREST does) and in the end-to-end suite (`tests/e2e`). Items 3 and 4
arrive with Phase 2, when employee records and file storage exist:

1. Company A user cannot SELECT any Company B row in any tenant table. The test iterates over **every
   table with a `company_id` column**, so new tables are covered automatically.
2. Company A user cannot INSERT, UPDATE or DELETE Company B rows, including by spoofing `company_id` in
   the payload.
3. Company A user cannot list, download or sign URLs for Company B storage objects.
4. An employee cannot read another employee's personal, bank, tax, compensation or document records
   without a scoped permission.
5. A user who belongs to A and B, working in workspace A, receives only A data from every service
   function.
6. Changing IDs in API and Server Action calls (company, employee, document, conversation) never bypasses
   access control.
7. A company owner cannot read a private conversation they are not a member of.
8. A new table without RLS fails CI (a catalog check over `pg_class.relrowsecurity`).

## 5. Data protection: Nigeria Data Protection Act 2023 / NDPC

Must be reviewed by qualified counsel before launch. The engineering commitments:

- **Roles:** the customer company is the *controller* of employee data and WOHKAH (Crift Concepts) is the
  *processor*. We provide a Data Processing Agreement.
- **Lawful basis:** customers record theirs (employment contract, legal obligation for payroll, legitimate
  interest for attendance). WOHKAH supplies notice templates.
- **Data minimisation:** gender is optional and collected only where required by law. Location is
  collected **only at attendance events**. There is no continuous or background tracking.
- **Location privacy notice:** shown before the first clock-in, its acknowledgement recorded, and the
  rules visible to the employee at any time.
- **Data subject rights:** self-service profile access and correction, export of own data, and a request
  workflow for correction or erasure (subject to statutory retention).
- **Retention:** configurable per data class. Defaults are proposed in the retention schedule (Phase 7)
  and legally reviewed. Payroll and contract records are retained for the statutory period. Attendance GPS
  coordinates can be minimised after a configurable period while keeping the validation outcome.
- **Cross-border transfer:** the hosting region and transfer safeguards are documented (Supabase has no
  Nigeria region).
- **Breach response:** an incident runbook (Phase 11) with NDPC notification within the statutory window
  and notification of affected customers.
- **DPIA** for employee location data before Phase 4 ships.

## 6. Secrets management

- `.env.example` contains names only. Real values never enter git (`.gitignore` covers `.env*` except
  the example).
- Browser-visible variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`. **Nothing else.**
- The service-role key, Paystack secret, jobs worker secret, Resend key and Vercel token are server-only
  and differ for each environment.
- The jobs worker route (`/api/jobs/worker`) accepts only requests carrying `JOBS_WORKER_SECRET`
  (compared in constant time). Supabase Cron reads the secret from Supabase Vault, never from a
  migration file.
- Rate limits (Postgres-backed) cover login, sign-up, password reset, invitation sends, OTP
  verification and public endpoints.
- Secret scanning runs in CI.

## 7. Operational security (Phase 11)

Database backups and PITR, restore drills, dependency scanning, an audit-log review dashboard, alerting
for unusual access patterns (bulk exports, repeated permission denials), and a key-rotation runbook.
