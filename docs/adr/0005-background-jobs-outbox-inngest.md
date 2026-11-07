# ADR-0005: Background jobs with a transactional outbox and Inngest

**Status:** Proposed (needs approval). **Date:** 2026-11-07

## Context
Reminders, accruals, contract expiry, payroll calculation, report exports, billing cycles and
notifications must run even when nobody has the app open. They must survive restarts, retry on failure
and avoid duplicates. Vercel functions are short-lived.

## Decision
- **Transactional outbox:** business writes insert into `outbox_events` in the same database transaction.
  A dispatcher (triggered right after commit, with a cron sweep as a backstop) publishes pending events to
  Inngest and marks them sent. No event is lost if a request crashes.
- **Inngest** is the durable executor. It provides retries with backoff, step memoisation (idempotent
  multi-step jobs), cron schedules, per-company concurrency limits and a failure dashboard with replay.
- Our `jobs` table tracks user-visible job status and progress (payroll calculation, exports).
- Every handler is idempotent and keyed by event ID.
- Job code goes through `lib/jobs`, so the executor can be swapped.

## Consequences
- One additional managed vendor (with a free tier for development).
- Clear retry and replay semantics, which meet Phase 10's acceptance criteria.

## Alternatives considered
- **Supabase `pg_cron` + `pgmq` + a Vercel worker route:** no new vendor, but we would build retry,
  backoff, visibility and fan-out ourselves. This is a reasonable fallback if a new vendor is unwanted.
- **Vercel Cron alone:** no retries, queues or durability. Not enough.
