import { describe, expect, it } from "vitest";
import { PLANS, entitlement, FEATURE_KEYS, naira } from "@/lib/plans/catalog";
import { extraLocationsNeeded, extraStaffNeeded, quote, QuoteError } from "@/lib/plans/quote";
import { limitMessage, featureUpgradeMessage } from "@/lib/entitlements";

const plan = (code: string) => PLANS.find((p) => p.code === code)!;

describe("approved plans", () => {
  it("four plans at ₦0 / ₦5,000 / ₦10,000 / ₦15,000, yearly = 10 months", () => {
    expect(
      PLANS.map((p) => [p.code, p.monthlyMinor / 100, p.annualMinor && p.annualMinor / 100]),
    ).toEqual([
      ["free", 0, null],
      ["starter", 5000, 50000],
      ["growth", 10000, 100000],
      ["business", 15000, 150000],
    ]);
  });

  it("staff included 3/10/25/50; extra staff only on paid plans, ₦1,000/month or ₦12,000/year", () => {
    expect(PLANS.map((p) => p.includedStaff)).toEqual([3, 10, 25, 50]);
    expect(PLANS.map((p) => p.extraStaff.allowed)).toEqual([false, true, true, true]);
    for (const p of PLANS) {
      expect(p.extraStaff.monthlyMinor).toBe(100_000);
      expect(p.extraStaff.annualMinor).toBe(1_200_000);
      expect(p.extraWorkLocation.monthlyMinor).toBe(100_000);
      expect(p.extraWorkLocation.annualMinor).toBe(1_200_000);
    }
  });

  it("limits: locations 1/2/5/10, admins 1/2/5/10, branches 1/2/5/10; no department limit", () => {
    const row = (k: Parameters<typeof entitlement>[1]) =>
      PLANS.map((p) => entitlement(p.code, k).limit);
    expect(row("work_locations")).toEqual([1, 2, 5, 10]);
    expect(row("admins")).toEqual([1, 2, 5, 10]);
    expect(row("branches")).toEqual([1, 2, 5, 10]);
    // Branches and work locations are separate entitlements.
    expect(FEATURE_KEYS).not.toContain("departments");
    expect(row("storage_mb")).toEqual([500, 5120, 20480, 51200]);
  });

  it("Free keeps GPS clock-in but not full onboarding or job descriptions", () => {
    expect(entitlement("free", "gps_clock_in").enabled).toBe(true);
    expect(entitlement("free", "advanced_onboarding").enabled).toBe(false);
    expect(entitlement("free", "job_descriptions").enabled).toBe(false);
    expect(entitlement("starter", "job_descriptions").enabled).toBe(true);
  });

  it("each plan includes everything in the plan below it", () => {
    const keys = [
      "gps_clock_in",
      "full_salaries",
      "staff_performance",
      "advanced_analytics",
    ] as const;
    for (const k of keys) {
      const on = PLANS.map((p) => entitlement(p.code, k).enabled);
      expect(on.indexOf(true)).toBeGreaterThanOrEqual(0);
      expect(on.slice(on.indexOf(true)).every(Boolean)).toBe(true);
    }
  });
});

describe("quotes", () => {
  it("approved examples", () => {
    expect(naira(quote("starter", "monthly", 0, 3).totalMinor)).toBe(naira(800_000)); // ₦8,000
    expect(naira(quote("growth", "monthly", 0, 4).totalMinor)).toBe(naira(1_400_000)); // ₦14,000
    expect(quote("business", "annual", 1, 1).totalMinor).toBe(15_000_000 + 1_200_000 + 1_200_000);
    expect(extraStaffNeeded(plan("business"), 51)).toBe(1);
    expect(extraLocationsNeeded(10, 11)).toBe(1);
    expect(extraLocationsNeeded(null, 99)).toBe(0);
  });

  it("refuses extra staff on Free and yearly Free", () => {
    expect(() => quote("free", "monthly", 1, 0)).toThrow(QuoteError);
    expect(() => quote("free", "annual", 0, 0)).toThrow(QuoteError);
  });
});

describe("upgrade prompts explain what, why, which plan, price and how", () => {
  it("limits", () => {
    expect(limitMessage("branches", 1, "Free")).toBe(
      "The Free plan allows up to 1 branch. Starter includes 2 branches for ₦5,000 a month. Upgrade from Settings → Subscription.",
    );
    expect(limitMessage("branches", 5, "Growth")).toBe(
      "The Growth plan allows up to 5 branches. Business includes 10 branches for ₦15,000 a month. Upgrade from Settings → Subscription.",
    );
    // Business is the highest plan: no upgrade is invented.
    expect(limitMessage("branches", 10, "Business")).toBe(
      "The Business plan allows up to 10 branches.",
    );
  });
  it("features", () => {
    expect(featureUpgradeMessage("digital_contracts", "Free")).toMatch(
      /Digital employment contracts and signatures isn't included in the Free plan\. It's available on Starter and higher, from ₦5,000 a month/,
    );
  });
});
