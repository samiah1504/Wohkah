import { getPlan, type BillingInterval, type Plan } from "./catalog";

/**
 * Subscription price: plan price + extra staff + extra work locations.
 *
 * Mirrors public.subscription_quote() in the database, which is what checkout
 * invoices use. tests/db/subscriptions.test.ts checks both give the same
 * totals. Never trust a total sent by the browser.
 */
export type QuoteLine = {
  item: "plan" | "extra_staff" | "extra_work_locations";
  quantity: number;
  unitMinor: number;
  amountMinor: number;
};
export type Quote = {
  plan: Plan;
  interval: BillingInterval;
  lines: QuoteLine[];
  totalMinor: number;
};

export class QuoteError extends Error {}

export function quote(
  planCode: string,
  interval: BillingInterval,
  extraStaff = 0,
  extraWorkLocations = 0,
): Quote {
  const plan = getPlan(planCode);
  if (!plan) throw new QuoteError("Unknown plan.");
  const staff = Math.max(0, Math.floor(extraStaff));
  const locations = Math.max(0, Math.floor(extraWorkLocations));
  if (staff > 0 && !plan.extraStaff.allowed) {
    throw new QuoteError(
      `Extra staff aren't available on the ${plan.name} plan. Upgrade to a paid plan.`,
    );
  }
  if (locations > 0 && !plan.extraWorkLocation.allowed) {
    throw new QuoteError(`Extra work locations aren't available on the ${plan.name} plan.`);
  }
  const annual = interval === "annual";
  const base = annual ? plan.annualMinor : plan.monthlyMinor;
  if (base === null) throw new QuoteError(`The ${plan.name} plan has no yearly option.`);
  const staffUnit = annual ? plan.extraStaff.annualMinor : plan.extraStaff.monthlyMinor;
  const locationUnit = annual
    ? plan.extraWorkLocation.annualMinor
    : plan.extraWorkLocation.monthlyMinor;
  const lines: QuoteLine[] = [
    { item: "plan", quantity: 1, unitMinor: base, amountMinor: base },
    { item: "extra_staff", quantity: staff, unitMinor: staffUnit, amountMinor: staff * staffUnit },
    {
      item: "extra_work_locations",
      quantity: locations,
      unitMinor: locationUnit,
      amountMinor: locations * locationUnit,
    },
  ];
  return { plan, interval, lines, totalMinor: lines.reduce((s, l) => s + l.amountMinor, 0) };
}

/** Extra staff a business would need to pay for, given its active staff. */
export function extraStaffNeeded(plan: Plan, activeStaff: number): number {
  return Math.max(0, activeStaff - plan.includedStaff);
}

export function extraLocationsNeeded(includedLocations: number | null, locations: number): number {
  return includedLocations === null ? 0 : Math.max(0, locations - includedLocations);
}
