-- Development-only seed data. Runs on `supabase db reset` locally and in CI.
-- NEVER put real employee, payroll or customer data here, and never run this
-- against staging or production. Reference data (permissions, plans, role
-- templates) lives in migrations, not here.
--
-- Phase 1 needs no seed rows: tests and e2e flows create their own users and
-- companies through the real sign-up and create_company paths.
select 1;
