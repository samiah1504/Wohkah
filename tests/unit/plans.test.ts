import { describe, expect, it } from "vitest";
import { PLANS, monthlyEstimateMinor, naira } from "@/lib/plans";

const plan = (code: string) => PLANS.find((p) => p.code === code)!;

describe("public plans", () => {
  it("prices annual plans at 10 months of the monthly price", () => {
    for (const p of PLANS.filter((x) => x.annualMinor !== null)) {
      expect(p.annualMinor).toBe(p.monthlyMinor * 10);
    }
  });

  it("charges ₦1,000 per active staff member above the included number (approved example)", () => {
    // Starter: ₦12,500 + 5 × ₦1,000 = ₦17,500 for 15 active staff.
    expect(naira(monthlyEstimateMinor(plan("starter"), 15))).toBe(naira(1750000));
    expect(monthlyEstimateMinor(plan("starter"), 10)).toBe(1250000);
    expect(monthlyEstimateMinor(plan("free"), 3)).toBe(0);
    expect(monthlyEstimateMinor(plan("free"), 5)).toBe(200000);
  });
});
