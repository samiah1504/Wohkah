# ADR-0003: Tenant isolation with RLS and URL-based workspace resolution

**Status:** Proposed. **Date:** 2026-11-07

## Context
Tenant isolation must be enforced in the database, `company_id` from the browser must never be trusted,
and a user in several companies must see only the selected workspace. Workspaces must also be reachable at
`company.wohkah.com` and at customer custom domains.

## Decision
1. **Shared database, shared schema, a `company_id` column on every tenant table**, with RLS enabled and
   forced on every table.
2. Policies call `security definer` helpers in a private `app` schema: `is_member`, `has_permission`,
   `has_permission_for` (department or branch scope) and `can_access_employee`. The helpers wrap
   `auth.uid()` in `(select …)` so the planner caches it, and the matching indexes exist.
3. **Composite foreign keys** `(company_id, ref_id)` make cross-tenant references impossible.
4. **The active workspace comes from the URL** (`/w/[slug]`). `proxy.ts` rewrites
   `slug.wohkah.com/*` and active custom domains to `/w/[slug]/*`. The workspace layout resolves the
   slug, verifies membership on the server, and builds a `TenantContext` that every service receives.
   Services take `companyId` *only* from `TenantContext`.
5. RLS is the isolation guarantee between companies. The `TenantContext` filter narrows a multi-company
   user to the selected workspace. Tests cover both.
6. The service-role client is restricted to an allow-list of modules and audited.

## Consequences
- Multi-tab, multi-workspace use is safe because there is no "current company" cookie that one tab could
  change under another.
- Every new table needs policies and is covered automatically by the catalog-driven isolation tests.
- RLS helper performance matters: keep the functions `stable` and index `company_members (user_id,
  company_id)` and `member_roles (member_id)`.

## Alternatives considered
- **Active company in a JWT custom claim:** switching workspace requires a token refresh, and two tabs
  conflict. Rejected.
- **Active company cookie:** two tabs conflict, and it adds hidden state. Rejected.
- **Schema or database per tenant:** operationally heavy for thousands of small tenants, and migrations
  multiply. Rejected.
