# ADR-0005: Background jobs with a transactional outbox, Supabase Cron and Supabase Queues

**Status:** Accepted. **Date:** 2026-11-10 (it replaces the earlier Inngest proposal)

## Context
Reminders, accruals, contract expiry, payroll calculation, report exports, billing cycles and
notifications must run even when nobody has the app open. They must survive restarts, retry on failure
and avoid duplicates. Vercel functions are short-lived. The product owner chose to avoid an extra job
vendor and use Supabase's built-in tools.

## Decision
- **Transactional outbox:** business writes insert an event into `outbox_events` *in the same database
  transaction* (for example `leave.approved` or `employee.hired`). No event is lost if a request
  crashes.
- **Supabase Queues (`pgmq`)** hold the work. A trigger on `outbox_events` (or the writing RPC) sends a
  message to the right queue in the same transaction. Messages stay in Postgres, so they survive restarts.
- **Supabase Cron (`pg_cron`)** does two jobs:
  1. **Schedules** recurring work (contract expiry, onboarding reminders, leave accrual, daily
     billable-employee counts, billing cycles) by putting messages on queues.
  2. **Wakes the worker** every minute by calling `POST /api/jobs/worker` on our Next.js app through
     `pg_net`, authenticated with a shared secret (`JOBS_WORKER_SECRET`).
- **The worker** (a Next.js route handler, server-only) reads a batch with a **visibility timeout**, runs
  each handler, and deletes the message on success. On failure the message becomes visible again after an
  increasing delay. After **N attempts** (configurable, default 5) it moves to a **dead-letter queue** and
  shows up in the Super Admin health view, where it can be retried manually.
- **Every handler is idempotent**, keyed by event ID, so a retry or duplicate delivery never sends two
  emails or charges twice.
- **Long work** (payroll calculation, large exports) is split into chunks. Each chunk is its own message, so
  no single request exceeds Vercel's time limit. A `jobs` table tracks user-visible status and progress.
- All job code goes through `lib/jobs` (`enqueue()`, `defineHandler()`), so the executor could be swapped
  later without touching business modules.

## Consequences
- No extra vendor or bill. Everything stays inside Supabase and Vercel.
- We build and test retry, backoff, dead-lettering and monitoring ourselves. This is more code than a
  managed service, but it's small and well understood.
- The worker's polling interval (1 minute) sets the minimum latency for scheduled work. Urgent actions
  (sending an invitation email right after a click) run directly in the request, with the queue as a
  retry fallback.
- Phase 10's acceptance criteria (jobs survive restarts, failed jobs can be retried, no duplicates) are
  covered by tests against this design.

## Alternatives considered
- **Inngest:** managed retries and dashboards, but an extra vendor. Rejected by the product owner.
- **Trigger.dev:** similar trade-off to Inngest.
- **Vercel Cron alone:** no queue, retries or durability. Not enough.
