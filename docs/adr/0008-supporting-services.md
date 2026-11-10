# ADR-0008: Supporting services

**Status:** Accepted. **Date:** 2026-11-07, accepted 2026-11-10

| Need | Choice | Why | Fallback |
|---|---|---|---|
| Transactional email | **Resend** + React Email | Simple API, React templates in WOHKAH branding, also usable as Supabase Auth SMTP | Postmark |
| Rate limiting | **Supabase Postgres** (`rate_limit_buckets` table + `app.rate_limit_hit()` function) | No extra vendor. One atomic SQL call per check, shared across all serverless instances. Expired buckets are cleaned up by Supabase Cron | Vercel Firewall rate-limit rules for edge protection |
| Error monitoring | **Sentry** (`@sentry/nextjs`) | Server and client errors, traces, release tracking. PII scrubbing on | Vercel logs only |
| PDF generation | `@react-pdf/renderer` | Serverless-friendly, no headless browser | Chromium in a job worker |
| DOCX contract templates | `docxtemplater` | Merge fields into uploaded DOCX templates | HTML templates only |
| Excel export | `exceljs` | Streaming writer for large reports | CSV only |
| Forms | `react-hook-form` + zod resolver | Same zod schemas on client and server | — |
| Tables | TanStack Table (through shadcn data table) | Server-side pagination, sorting and filtering | — |
| Dates | `date-fns` + `date-fns-tz` | Company-timezone business logic | — |
| SMS (optional, Phase 10) | Termii | Nigerian delivery and DND handling | Twilio |
| WhatsApp (optional, Phase 10) | Meta WhatsApp Cloud API | Official API, template messages | — |

Each integration sits behind an interface in `lib/` or `modules/notifications`. If its credentials are
missing, the UI shows "requires configuration" and never simulates success.

Any new dependency outside this list needs a short justification in the PR description.
