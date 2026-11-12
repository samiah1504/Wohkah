# WOHKAH — Deployment and Environments

Status: **Phase 1.** Local development and CI are fully defined. Staging and production are
documented here as setup steps; they are created near launch (Phase 11).

## 1. Environments

| Environment | App | Database | Data |
|---|---|---|---|
| **CI** | `next start` inside GitHub Actions | Throwaway local Supabase (`supabase start`) created and destroyed per run | Test data only |
| **Development project** | Vercel Preview deployments | Supabase project `wohkah-dev` (free tier) | Fake demo data only. **Never real data** |
| **Production** | Vercel Production (`main`) | Supabase project `wohkah-prod` (Pro) | Real customers |

The projects share nothing. Each has its own URL, keys, users and storage.

## 2. Configuration

Copy `.env.example` to `.env.local`. Only `NEXT_PUBLIC_*` values reach the browser.

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | **server only** | Or the legacy `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS; only allow-listed modules may use it |
| `NEXT_PUBLIC_APP_URL` | browser + server | Public base URL, used in email links |
| `APP_ROOT_DOMAIN` | server | e.g. `wohkah.com` (subdomain routing arrives in Phase 9) |
| `RESEND_API_KEY`, `EMAIL_FROM` | server | Optional. Without them, invitations show a copyable link instead of emailing |
| `NEXT_PUBLIC_CONTACT_EMAIL` | server (build) | Optional. Public contact address shown on `/contact`; without it the page says the inbox is being set up |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | — | Reserved; Sentry is wired up before launch |
| `JOBS_WORKER_SECRET` | server | Reserved for the job worker (Phase 3) |

In Vercel, set **Preview** variables to the development project and **Production** variables to the
production project. Never put real keys in the repository, in chat, or in issue trackers.

## 3. Local development

```bash
pnpm install
pnpm dev                 # needs .env.local pointing at a Supabase project or a local stack
pnpm typecheck && pnpm lint && pnpm test
```

**Database tests without Docker** (plain PostgreSQL 16+, used in the development container):

```bash
pnpm db:local:reset      # creates database wohkah_test: Supabase auth shim + all migrations
pnpm test:db             # RLS, tenant isolation, escalation, plan limits, audit
pnpm db:types            # regenerate src/lib/supabase/database.types.ts after a migration
```

**With Docker** (full stack, same as CI):

```bash
pnpm exec supabase start
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm test:db
pnpm build && pnpm test:e2e
```

## 4. Continuous integration (`.github/workflows/ci.yml`)

| Job | Runs on | What it proves |
|---|---|---|
| `checks` | every push | Typecheck, lint, formatting, unit tests, production build |
| `database` | every push | All database security tests against real Supabase Postgres, with migrations applied from scratch; generated types match the schema |
| `e2e` | pull requests, `main`, manual run | The full Playwright suite against the real app and a full local Supabase stack (Auth, PostgREST, Mailpit) |

Runs on Linux only to stay within GitHub's free minutes. A newer push cancels the older run on the
same branch. If the free minutes run out, GitHub pauses Actions until the next month; it does not
bill on the free plan with a $0 spending limit.

**Production gate (added in Phase 11):** a `deploy` job that `needs` all three jobs, applies
migrations to production (`supabase db push`) and deploys to Vercel. Vercel's automatic production
deployment is switched off, so failed tests can never reach production. Optionally, GitHub branch
protection on `main` (paid plan for private repositories) also blocks merging failing changes.

## 5. Setting up the development project (one time, about 30 minutes)

1. Create a Supabase project named `wohkah-dev` (free tier). Choose the region agreed for
   production (see Phase 0 decision on hosting region).
2. Apply migrations: `pnpm exec supabase link --project-ref <ref>` then
   `pnpm exec supabase db push`.
3. **Auth settings** (Dashboard → Authentication):
   - Site URL: the Vercel preview URL or `http://localhost:3000`.
   - Redirect URLs: add `https://*-<team>.vercel.app/**` and `http://localhost:3000/**`.
   - Email confirmations: **on**. Secure password change: **on**. Minimum password length 10,
     with lowercase, uppercase and digits. Enable leaked-password protection if available.
   - MFA: enable TOTP.
   - Email templates (recommended): make links use the token hash so they work in any browser, e.g.
     confirm sign-up: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding`,
     reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
     The default templates also work (PKCE), but only in the browser that started the flow.
   - Custom SMTP: use Resend so auth emails come from your domain.
4. Add the project's URL, publishable key and secret key to Vercel's **Preview** environment.

## 6. Production checklist (Phase 11)

- [ ] Supabase Pro project, point-in-time recovery, region decision documented (NDPA transfer basis).
- [ ] Same Auth settings as above; stricter rate limits than local `config.toml`.
- [ ] Verified sending domain in Resend; SPF, DKIM and DMARC records.
- [ ] Sentry DSN configured; PII scrubbing on.
- [ ] Vercel Production env vars; automatic production deployments off; `deploy` job enabled.
- [ ] First platform administrator created by migration or SQL (never through the app).
- [ ] Backup restore drill completed; runbooks written.
