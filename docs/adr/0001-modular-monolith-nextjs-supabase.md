# ADR-0001: Modular monolith on Next.js and Supabase

**Status:** Proposed. **Date:** 2026-11-07

## Context
The repository is empty (Phase 0 audit). WOHKAH needs about 22 business domains, strict tenant isolation,
realtime messaging and a small team's ability to move fast. The master prompt recommends Next.js App
Router, Supabase and Vercel, and asks for a modular monolith.

## Decision
- One Next.js 16 (App Router) application in strict TypeScript, deployed on Vercel.
- One Supabase project per environment (Postgres, Auth, Storage, Realtime).
- Domain modules under `src/modules/<domain>`, each exposing a public `index.ts`. Cross-module imports of
  internals are blocked by ESLint `no-restricted-imports`.
- Pure calculation libraries (payroll, billing, leave accrual, geofence) have no I/O and are tested
  exhaustively.
- pnpm as the package manager, with dependency versions pinned exactly.
- TypeScript: the latest version that is compatible with Next.js, typescript-eslint and Vitest when Phase 1
  starts (TS 7 if supported, otherwise the latest 5.x/6.x).
  **Resolved in Phase 1:** the Next.js 16.4 template pins TypeScript 5.9, so WOHKAH uses 5.9 (strict,
  plus `noUncheckedIndexedAccess`). Revisit TypeScript 7 when Next.js adopts it.
- Next.js 16 with Cache Components enabled (the template default, and mandatory in the next major).
  Rule for Phase 1: tenant data is never cached on the server; every session read sits inside a
  `<Suspense>` boundary.
- shadcn/ui components are written into `src/components/ui` by hand in the shadcn style, because
  the shadcn registry is unreachable from the development environment. They are ordinary source files
  either way.

## Consequences
- A simple deployment and a single source of truth. Domain boundaries keep a later extraction possible.
- Vercel function time limits require long work to run in the job system (ADR-0005).
- Supabase lock-in is moderate: everything is standard Postgres apart from Auth, Storage and Realtime.

## Alternatives considered
- Separate API service (NestJS or Fastify) plus a SPA: more infrastructure, and it duplicates authorisation.
- Microservices: unjustified at 1–100 employees per tenant.
