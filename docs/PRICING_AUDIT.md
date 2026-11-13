# WOHKAH — Pricing, Subscription and Trial Audit

| | |
|---|---|
| Date | 2026-11-12 |
| Requested by | Product owner: "Complete Pricing, Subscription, Free Trial & Plan Comparison Update" |
| Status | **Audit complete. Implementation paused for the decisions in §6** |

Classification key: ✅ Confirmed and implemented · 🟦 Confirmed but not implemented ·
🟨 Implemented but not approved · 🟥 Conflicting · ❓ Needs product owner clarification

## 1. What exists today

| Area | Current state |
|---|---|
| Plan configuration | Database tables `subscription_plans`, `plan_features`, `company_feature_overrides` (single source of truth for entitlements), plus `src/lib/plans.ts` for the public website, kept identical to the database by an automated test |
| Plans | Free ₦0, Starter ₦12,500, Growth ₦29,500, Business ₦59,500, Scale ₦109,500. Annual = 10 × monthly. Included staff 3/10/25/50/100. Extra staff ₦1,000 on every plan |
| Subscriptions | `company_subscriptions`: one row per company, status `trialing/active/past_due/grace/canceled/expired`, has `trial_ends_at`. Every new company starts on Free. A lapsed paid plan falls back to Free features; no data is removed |
| Payments | **None.** No Paystack integration, invoices, payment methods or webhooks (planned for Phase 9) |
| Trials | **None.** The status value and date column exist; there's no way to start a trial, no eligibility check and no expiry handling |
| Enforced by the database | Administrators (trigger), branches (trigger), custom roles (row security). |
| Not enforceable yet | Staff numbers (staff records arrive in Phase 2), work locations (Phase 4), storage (Phase 2), custom domains (Phase 9) |
| Annual billing | Prices stored and shown on the website. Not purchasable (no payments) |
| Website pricing | 5 cards, monthly/yearly switch, extra-staff example. No comparison table |
| Subscription page in the app | `/w/[slug]/settings/plan`: current plan, simple feature list, all plans. No usage, trial or add-ons |
| Upgrade prompts | Generic: "Your plan allows up to N … Upgrade your plan" and a custom-roles notice on the Roles page |

## 2. Prices and plans

| Item | Approved (this brief) | Current | Class |
|---|---|---|---|
| Free | ₦0 | ₦0 | ✅ |
| Starter | ₦5,000 / month | ₦12,500 | 🟥 → update |
| Growth | ₦10,000 / month | ₦29,500 | 🟥 → update |
| Business | ₦15,000 / month | ₦59,500 | 🟥 → update |
| Scale | Discontinued, keep history | Offered | 🟥 → withdraw (hide, never delete) |
| Annual | 10 × monthly if already approved: ₦50k / ₦100k / ₦150k | 10 × monthly (approved in the original brief) | ✅ policy, update amounts |
| Extra staff | ₦1,000 / month if already implemented | ₦1,000, stored per plan; billing maths only on the website (no billing engine yet) | ❓ see Q1 |
| Extra work locations | ₦1,000 / location / month | Not modelled | 🟦 |

## 3. Limits

| Limit | Free | Starter | Growth | Business | Current (F/S/G/B) | Class |
|---|---|---|---|---|---|---|
| Staff | 3 | 10 | 25 | 50 | 3/10/25/50 "included" + ₦1,000 extra | ❓ Q1 (limit or included?) |
| Administrators | 1 | 2 | 5 | 10 | 1/3/5/10 | 🟥 Starter 3 → 2 |
| Work locations | 1 | 2 | 5 | **not defined** | 1/3/10/25 | 🟥 + ❓ Q2 |
| Storage | 500 MB | 5 GB | 20 GB | 50 GB | same | ✅ (not enforced until Phase 2) |
| Branches | "Multiple branches" listed only under Business | — | — | — | 1/2/5/unlimited (my earlier proposal) | 🟥 ❓ Q3 |
| Departments | "Multiple" from Growth, "Unlimited" on Business | — | — | — | unlimited on all | 🟥 ❓ Q3 |
| Custom domains | — | — | 1 | 1 | 0/0/1/1 | ✅ (Starter add-on from the original brief: ❓ Q6) |
| Report history | not stated | 12 months | not stated | "extended" | not modelled | ❓ Q7 |
| Support | not stated | Email | Priority | Priority | not modelled | ❓ Q7 (Free) |

## 4. Features

Almost every module in the approved allocation is **not built yet**: staff records (Phase 2),
onboarding, contracts and job descriptions (3), attendance and work locations (4), salaries and
leave (5), tasks, messages and meetings (6), documents, performance and lifecycle (7), reports (8).
In line with the language guide, they will be shown on the pricing page and comparison table, but
marked **"Coming soon"**, never as working features.

| Approved allocation | Backend entitlement key today | Class |
|---|---|---|
| Free: GPS clock-in/out, basic attendance, basic salaries, leave, basic tasks, messages, announcements, staff portal, basic dashboard and reports | none needed (base features) | 🟦 not built |
| Starter+: full onboarding | `advanced_onboarding` (Starter+) | ✅ allocation, 🟦 not built |
| Starter+: digital contracts and signatures | `digital_contracts` (Starter+) | ✅ allocation, 🟦 not built |
| Starter+: job descriptions | `job_descriptions` (Starter+) | ✅ allocation, 🟦 not built |
| Starter+: full GPS attendance and approved work locations, full salaries, advances and deductions, salary slips and reports, meetings, documents and policies | no keys yet | 🟦 keys to add |
| Growth+: custom roles | `custom_roles` (Growth+) | ✅ implemented and enforced |
| Growth+: multiple approval levels | `advanced_approvals` (Growth+) | ✅ allocation, 🟦 not built |
| Growth+: advanced salaries, advanced attendance reports, performance and KPIs, meeting minutes, advanced staff lifecycle | no keys yet | 🟦 keys to add |
| Business: advanced reports and analytics, custom reports | `advanced_reporting`, `advanced_analytics` (Business+) | ✅ allocation, 🟦 not built |
| Business: advanced approval workflows, detailed access controls, extended audit history | no keys yet | 🟦 keys to add |
| Scale-only items (3 custom domains, unlimited admins, 100 GB) | exist for Scale | 🟨 to retire with Scale |

## 5. Trial and billing capability

| Requirement | Today | Class |
|---|---|---|
| 7-day trial, no card, choose Starter/Growth/Business | not built | 🟦 can build now (no payment needed) |
| Eligibility (no repeat trials) | not built | ❓ Q4 rule |
| Expiry: keep all data, restrict | lapsed plans fall back to **Free** features (usable) | 🟥 brief says "restricted/read-only": ❓ Q5 |
| Reminders (3 days, 1 day, today, expired), no duplicates | no notification or job system yet (Phase 10 / ADR-0005) | ❓ Q8: in-app now, email later? |
| Subscribe / upgrade / downgrade / buy locations with payment | **No payment provider yet** | ❓ Q9: Paystack now? |

## 6. Decisions (approved by the product owner, 2026-11-13)

| Topic | Decision | Where enforced |
|---|---|---|
| Plans | Free ₦0, Starter ₦5,000, Growth ₦10,000, Business ₦15,000 a month | `subscription_plans`; `src/lib/plans/catalog.ts` mirrors it (tested) |
| Yearly | 10 × monthly: ₦50,000 / ₦100,000 / ₦150,000. Free has no yearly option | same |
| Scale | Withdrawn: `is_public = false`, `is_active = false`. History kept | migration `20261113000100` |
| Active staff included | 3 / 10 / 25 / 50 | `employees_staff_allowance` trigger |
| Extra staff | ₦1,000 a month or ₦12,000 a year each, **paid plans only**. Free must upgrade | `allows_extra_staff`, `subscription_quote()` |
| Over the allowance | Activation blocked. After a downgrade or trial expiry the owner chooses who stays active; the rest become `plan_suspended` (records kept, reactivatable). Nothing is silently deactivated or deleted | `select_active_staff()`, `reactivate_staff()`, `app.is_member()` |
| Lower plan | Applied now if nothing is paid for; otherwise scheduled for the end of the paid period. Excess staff must be chosen first | `change_to_lower_plan()`, `sync_subscription()` |
| Work locations included | 1 / 2 / 5 / 10. Extra: ₦1,000 a month or ₦12,000 a year each | `work_locations` trigger, `company_work_location_allowance()` |
| Branches | **Corrected 2026-11-14:** Free 1, Starter up to 2, Growth up to 5, Business up to 10. No plan is unlimited. Separate from work locations | `plan_features.branches`, `branches_limit` trigger |
| Departments | **Removed 2026-11-14.** Not a plan feature, limit or upgrade reason (the earlier 1 / 1 / 10 / unlimited allocation is withdrawn) | — |
| Trial | 7 days, no card, Starter/Growth/Business only. One per workspace and one per owner every 12 months. Expiry moves the workspace to Free (not a lock), keeps all data, and requires staff selection above 3. Idempotent | `start_trial()`, `trial_grants`, `sync_subscription()` |
| Reminders | In-app notifications and dashboard banner at 3 days, 1 day, expiry day and expired; deduplicated by `(user_id, dedupe_key)`. Email can be added later from the same rows | `app.notify_billing_admins()` |
| Custom domains | Not offered. Removed from pricing, comparison and FAQs; `custom_domains` disabled on every plan | — |
| Support / report history | Starter: "Email support", 12 months of report history. Growth and Business: "Priority support". Nothing else is stated | `support_level`, `report_history_months` |
| Payments | Paystack. Stage 1 (subscription infrastructure) complete; Stage 2 (Paystack test-mode verification) is required before commercial launch. No "contact us to subscribe" buttons, no simulated payments | ADR-0006 |

**Interpretation to confirm:** the Free plan may buy extra work locations (only extra staff were
excluded for Free). This is how it is built; it is one flag (`allows_extra_work_locations`) to change.

## 7. Departments removal: dependencies and proposed safe migration (2026-11-14)

**Done now (non-destructive, migration `20261114000200_branches_and_departments.sql`):**
removed from pricing cards, the comparison table, the subscription dashboard, upgrade prompts, plan
entitlements (`plan_features`, `features`), the department limit trigger, the setup checklist,
Settings (the old link now opens Settings → Company), the Roles page permission list and marketing
copy. No department records were deleted.

**Dependencies that still exist** (kept so nothing breaks):

| Dependency | What uses it | Risk if removed |
|---|---|---|
| `public.departments` table (RLS, audit, no-cycle trigger) | Records businesses already created | Losing customer data |
| `member_roles.department_id` and `scope_type = 'department'` | Database permission helper (`app.has_permission` with a department scope). The app only assigns company-wide roles today | Breaking any department-scoped role assignment that exists |
| `employees.department_id` | Staff records (column only; no screen sets it) | Losing staff-to-department links if any exist |
| `departments.manage` permission | Granted to Owner and some system roles; hidden from the Roles page | Removing it changes existing roles' permission sets |
| **Department Manager** system role (`dept_manager`) | Still offered when inviting people and shown on the Roles page | People who hold it would lose their role |
| `workspace_context()` role scope fields | Returned to the app (unused) | None, but cleanup touches the API |

**Proposed safe migration (needs your approval before it runs):**
1. Check the production and development databases for department data (department rows,
   department-scoped roles, staff with a department, members holding Department Manager).
2. Retire the **Department Manager** role: stop offering it for new invitations and new businesses;
   move existing holders to **Operations Manager** (closest permissions) or to a role you choose,
   recorded in the audit log.
3. Convert any department-scoped role assignments to company-wide or branch-scoped ones.
4. Revoke `departments.manage` from all roles (it already grants nothing visible).
5. Keep the `departments` table and `employees.department_id` read-only as historical data for at
   least one release, then archive or drop them in a later, separately approved migration.
