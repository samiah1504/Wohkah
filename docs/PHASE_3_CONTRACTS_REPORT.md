# WOHKAH — Phase 3 (part) Report: Contracts, Signing and Job Descriptions

| | |
|---|---|
| Date | 2026-11-15 |
| Branch | `claude/wohkah-architecture-audit-fjcmga` |
| Verified commit | `2b63f5b` (CI run 43769682584: all jobs green; migration deployed to the development database, run 43770252659) |
| Status | **Built and verified.** Follow-ups listed in §8. |

## 1. Scope
This covers the contracts and job descriptions part of roadmap Phase 3: templates, signing and acknowledgement. Recruitment, checklists for new staff and the form builder are not included and stay on the roadmap.

You made three decisions before the build:
- **Templates:** written in WOHKAH's editor, with starter templates.
- **Signers:** contracts are signed by **both** the staff member and the business.
- **Confirmation:** signers confirm with a code sent to their **email address**.

## 2. Features implemented

| Area | Status | Notes |
|---|---|---|
| Documents area and navigation | ✅ Completed | Contracts, Job descriptions and Templates sections. Shown to people with the new access: prepare contracts, sign for the business, write job descriptions |
| Template editor | ✅ Completed | Formatting toolbar (title, section, bold, lists), live preview with a phone write/preview switch, and an "Insert field" menu |
| Fields and blanks | ✅ Completed | 15 fields filled automatically from the staff record and business details. Anything else in {{ }} is a blank, completed per contract on a "Fill in the blanks" panel. A contract can't be sent while any blank remains |
| Starter templates | ✅ Completed | Contract of employment, confidentiality agreement, staff handbook acknowledgement, workplace rules acknowledgement. Each is labelled as a starting point, not legal advice |
| Contracts | ✅ Completed | Prepare for a staff member, edit the draft, send, cancel, and prepare an updated version of a signed contract (linked to the original) |
| Signing | ✅ Completed | Read the document; type or draw a signature; agree to the consent wording; confirm with a 6-digit email code. Works on phones |
| Signed copy | ✅ Completed | A PDF with the document, the signatures and a signing certificate page (fingerprint, signers, times, email-code confirmation, network address, device, consent). Stored privately and downloaded through 60-second links |
| Policies to acknowledge | ✅ Completed | Same flow, confirmed by the staff member alone |
| Job descriptions | ✅ Completed | Versioned. Each change publishes a new version with an optional "what changed" note |
| Assigning job descriptions to staff | ✅ Completed | Staff confirm in their portal, and again after each change. The page shows who has confirmed which version |
| Staff portal | ✅ Completed | "Waiting for you" list, plus Job description and Contracts tabs in My record. Staff are emailed a link when a document is sent to them |
| Staff record tabs | ✅ Completed | Managers see a staff member's job description, whether they have confirmed it, and their contracts |
| Plan rules | ✅ Completed | Starter plan and above, enforced in the database. The Free plan shows an upgrade prompt |

## 3. How signing works (ADR-0007)
1. **Sending freezes the text.** The database stores its SHA-256 fingerprint, and the text can no longer be edited by anyone.
2. **The signer opens the document.** A "viewed" event is recorded.
3. **The signer gives their name, signature and consent,** then asks for a code.
4. **The server emails a code.** Only a hash of the code is stored. It expires after 10 minutes and allows 5 tries, and requesting a new code cancels the old one.
5. **The server checks the code,** then calls a database function that only the server can use. That function checks four things again:
   - the person may sign for that side;
   - the fingerprint still matches;
   - the side hasn't already signed;
   - the same person isn't signing for both sides.
6. **When every required side has signed,** the contract is marked signed. The server then builds the PDF with its signing certificate, stores it privately and records the PDF's own fingerprint.

None of this text, in the app or on the website, claims the signatures are "legally binding". That should wait for a Nigerian lawyer to review the process (see §8).

## 4. Database changes
- **Migration:** `20261115000100_contracts_and_job_descriptions.sql`.
- **Tables:**
  - `contract_templates` and `contracts`;
  - `contract_signatures` and `contract_events` (both append-only);
  - `contract_signing_codes` (server only);
  - `job_descriptions`, `job_description_versions` (immutable) and `job_description_acknowledgements` (append-only).
- **New column:** `employees.job_description_id`.
- **Permissions:** three new permissions, all given to Owner.
- **Storage:** a private `contracts` bucket.

Details are in `DATABASE_SCHEMA.md`.

## 5. Security measures
See `SECURITY.md`, "Contracts and electronic signing". The new service-role module, `src/lib/signing`, is on the reviewed allow-list. The browser can't create signatures, change a sent document or read signing codes.

## 6. Tests performed

| Suite | Where | Result |
|---|---|---|
| Typecheck, lint, formatting, production build | Locally and CI | ✅ Pass |
| Unit tests (document format, fields and blanks, starter templates, a full signed PDF with ₦ and Yoruba names) | Locally and CI | ✅ 50/50 |
| Database security tests | Local PostgreSQL 16 and real Supabase Postgres in CI | ✅ 124/124 on Supabase (122 locally, where the 2 storage tests are skipped) |
| End-to-end (contract from starter template to both signatures and PDF download; job description publish, assign, confirm, re-confirm after a change; Free plan prompt) | CI | ✅ 31/31, no retries |

The new database tests cover:
- plan rules;
- drafts hidden from staff;
- blanks blocking sending;
- the fingerprint, checked against an independent SHA-256;
- edits refused after sending;
- direct client signatures and code reads refused;
- wrong signer and changed text refused;
- signing twice refused;
- completion and its events;
- the history entry;
- append-only evidence;
- signed contracts that can't be cancelled;
- one person signing both sides refused;
- policies completed by the staff member alone;
- isolation between businesses;
- private storage for signed copies;
- job description versioning, immutability, assignment rights, current-version-only confirmation and confirmation privacy.

## 7. Issues found while building
- The PDF library's font subsetting dropped most letters. I found this by viewing a rendered page, and fixed it by embedding the full Inter font.
- A Phase 2 entry in `DATABASE_SCHEMA.md`'s migration table had been lost in an earlier edit. It's restored.
- The browser tests caught two real bugs, both fixed:
  - Draft contracts failed to open, because the Cancel dialog was built in a way this version of Next.js rejects.
  - After a wrong signing code, the consent box was silently unticked while still looking ticked, so the next attempt was refused. Consent is now kept by the form itself.
- A trial-reminder database test failed when run after about 10 pm Lagos time. It's fixed to use "tomorrow at noon" in the business's time zone.

## 8. Outstanding issues and follow-ups
- **Legal review.** Before any marketing describes the signatures as legally valid, a Nigerian lawyer should review the signing process, the consent wording and the starter templates.
- **Email is required for signing in production.** Set `RESEND_API_KEY` and `EMAIL_FROM` on the hosted environment. Without them, signers see a clear message and can't sign.
- **Tone marks in the PDF.** Letters carrying two marks (for example ọ̀) show the tone mark slightly beside the letter, because the PDF library doesn't position combining marks. On-screen text is unaffected.
- **Not built in this part:** recruitment, new-staff checklists, the form builder, collecting documents from new staff, and reminder jobs.
- **No signature-request reminders yet.** People are emailed once when a document is sent, and pending items show in the staff portal and in Documents.

## 9. External integrations
- **Resend:** production email, now needed for signing codes.
- **Mailpit:** local development and CI use the Mailpit inbox that `supabase start` provides (`EMAIL_DEV_INBOX_URL`). It's never used when Resend is configured or when the app isn't running on localhost.

## 10. Recommended next step
- **Phase 4: GPS attendance and shift scheduling.**
- **Or finish Phase 3:** recruitment and new-staff checklists.
