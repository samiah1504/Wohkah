# ADR-0006: In-house billing engine with Paystack as the payment collector

**Status:** Accepted. **Date:** 2026-11-07, accepted 2026-11-10 (Paystack primary; Flutterwave kept
as the alternative)

## Context
Pricing combines a plan price with ₦1,000 per active employee above the plan's included count, monthly or
annual billing, trials, a permanent Free plan, add-ons (custom domains), proration, grace periods and
"never silently charge". Paystack's native subscription plans charge fixed amounts and don't model per-seat
overage well.

## Decision
- **WOHKAH computes every invoice itself** (a pure `billing` library tested exhaustively):
  `total = plan_price + max(0, billable_active_employees − included) × extra_price + add_ons
  ± proration`, followed by tax (VAT treatment to be confirmed).
- **Billable employees:** only `employees.status = 'active'`. A daily job records counts in
  `usage_records`. The proposed measure is the **peak** active count in the period, billed in arrears
  (needs confirmation).
- **Paystack** is used only to collect payment: first payment through Paystack Checkout (which stores a
  reusable authorisation, never raw card data), then renewals by `charge_authorization` with our computed
  amount. Bank transfer and virtual accounts can be offered for annual invoices.
- **Notification before every charge** (an upcoming-invoice email and in-app notice, with a configurable
  lead time), and a visible invoice estimate at all times.
- **Webhooks:** HMAC-SHA512 signature check, `unique (provider, event_id)`, the transaction re-verified
  through the API, and processing that is idempotent and transactional.
- **Charge idempotency:** each invoice has a single `reference`. A retry reuses it, so duplicate charges
  are impossible.
- **Lifecycle:** `trialing → active → past_due → grace → expired/canceled`. When a paid plan expires, the
  company falls back to Free entitlements. Data is never deleted.
- A `PaymentProvider` adapter interface (checkout, charge saved authorisation, verify transaction, verify
  webhook, refund) keeps Paystack-specific code in one module. **Flutterwave** is the approved
  alternative and can be added as a second adapter without changing the billing engine.

## Consequences
- More code than native subscriptions, but correct per-seat billing and full control of proration.
- The Free plan's ₦1,000 overage implies Free companies may need a payment method. **This needs a product
  decision** (see Phase 0 audit, decision 5).

## Alternatives considered
- Paystack Plans with quantity: can't express overage plus add-ons cleanly.
- Flutterwave: comparable capability. Kept as the approved alternative adapter.
- Monnify: strong for bank transfers through dedicated accounts, but saved-card renewals may need extra
  account enablement. Not chosen.
- Stripe: limited support for Nigerian merchant onboarding and local payment methods.
