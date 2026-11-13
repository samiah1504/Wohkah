/**
 * The code catalogue (src/lib/plans/catalog.ts) drives everything customers
 * see; the database drives what is enforced. These tests fail if the two
 * differ in any plan, price, allowance or feature, so the pricing page,
 * comparison table and subscription page always match the backend.
 */
import { afterAll, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions";
import { FEATURE_KEYS, PLANS, PLAN_CODES, entitlement } from "@/lib/plans/catalog";
import { SYSTEM_ROLE_COPY } from "@/lib/copy/terms";
import { asAdmin, createCompany, createUser, pool } from "./helpers";

afterAll(() => pool.end());

describe("catalogues match the database", () => {
  it("permission keys", async () => {
    const keys = await asAdmin(async (db) =>
      (await db.query<{ key: string }>("select key from public.permissions")).rows.map(
        (r) => r.key,
      ),
    );
    expect([...keys].sort()).toEqual([...PERMISSIONS].sort());
  });

  it("feature keys", async () => {
    const keys = await asAdmin(async (db) =>
      (await db.query<{ key: string }>("select key from public.features")).rows.map((r) => r.key),
    );
    expect([...keys].sort()).toEqual([...FEATURE_KEYS].sort());
  });

  it("plans on sale: prices, staff, add-ons, trial, support, report history", async () => {
    const rows = await asAdmin(
      async (db) =>
        (
          await db.query(
            `select code, name, monthly_price_minor, annual_price_minor, included_employees,
                  allows_extra_staff, extra_employee_price_minor, extra_staff_annual_price_minor,
                  allows_extra_work_locations, extra_work_location_price_minor,
                  extra_work_location_annual_price_minor, trial_days, support_level,
                  report_history_months
           from public.subscription_plans where is_public and is_active order by sort_order`,
          )
        ).rows,
    );
    expect(
      rows.map((r) => ({
        code: r.code,
        name: r.name,
        monthlyMinor: Number(r.monthly_price_minor),
        annualMinor: r.annual_price_minor === null ? null : Number(r.annual_price_minor),
        includedStaff: r.included_employees,
        extraStaff: {
          allowed: r.allows_extra_staff,
          monthlyMinor: Number(r.extra_employee_price_minor),
          annualMinor: Number(r.extra_staff_annual_price_minor),
        },
        extraWorkLocation: {
          allowed: r.allows_extra_work_locations,
          monthlyMinor: Number(r.extra_work_location_price_minor),
          annualMinor: Number(r.extra_work_location_annual_price_minor),
        },
        trialDays: r.trial_days,
        supportLevel: r.support_level,
        reportHistoryMonths: r.report_history_months,
      })),
    ).toEqual(
      PLANS.map((p) => ({
        code: p.code,
        name: p.name,
        monthlyMinor: p.monthlyMinor,
        annualMinor: p.annualMinor,
        includedStaff: p.includedStaff,
        extraStaff: p.extraStaff,
        extraWorkLocation: p.extraWorkLocation,
        trialDays: p.trialDays,
        supportLevel: p.supportLevel,
        reportHistoryMonths: p.reportHistoryMonths,
      })),
    );
  });

  it("every feature and limit on every plan on sale", async () => {
    const rows = await asAdmin(
      async (db) =>
        (
          await db.query<{
            code: string;
            feature_key: string;
            enabled: boolean;
            limit_value: number | null;
          }>(
            `select p.code, pf.feature_key, pf.enabled, pf.limit_value
           from public.plan_features pf join public.subscription_plans p on p.id = pf.plan_id
           where p.is_public and p.is_active`,
          )
        ).rows,
    );
    const mismatches: string[] = [];
    for (const code of PLAN_CODES) {
      for (const key of FEATURE_KEYS) {
        const db = rows.find((r) => r.code === code && r.feature_key === key);
        const want = entitlement(code, key);
        const got = db
          ? { enabled: db.enabled, limit: db.enabled ? db.limit_value : want.limit }
          : null;
        if (!got || got.enabled !== want.enabled || (want.enabled && got.limit !== want.limit)) {
          mismatches.push(`${code}.${key}: db=${JSON.stringify(got)} code=${JSON.stringify(want)}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("Scale is withdrawn but kept for history", async () => {
    const scale = await asAdmin(
      async (db) =>
        (
          await db.query(
            "select is_public, is_active from public.subscription_plans where code = 'scale'",
          )
        ).rows,
    );
    expect(scale).toEqual([{ is_public: false, is_active: false }]);
  });

  it("every plan (including withdrawn ones) defines every feature", async () => {
    const missing = await asAdmin(
      async (db) =>
        (
          await db.query(
            `select p.code, f.key from public.subscription_plans p cross join public.features f
           where not exists (select 1 from public.plan_features pf
                             where pf.plan_id = p.id and pf.feature_key = f.key)`,
          )
        ).rows,
    );
    expect(missing).toEqual([]);
  });

  it("new workspaces get the system role names and descriptions from src/lib/copy", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const roles = await asAdmin(
      async (db) =>
        (
          await db.query<{ system_key: string; name: string; description: string }>(
            "select system_key, name, description from public.roles where company_id = $1",
            [company.id],
          )
        ).rows,
    );
    for (const r of roles) {
      const copy = SYSTEM_ROLE_COPY[r.system_key as keyof typeof SYSTEM_ROLE_COPY];
      expect({ name: r.name, description: r.description }).toEqual(copy);
    }
  });
});
