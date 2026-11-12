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

## 6. Decisions needed before implementation

See the chat message accompanying this audit; answers will be recorded here.
