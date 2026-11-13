# WOHKAH — Product Language and Positioning

> **Mandatory reading.** Every person and every AI coding agent working on WOHKAH must read this
> document before starting any phase, and before implementing or changing any customer-facing
> interface: screen, form, button, error, empty state, tooltip, email, notification, marketing page
> or text stored in the database. Customer-facing text
> that breaks these rules is a defect, the same as a bug. Changing these rules needs the product
> owner's approval.

Shared wording lives in code at `src/lib/copy/` (terminology, navigation labels, role names, feature
availability). Use it instead of writing labels by hand.

---

## 1. Who WOHKAH is for

**Nigerian owners of small and growing businesses with 1–50 staff** (updated by the product owner,
2026-11-14). That includes a shop with a single sales assistant and a business with several branches.
Most owners supervise their staff themselves while also handling suppliers, stock, customers,
deliveries, expenses and cash flow. Our words are written for that owner. WOHKAH keeps working as
teams grow beyond 50.

Don't position WOHKAH by whether a business has HR staff: it neither needs nor excludes them. Don't
say "5–50 staff", "no HR department" or anything that makes a one-person team feel left out, and
don't make it sound complicated or enterprise-only.

Typical businesses: furniture makers, supermarkets, retail shops, restaurants, schools, salons,
e-commerce sellers, logistics companies, warehouses, agencies, small manufacturers, professional
services and growing family businesses.

Today they manage staff with WhatsApp messages, exercise books, spreadsheets, paper attendance
registers, manual salary calculations, informal leave requests, verbal instructions and scattered
documents.

They want quick answers to everyday questions:

- Who came to work today? Who was absent?
- What is each staff member supposed to do?
- How much should I pay my staff, and has everyone been paid?
- How much is my total salary bill this month, and what will next month cost?
- Who is still waiting for their salary?
- Are my staff at their approved work locations?
- What is happening at my other branches, and who is supervising each one?
- Who asked for leave?
- What tasks have I given out, and are they done?
- Where are my staff records and documents?
- How do I reach everyone at once?

They won't sit through training to use software. The website should make them feel understood
before it tries to sell them anything.

## 2. Positioning

**WOHKAH helps small business owners manage their staff, organise daily work, keep track of
attendance, manage salaries and communicate with their staff, from one simple platform.**

- Tagline: **"Your staff, well managed."**
- Central message: **"Running a business comes with enough headaches. Managing your staff shouldn't
  be another one."** We sell peace of mind, organisation, visibility and control.
- Tone: modern Nigerian business brand. Conversational, clear and professional; everyday Nigerian
  business situations, with Pidgin and slang used sparingly, if at all.
- Never suggest WOHKAH sends money. It records salary payments the business makes itself.
- Pronounced "Worker". A product of **Crift Concepts**.
- It should feel accessible, practical, professional and powerful. It should never feel like
  complicated enterprise HR software.

## 3. Approved terminology (customer-facing)

| Avoid | Use |
|---|---|
| Workspace | Business account, or simply "business" (choose what reads naturally) |
| Work email | Email address / your email address ("business email address" only for the business's own contact details) |
| Employees | Staff (a staff member) |
| Workforce management, human resources, HR management, human capital management | Staff management |
| Payroll | Salaries |
| Payroll processing / payroll runs | Salary management / salary processing |
| Payroll records / payroll reports | Salary records / salary reports |
| Payslips | Salary slips |
| Remuneration | Salary |
| Employee onboarding | Adding new staff / setting up new staff |
| Employee lifecycle | Managing staff |
| Employee self-service | Staff portal |
| Personnel records, employee records | Staff records |
| Personnel | Staff |
| HR administrator | Staff manager |
| Departments (as a feature or plan limit) | Not offered: don't mention them |
| Workforce analytics | Business and staff reports |
| Team collaboration | Staff communication |
| Geofencing | Approved work locations |
| Employee attendance / absence management | Staff attendance / staff absence |
| Performance management | Staff performance |
| Employee directory / profile / documents | Staff directory / profile / documents |
| HR dashboard, workspace dashboard | Business dashboard (or just "Home") |
| Workspace settings | Business settings (or just "Settings") |
| Workspace members | Business staff (the menu item stays "Team Access" so it isn't confused with "Staff") |
| Workspace invitation | Business invitation |

These are guides, not a reason to write awkward sentences. "A staff member" or "your staff" is
fine; "staffs" is not. Don't replace words blindly: pick what an ordinary business owner would say
in that sentence ("Your business account is ready", "Switch business", "Ask the business owner").

**Branches, work locations and departments.** A *branch* is one of the business's branches (a shop,
office or site the business runs). An *approved work location* is a physical place where staff may
clock in; a branch can have several. They are separate allowances (branches 1/2/5/10, work locations
1/2/5/10 by plan) and must never be merged in wording or limits. WOHKAH does **not** offer
departments: don't mention departments in screens, pricing, prompts or marketing, and don't replace
them with another invented grouping.

**Never imply a corporate email is needed.** Owners and staff often use Gmail or Yahoo. Label email
fields "Email address".

**Roles belong to the business.** The only built-in role is **Owner**. Every business creates and
names its own roles (Manager, Cashier, Supervisor…), chooses what each can access, and can rename or
delete them, on every plan. Don't hard-code role names in screens, examples or rules, and don't
assume a business has an Accountant or an Operations Manager. People with no role still have their
own staff portal: call that "Staff portal only", and call permissions "access" in the interface.

## 4. Terms to avoid in the interface

Workspace, work email, employee(s), workforce, HR, human resources, human capital, personnel,
payroll, payslip,
remuneration, onboarding, offboarding, lifecycle, self-service, geofence/geofencing, KPI (say
"targets"), appraisal (say "review"), FTE, headcount (say "number of staff"), tenant, entitlement,
RLS, provisioning, SSO, webhook, and any other software or HR jargon.

Technical terms are allowed **in code, database names, API names, URLs, logs and engineering
docs**. `payroll_runs`, `employee_id`, `onboarding_tasks`, `src/modules/workspace`, the
`/workspaces` and `/w/[slug]` routes and so on stay as they are. The rule is about what
customers read, not what engineers name things.

When a feature needs a technical concept, **translate it**: "GPS clock-in at approved work
locations", not "geofenced attendance".

## 5. Writing examples

| Don't write | Write |
|---|---|
| Manage your workforce with our comprehensive HR management solution. | Manage your staff, track attendance, organise salaries and keep your business running smoothly. |
| Process payroll and generate employee payslips. | Calculate staff salaries and make salary slips available to your staff. |
| Employee onboarding workflow. | Set up new staff members quickly and collect their information online. |
| Workforce analytics and performance insights. | See how your business and staff are doing. |
| Geofence validation failed. | You're not at an approved work location. Move closer and try again, or ask your manager. |
| Insufficient permissions. | You don't have access to this. Ask the business owner if you need it. |
| Entitlement limit exceeded. | Your plan allows up to 1 branch. Upgrade your plan to add more. |

## 6. Brand personality

Warm, confident, practical, plain-spoken, respectful. We're like a capable operations manager who
has run a business before: we don't lecture, we don't hype, and we don't hide behind jargon.

- **Bold and professional**, not corporate.
- **Warm**, not cute.
- **Direct**, not pushy.

Visual identity: Deep Yellow `#D69E00` (primary actions and highlights), Dark Walnut `#2B1D18`
(signature dark), Deep Charcoal `#292929` (text), Warm Ivory `#FAF8F2` (main background), Warm Sand
`#F4E8CF` (secondary background), Walnut Taupe `#78665B`, Deep Espresso `#42332B`. Manrope for
headings and Inter for body text. Text on Deep Yellow is Dark Walnut, never white.

## 7. Marketing copy principles

1. Lead with the everyday problem, then the outcome ("Know who came to work today").
2. Say what it does, who it's for and what to do next within the first screen.
3. Outcomes over features; features over specifications.
4. **Never invent proof.** No fake testimonials, customer logos, user counts, star ratings, trust
   badges or statistics. Product previews that use sample data must say so.
5. **Never sell what isn't built as if it exists.** Features that aren't available yet are marked
   "Coming soon" (controlled in `src/lib/copy/features.ts`) until they ship.
6. Prices and plan limits come from the configured plans (`src/lib/plans/catalog.ts`, checked
   against the database by tests). Never invent discounts or benefits.
7. Use Nigerian business reality (naira, WhatsApp, branches, generators and markets) without
   stereotypes.
8. SEO phrases ("staff management software", "staff attendance software", "small business staff
   management") are used naturally. No keyword stuffing.

## 8. Navigation naming rules

- One or two plain words: **Home, Staff, Attendance, Salaries, Leave, Tasks, Messages, Meetings,
  Documents, Staff Performance, Assets, Reports, Settings**.
- Nouns, not verbs or jargon ("Salaries", not "Run payroll").
- Labels come from `src/lib/copy/navigation.ts`. Unbuilt modules never appear in navigation.

| Module | Nav label | Page title | Description |
|---|---|---|---|
| Staff records | Staff | Your Staff | Everyone who works for you, with their details and documents. |
| Adding staff | Add Staff | Set Up New Staff | Collect staff information, share employment documents and get new staff ready to work. |
| Attendance | Attendance | Staff Attendance | See who came to work today and who is absent. |
| Salaries | Salaries | Manage Staff Salaries | Calculate salaries, manage deductions and keep track of payments. |
| Leave | Leave | Staff Leave Requests | Review staff leave requests and manage leave balances. |
| Tasks | Tasks | Manage Staff Tasks | Assign responsibilities, set deadlines and see what has been completed. |
| Messages | Messages | Staff Messages | Communicate with your staff and keep important conversations organised. |
| Performance | Staff Performance | Staff Performance | Set expectations, review progress and recognise good work. |
| Access | Team Access | Team Access | Your business staff who can sign in to WOHKAH, and what they can do. |

## 9. Dashboard language rules

- Answer the owner's questions directly: "12 of 14 staff at work today", "3 leave requests waiting
  for you", "Next salary date: 28 November".
- Numbers always come from real data. Empty states explain what to do next ("No staff yet. Add your
  first staff member.").
- Errors say what happened and what to do, without codes or jargon.
- Buttons are verbs: "Add staff", "Approve", "Send message", "Save changes".

## 10. Staff portal language rules

The staff portal is for staff members, often on a phone and sometimes not confident with software.

- Speak to them as "you": "Your salary slips", "Your leave balance", "Clock in".
- Short sentences, large buttons, no management vocabulary.
- Reassure on sensitive actions: "Your location is only checked when you clock in or out."
- Never show other staff members' private information.

---

## 11. Automated terminology check

`tests/unit/language.test.ts` (part of `pnpm test` and CI) reads every string, template and piece
of JSX text in `src/` and fails if it contains a term from `DISALLOWED_TERMS` in
`src/lib/copy/terms.ts`. Comments, imports, log messages, routes and identifier-like strings are
ignored. `tests/e2e/language.spec.ts` checks the rendered text of public and signed-in pages
(desktop and mobile), which also catches text that comes from the database.

When you add a rule to this document, add the term to `DISALLOWED_TERMS`. If the check flags a
deliberate use of the customer's own words (for example "no HR department"), add that exact phrase
to the allowed list in both tests with a reason; don't weaken the rule.

---

## Before starting any phase (checklist)

1. Read this document.
2. Review the approved requirements for the phase.
3. Use the terminology in §3 and the labels in `src/lib/copy/`.
4. Check new screens, emails, notifications and database-generated text against §4 and §5, and run
   `pnpm test` (§11).
5. Review existing screens touched by the phase for inconsistent wording.
6. Don't reintroduce enterprise HR terminology without the product owner's approval.
