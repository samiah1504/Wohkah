<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## WOHKAH rules for every agent and developer (mandatory)

1. **Before any change to customer-facing text, and before starting any phase, read
   `PRODUCT_LANGUAGE_AND_POSITIONING.md`.** WOHKAH is for small business owners (5–50 staff, no HR
   department). Customers see "business account", "staff", "salaries", "salary slips", "staff
   portal", "approved work locations", "email address": never "workspace", "work email",
   "employees", "payroll", "payslips", "self-service" or "geofencing". This covers every place a
   customer can read text, including errors, emails, notifications and text stored in the database.
   Use the shared labels in `src/lib/copy/`. Internal code and database names may stay technical.
   `pnpm test` runs `tests/unit/language.test.ts`, which fails on disallowed customer-facing words;
   add new banned terms to `DISALLOWED_TERMS` in `src/lib/copy/terms.ts`.
2. Never invent proof (testimonials, logos, statistics) and never present unbuilt features as
   available. Feature status lives in `src/lib/copy/features.ts`.
3. Security rules in `SECURITY.md` and `ARCHITECTURE.md` apply: the database (RLS) is the security
   boundary; never trust a company id from the browser; the service-role client is allow-listed.
4. Follow the phase process in `DEVELOPMENT_ROADMAP.md` and report as described there.
