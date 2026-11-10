/**
 * The TypeScript catalogues used by the UI must match the database exactly.
 * A permission or feature added by a migration without updating the code (or
 * the reverse) fails here.
 */
import { afterAll, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions";
import { FEATURES } from "@/lib/entitlements";
import { asAdmin, pool } from "./helpers";

afterAll(() => pool.end());

describe("catalogues", () => {
  it("permission keys match the permissions table", async () => {
    const keys = await asAdmin(async (db) =>
      (await db.query<{ key: string }>("select key from public.permissions")).rows.map(
        (r) => r.key,
      ),
    );
    expect([...keys].sort()).toEqual([...PERMISSIONS].sort());
  });

  it("feature keys match the features table", async () => {
    const keys = await asAdmin(async (db) =>
      (await db.query<{ key: string }>("select key from public.features")).rows.map((r) => r.key),
    );
    expect([...keys].sort()).toEqual([...FEATURES].sort());
  });

  it("every plan defines every feature", async () => {
    const missing = await asAdmin(
      async (db) =>
        (
          await db.query<{ code: string; key: string }>(
            `select p.code, f.key from public.subscription_plans p cross join public.features f
           where not exists (
             select 1 from public.plan_features pf where pf.plan_id = p.id and pf.feature_key = f.key
           )`,
          )
        ).rows,
    );
    expect(missing).toEqual([]);
  });

  it("stores the approved prices (kobo) and ₦1,000 per extra employee on every plan", async () => {
    const plans = await asAdmin(
      async (db) =>
        (
          await db.query<{
            code: string;
            monthly: string;
            annual: string | null;
            included: number;
            extra: string;
          }>(
            `select code, monthly_price_minor as monthly, annual_price_minor as annual,
                  included_employees as included, extra_employee_price_minor as extra
           from public.subscription_plans order by sort_order`,
          )
        ).rows,
    );
    expect(plans).toEqual([
      { code: "free", monthly: "0", annual: null, included: 3, extra: "100000" },
      { code: "starter", monthly: "1250000", annual: "12500000", included: 10, extra: "100000" },
      { code: "growth", monthly: "2950000", annual: "29500000", included: 25, extra: "100000" },
      { code: "business", monthly: "5950000", annual: "59500000", included: 50, extra: "100000" },
      { code: "scale", monthly: "10950000", annual: "109500000", included: 100, extra: "100000" },
    ]);
    for (const p of plans.filter((x) => x.annual)) {
      expect(Number(p.annual)).toBe(Number(p.monthly) * 10);
    }
  });
});
