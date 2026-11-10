# WOHKAH — Security Architecture

Status: **Proposed (Phase 0)**. Each phase adds verified controls to this document.

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

These run in CI on every PR, as pgTAP (`supabase/tests`) and Vitest integration tests using real user
JWTs:

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
