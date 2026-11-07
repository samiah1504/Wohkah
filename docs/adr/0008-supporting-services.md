# ADR-0008: Supporting services

**Status:** Proposed (needs approval). **Date:** 2026-11-07

| Need | Choice | Why | Fallback |
|---|---|---|---|
| Transactional email | **Resend** + React Email | Simple API, React templates in WOHKAH branding, also usable as Supabase Auth SMTP | Postmark |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`) | Works on serverless and at the edge, cheap | Postgres counter table |
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
