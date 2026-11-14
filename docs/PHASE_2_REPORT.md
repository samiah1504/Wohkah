# WOHKAH — Phase 2 Report: Staff Records

| | |
|---|---|
| Date | 2026-11-14 |
| Branch | `claude/wohkah-architecture-audit-fjcmga` |
| Verified commit | `82271b3` (CI run 43630210863: all jobs green; migration deployed to the development database, run 43630721422) |
| Status | **Acceptance criteria met.** Follow-ups listed in §8. |

## 1. Phase completed
Phase 2 of `DEVELOPMENT_ROADMAP.md` ("Employee management"), shown to customers as staff records.

You made three decisions before the build:
- **Private details:** the standard set, with no NIN or BVN.
- **Staff edits:** staff view their own record and change nothing; every change goes through the owner or a manager.
- **Job titles:** typed freely, with suggestions taken from titles the business already uses.

## 2. Features implemented

| Area | Status | Notes |
|---|---|---|
| Staff list: search, status filter, branch filter, pages | ✅ Completed | Searches name, job title, email address, phone and staff number. 25 per page. Phones get a stacked list, larger screens a table |
| Add and edit staff | ✅ Completed | Full pages with sections. Validation keeps what was typed. Phone numbers are stored in international format |
| Staff numbers | ✅ Completed | Automatic per business (0001, 0002…) and can't be changed |
| Reporting lines | ✅ Completed | "Reports to" any colleague, with loops refused by the database. Profiles list who reports to whom |
| Statuses and status rules | ✅ Completed | Active, on leave, suspended, resigned, let go, rejoined, archived. Leaving dates are recorded automatically |
| Private details | ✅ Completed | Date of birth, gender, home address, emergency contact, next of kin, bank details, TIN, pension PIN, PFA. Shown only to people given "private staff details" access |
| Documents | ✅ Completed | Private storage, up to 10 MB each, counted against the plan's storage. Opened through 60-second links. Archived, never deleted |
| History | ✅ Completed | Every change, in plain words, with who made it and when. Private details are logged as "updated" without the values |
| Staff list download (CSV) | ✅ Completed | Needs its own access ("Download the staff list"). No private details |
| Branch-scoped managers | ✅ Completed | A role given for one branch sees and manages only that branch's staff, details and files. Roles are given per branch in the database; the role screen still gives roles company-wide (see §8) |
| Staff portal link and "My record" | ✅ Completed | Invite from the staff record. After accepting, the person sees their own record, private details, documents and history, read only |
| Positions table | ➖ Not built, by decision | Job titles are typed freely with suggestions |
| Staff editing their own details | ➖ Not built, by decision | View only |

## 3. Files and modules created
- **Database:** `supabase/migrations/20261114000600_staff_records.sql`.
- **Staff module:** `src/modules/staff/`, containing:
  - `schemas.ts`;
  - `server/queries.ts` and `server/actions.ts`;
  - components: `staff-form`, `private-form`, `profile-view`, `profile-actions`, `staff-toolbar` and `form-section`.
- **Pages:**
  - `/w/[slug]/staff` (rewritten), `/staff/new`, `/staff/[id]`, `/staff/[id]/edit`, `/staff/[id]/private` and `/w/[slug]/me`;
  - routes `/staff/export` and `/staff/[id]/documents/[docId]`.
- **Shared code:**
  - `src/lib/copy/staff.ts` (all staff wording) and `src/lib/csv.ts`;
  - `src/modules/access/server/invitations.ts`, used by both the Team Access page and staff records.
- **Tests:**
  - `tests/db/staff-records.test.ts`, `tests/unit/staff.test.ts` and `tests/e2e/staff.spec.ts`;
  - the existing subscription and language e2e tests updated.

## 4. Database changes
- **`employees`:**
  - new columns `first_name`, `last_name`, `staff_number`, `employment_type`, `start_date`, `end_date` and `reports_to`;
  - status rules, history triggers and branch-scoped policies.
- **New tables:** `employee_private`, `employee_history` and `employee_documents`, plus the private `staff-documents` storage bucket.
- **New permissions:** `staff.sensitive` and `staff.export`, given to every Owner role.
- **`company_invitations.employee_id`:** accepting the invitation links the sign-in to the staff record.

Details are in `DATABASE_SCHEMA.md`.

## 5. Security measures
See `SECURITY.md` "Staff records", which maps each control to its test. In short:
- **Private details and files are restricted.** Viewing staff is not enough to see them, and branch managers see only their branch.
- **Staff can't change anything.** They see their own record and nothing else.
- **Every staff and document change is recorded.** The history is append-only and written only by the database.
- **Nothing is deleted.** Staff records and documents can only be archived.
- **Uploads are checked.** The server checks each upload's real stored size, and the database enforces the plan's storage allowance.
- **The download is protected.** The CSV neutralises spreadsheet formulas.

The two isolation checks that were waiting for Phase 2 are now automated: storage objects (SECURITY.md §4 item 3) and private staff details (item 4).

## 6. Tests performed

| Suite | Where | Result |
|---|---|---|
| Typecheck, lint, formatting, production build | Locally and CI | ✅ Pass |
| Unit tests | Locally and CI | ✅ 46/46 |
| Database security tests | Local PostgreSQL 16 and real Supabase Postgres in CI | ✅ 115/115 on Supabase (114 locally, where the storage test is skipped because the local database has no storage schema) |
| End-to-end on a full Supabase stack (desktop and phone) | CI | ✅ 28/28, no retries |

The new database tests cover:
- staff numbers;
- private details hidden from viewers;
- branch-scoped managers;
- staff viewing but not editing their own record;
- cross-business isolation;
- status rules and leaving dates;
- reporting loops;
- append-only history;
- no deletes;
- document paths, edits and visibility;
- the storage allowance;
- storage files;
- storage used on the subscription page;
- portal invitations.

## 7. Issues found by testing
- Column permissions already block changes to staff numbers and document names before the database triggers run. The tests now expect that stronger protection.
- Saving private details for someone who already had some failed with "You don't have permission to do that." The save tried to rewrite the business and staff ids, which nobody may change. It now inserts new details or updates only the detail fields, and a database test covers the update.
- Some browser tests typed into forms before the page had finished loading, so a picked country or typed name could be reset. The tests now wait until the page is ready.
- The subscription page always showed 0 MB of storage used. It now counts staff documents (rounded up to the next MB).

## 8. Outstanding issues and follow-ups
- **Branch-scoped roles have no screen yet.** The database supports giving a role for one branch only, but the role screen still assigns roles across the whole business. This is a small follow-up for the Team Access page.
- **Staff can't see their manager's name.** On "My record" the manager's name stays hidden, because staff can only read their own record. Showing it would need a narrow "my manager" view.
- **Company logo upload** can now reuse the same private storage pattern.
- **Hosted environment.** As before, the development Supabase project receives this migration through the "Deploy database (development)" workflow after CI passes.

## 9. External integrations still requiring credentials
No change from Phase 1: Resend (optional; the app shows copyable invitation links without it), Sentry, Paystack keys and the Vercel project.

## 10. Recommended next phase
**Phase 4: GPS attendance and shift scheduling.** Staff records, branches and approved work locations are now in place. This is also the feature the homepage puts first.

Phase 3 (recruitment, contracts and job descriptions) can follow if you prefer that order.
