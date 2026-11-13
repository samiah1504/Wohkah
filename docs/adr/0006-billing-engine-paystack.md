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

## Implementation status (2026-11-13)

**Stage 1, complete (subscription infrastructure):**
- Prices and allowances are data (`subscription_plans`, `plan_features`); `public.subscription_quote()`
  prices every checkout. The browser total is a preview only.
- `public.create_checkout_invoice()` creates a `billing_invoices` row with a unique `WHK-…` reference
  and line items. It grants nothing.
- `public.apply_verified_payment()` is the **only** path that marks an invoice paid and changes the
  plan. It is executable by `service_role` only, checks amount and currency against the invoice, and
  is idempotent per provider reference (`payment_transactions`).
- Trials, reminders, expiry to Free, scheduled downgrades and the staff selection are implemented and
  tested in `tests/db/subscriptions.test.ts`.

**Stage 2, written but not yet verified (required before commercial launch):**
- `src/lib/payments/paystack.ts`: initialise and verify transactions, HMAC-SHA512 webhook signature
  check (constant time). Live keys are refused unless `PAYSTACK_LIVE_APPROVED=true`.
- `POST /api/webhooks/paystack`: signature check, stored once in `webhook_events`, re-verified with
  Paystack's API, then `apply_verified_payment()`. A transient failure returns 503 so Paystack retries.
- `GET /api/billing/paystack/callback`: verifies the reference on the server before showing
  "Payment confirmed"; the redirect alone proves nothing.
- Without `PAYSTACK_SECRET_KEY`, "Proceed to Payment" prepares the invoice and says online payment
  isn't connected in this environment. Nothing is charged and nothing changes.
- Not yet built: saved-authorisation renewals (`charge_authorization`), pre-charge notices, past-due and
  grace handling, refunds. Renewal today is a new checkout from the subscription page ("Renew").

The Free-plan overage question in the consequences below is resolved: Free cannot buy extra staff.

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
