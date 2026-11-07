# ADR-0002: Separate user identity, company membership and employee record

**Status:** Proposed. **Date:** 2026-11-07

## Context
One person may be an admin in Company A and an employee in Company B with a single login. HR records also
exist for people who have no login yet (invited, or terminated with access revoked).

## Decision
Three separate concepts:

| Concept | Table | Lifecycle |
|---|---|---|
| **User** (login identity) | `auth.users` + `profiles` | Global, one per person |
| **Membership** (access to a workspace) | `company_members` + `member_roles` | Per company. Can be suspended or removed |
| **Employee** (HR record) | `employees` (`member_id` nullable) | Per company. Retained after access is revoked |

- Offboarding sets the membership to `removed` (access revoked immediately) while the employee record
  moves to `resigned`, `terminated` or `archived`, and is never deleted.
- Platform administrators are a fourth, unrelated concept (`platform_admins`). Company roles never grant
  platform access.

## Consequences
- No duplicated identities. Workspace switching is natural.
- Services must not assume that every member is an employee (for example an external accountant), or that
  every employee is a member.

## Alternatives considered
- One user per company (separate logins): poor experience and duplicated identities. Rejected by the
  master prompt.
