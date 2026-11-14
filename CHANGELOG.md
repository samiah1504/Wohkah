# Changelog

All notable changes to WOHKAH are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Phase 2: staff records (2026-11-14)

#### Added
- Staff list with search (name, job title, email address, phone, staff number), Current / Left /
  Archived / All filters, a branch filter, 25 per page and a CSV download (`staff.export`).
- Add and edit staff on their own pages: first and last name, email address, phone (E.164), job title
  with suggestions, employment type, branch, who they report to and start date. Staff numbers are
  assigned automatically.
- Staff profile with Overview, Private details, Documents and History tabs; status changes (on leave,
  suspended, resigned, let go, rejoined, archived) following fixed rules.
- Private details: date of birth, gender, home address, emergency contact, next of kin, bank details,
  TIN, pension PIN and PFA, visible only with the new "private staff details" access.
- Private documents (PDF, Word, photos; 10 MB each) counted against the plan's storage; archive and
  restore, never deleted.
- Invite a staff member to the staff portal from their record; once they accept, they see their own
  record (read only) under **My record**.
- Migration `20261114000600_staff_records.sql`; permissions `staff.sensitive` and `staff.export`
  (given to Owner).

#### Changed
- "Add staff" opens a full page instead of a small dialog.
- Staff records are marked as available in the feature list and plan comparison.

### Registration page redesign (2026-11-14)

#### Changed
- `/register` has a plain, focused layout (logo, heading, form) and the copy "Create your account /
  Start your 7-day free trial and experience a better way to manage your business and your people."
- Fields: first name, last name, email, phone (country picker with flags, Nigeria +234 by default,
  validated with libphonenumber-js and stored in E.164), password with show/hide and live
  requirements, optional "How did you hear about WOHKAH?" (with "Other" detail).
- Required, unticked Terms of Use / Privacy Policy checkbox; separate optional marketing consent.
- Button "Start my free trial". After confirming their email, new owners start business setup with
  the 7-day trial of the recommended plan selected (Free is still one tap away; trial rules
  unchanged). Pricing "Start free" keeps Free selected.
- Login page unchanged.

#### Added
- `user_registrations` table and `profiles.first_name` / `last_name` (migration
  `20261114000500_registration_details.sql`); timestamps come from the database clock.

### Copy written as if every feature is live (2026-11-14)

#### Changed
- All hand-written "coming soon", "will", "not yet" and "on the way" sentences on the website and
  in the app are rewritten in the present tense (FAQs, homepage intro, About, Privacy, staff portal
  welcome, Staff and Work locations empty states).
- What isn't built yet is shown only by automatic "Coming soon" labels driven by the switches in
  `src/lib/copy/features.ts` and `FEATURE_INFO`; turning a switch on removes every label for that
  feature. Launch steps added to DEVELOPMENT_ROADMAP.md and the language guide.

### Homepage messaging rewrite (2026-11-14)

#### Changed
- New positioning: small and growing businesses with 1–50 staff (product owner). Removed "5 to 50
  staff", "no HR department" and "If you have people to manage" from the homepage, FAQs and
  metadata; language guide, AGENTS.md and README updated.
- Hero: "Running a business is already hard. Managing your staff shouldn't make it harder.", with
  "Create your free account" and "See how it works".
- Problem section: "Before you deal with suppliers, customers and business expenses, you still have
  staff to manage", plus six cards with the owner's everyday questions and their answers.
- Seven feature bands with animated sample scenes: attendance, the monthly salary bill, paid vs
  awaiting payment (records only; WOHKAH doesn't send money), leave, branches, team communication
  and staff records. Coming-soon labels still follow `src/lib/copy/features.ts`.
- Industry cards and the four getting-started steps rewritten; closing message "Running a
  business comes with enough headaches. Managing your staff shouldn't be another one."

### Homepage redesign with motion (2026-11-14)

#### Changed
- New homepage: animated hero (staff clocking in, sample data), a moving strip of business types,
  an "exercise book to WOHKAH" story, colour bands with a live scene per feature (attendance,
  salary slip, leave approval, tasks and announcements), a "set up today" band for what works now
  (roles you name yourself), swipeable "who it's for" cards and a bolder closing call to action.
- No invented proof: no customer counts, testimonials or press logos. Sample data and "Coming
  soon" are labelled. All animation stops for visitors who ask their device for less motion, and
  content shows without JavaScript.

### Businesses define their own roles (2026-11-14)

#### Changed
- Owner is the only built-in role. Every other role is the business's own: create, name, choose its
  access, rename or delete it, on every plan (no longer a Growth feature).
- New businesses start with the Owner role only. Existing businesses keep all their roles and
  everyone's access; those roles simply become editable and deletable.
- People can be invited without a role ("Staff portal only").
- The plan's administrator allowance now counts people whose roles give them any access.
- Roles page wording: "Edit access", "Who can do what".

### Departments removed entirely (2026-11-14)

#### Removed
- Departments are gone from WOHKAH: the Department Manager role (holders and pending invitations
  moved to Operations Manager), the `departments.manage` permission, the `departments` table,
  department links on staff records and role assignments, and department-scoped roles. Copies are
  kept in a private archive schema until the product owner confirms they can be dropped.

### Branch allowances corrected; departments removed (2026-11-14)

#### Changed
- Included branches: Free 1, Starter up to 2, Growth up to 5, Business up to 10 (previously
  1/1/1/unlimited), enforced in the database and shown on pricing cards, the comparison table, the
  subscription page, the branch form and upgrade prompts. Work-location allowances are unchanged
  and stay separate.
- At the Business maximum the prompt says it's the most available, without inventing an upgrade.
- Team Access is described as "Your business staff who can sign in to WOHKAH".

#### Removed
- Departments as a plan feature, limit, comparison row, usage meter, upgrade prompt, settings page,
  setup step and marketing claim. Existing department records, columns, the permission and the
  Department Manager role are kept; see docs/PRICING_AUDIT.md §7 for the proposed safe migration.

### Business language cleanup (2026-11-14)

#### Changed
- Customers now see "business account" or "business" instead of "workspace", and "Email address"
  instead of "Work email", across sign-in, registration, password recovery, invitations (page and
  email), onboarding, the business switcher, home, settings, Team Access, roles, subscription,
  errors, the 404 page, the public website, FAQs and terms.
- Login: "Sign in to your WOHKAH account."
- Roles page: permission groups use plain headings ("Business setup", "Team access") and plainer
  permission descriptions. The Owner role, the trial-ended notification and the owner-rule error
  no longer mention a workspace (migration `20261114000100_business_language.sql`, data only).
- Company profile: "Business email address", with a note that any email (Gmail, Yahoo) is fine.

#### Added
- `tests/unit/language.test.ts`: fails the build when disallowed wording appears in customer-facing
  source text. "workspace" and "work email" added to `DISALLOWED_TERMS`.
- The rendered-text language test now also covers password recovery, the business list and mobile
  layouts.
- Developer instructions (AGENTS.md, CLAUDE.md, README) require reading
  PRODUCT_LANGUAGE_AND_POSITIONING.md before changing any customer-facing interface.

### Pricing, trials and subscriptions (2026-11-13)

#### Added
- Approved plans: Free ₦0, Starter ₦5,000, Growth ₦10,000, Business ₦15,000 a month (yearly = 10 ×).
  Active staff allowances 3/10/25/50, enforced in the database; extra staff ₦1,000 a month or ₦12,000
  a year on paid plans; work locations 1/2/5/10 with extra locations at the same price.
- 7-day free trial (no card) of Starter, Growth or Business, from onboarding or the subscription page.
  One per workspace and one per owner every 12 months. Expiry moves the workspace to Free.
- Staff page: add staff, mark as left, archive; choose who stays active when over the allowance;
  paused staff keep their records and can be reactivated.
- Settings → Work locations, Settings → Subscription (plan, usage, trial, plan cards with gains and
  price differences, comparison table, history, payment records) and a checkout page.
- Contextual upgrade prompts for staff, work locations, branches, departments and custom roles.
- Trial reminders as in-app notifications and a dashboard banner, without duplicates.
- Paystack groundwork: invoice creation, server-side verification, signed webhooks, verified-payment
  function. Requires test-mode verification before launch.

#### Changed
- Public pricing shows four plans with "Start with a 7-day free trial. No card required." and a full
  comparison table generated from the same catalogue the database enforces.
- FAQs and terms updated; custom domains are no longer mentioned; no "contact us to upgrade".
- Scale plan withdrawn (history preserved). Settings → Plan redirects to Settings → Subscription.

### Public website and product language (2026-11-12)

#### Added
- `PRODUCT_LANGUAGE_AND_POSITIONING.md`: mandatory audience, positioning and wording rules for every
  screen, email and page; referenced from AGENTS.md, CLAUDE.md, README, ARCHITECTURE and the roadmap.
- Shared customer wording in `src/lib/copy/` (role names, navigation labels, plan feature labels,
  feature release status) and public pricing in `src/lib/plans.ts`, both checked against the database.
- Redesigned public website: navigation, hero, product preview (labelled sample data), problems and
  solution, features with "Coming soon" labels, who it's for, how it works, benefits, pricing with
  monthly/yearly switch and extra-staff example, FAQs, final call to action, footer.
- About, Contact, Privacy (draft) and Terms (draft) pages.
- SEO: page titles and descriptions, Open Graph sharing image, sitemap, robots rules, structured data.
- Tests: website end-to-end tests, a language-policy test on rendered pages, plan maths unit tests.

#### Changed
- Customer-facing wording across the app: "Staff Manager" and "Staff Member" roles (migration
  `20261112000100`), "Team Access" instead of "People", "staff portal", "staff" instead of
  "employees", plan feature labels.

### Phase 1: Foundation and multi-tenancy (2026-11-10)

#### Added
- Next.js 16 app with the WOHKAH brand theme, app shell (desktop sidebar, mobile bottom navigation)
  and marketing page.
- Authentication: registration with email confirmation, login, logout, password reset and change,
  optional TOTP two-step verification, sign-in history, rate limiting.
- Multi-tenancy: company workspaces, membership across several companies, URL-based workspace
  switching, server-resolved tenant context.
- Workspace settings: company profile and working calendar, departments, branches, holidays, plan
  overview, audit log viewer.
- People and access: invitations (email or copyable link), acceptance, suspension and removal,
  six default roles, role assignment, permission matrix, custom roles (Growth and above).
- Database: 8 migrations, RLS on every table, composite foreign keys, escalation guards, owner rule,
  data-driven plan entitlements and limits, append-only audit log, rate-limit store.
- Tests: 58 database security tests, 10 unit tests, 10 end-to-end tests; GitHub Actions CI.
- DEPLOYMENT.md, API_DOCUMENTATION.md, docs/PHASE_1_REPORT.md.

#### Fixed (found by end-to-end testing)
- Sign-out from the account menu.
- Neutral "Page not found" page for workspaces a user can't access.
- Missing confirmation when saving the last branch a plan allows.
- Prefetch renders no longer start session-bound Supabase work.

### Phase 0

### Added
- Phase 0 project audit (`docs/PHASE_0_AUDIT.md`).
- Architecture, database, security and roadmap documents.
- Architecture decision records ADR-0001 to ADR-0008.
- Draft `.env.example` (variable names only) and `.gitignore`.

### Changed
- Service decisions confirmed: Paystack (Flutterwave as the alternative), Resend, Sentry.
- ADR-0005 rewritten: background jobs use Supabase Cron + Supabase Queues instead of Inngest.
- ADR-0008: rate limiting uses a Supabase Postgres table instead of Upstash.
