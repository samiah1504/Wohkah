/**
 * Subscription plans as shown on the public pricing section.
 *
 * Source of truth is the database (migration 20261110000400). This typed copy
 * lets the marketing site render without a database call, and
 * tests/db/catalog.test.ts fails if the two ever differ.
 */
export type PublicPlan = {
  code: "free" | "starter" | "growth" | "business" | "scale";
  name: string;
  /** Kobo per month. */
  monthlyMinor: number;
  /** Kobo per year (10 × monthly); null for Free. */
  annualMinor: number | null;
  includedStaff: number;
  /** Kobo per additional active staff member per month. */
  extraStaffMinor: number;
  forWho: string;
};

export const PLANS: readonly PublicPlan[] = [
  {
    code: "free",
    name: "Free",
    monthlyMinor: 0,
    annualMinor: null,
    includedStaff: 3,
    extraStaffMinor: 100000,
    forWho: "For very small teams getting organised. Free forever.",
  },
  {
    code: "starter",
    name: "Starter",
    monthlyMinor: 1250000,
    annualMinor: 12500000,
    includedStaff: 10,
    extraStaffMinor: 100000,
    forWho: "For small businesses that need professional staff management.",
  },
  {
    code: "growth",
    name: "Growth",
    monthlyMinor: 2950000,
    annualMinor: 29500000,
    includedStaff: 25,
    extraStaffMinor: 100000,
    forWho: "For businesses managing more staff, departments and routines.",
  },
  {
    code: "business",
    name: "Business",
    monthlyMinor: 5950000,
    annualMinor: 59500000,
    includedStaff: 50,
    extraStaffMinor: 100000,
    forWho: "For businesses with several branches and busier operations.",
  },
  {
    code: "scale",
    name: "Scale",
    monthlyMinor: 10950000,
    annualMinor: 109500000,
    includedStaff: 100,
    extraStaffMinor: 100000,
    forWho: "For larger organisations that need more control and configuration.",
  },
];

export function naira(minor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/** Monthly bill (excluding any applicable taxes): plan price + ₦1,000 per active staff member above the included number. */
export function monthlyEstimateMinor(plan: PublicPlan, activeStaff: number): number {
  return plan.monthlyMinor + Math.max(0, activeStaff - plan.includedStaff) * plan.extraStaffMinor;
}
