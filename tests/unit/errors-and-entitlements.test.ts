import { describe, expect, it } from "vitest";
import { userMessageFor } from "@/lib/errors";
import { assertFeature, assertLimit, EntitlementError, limitOf } from "@/lib/entitlements";
import { can, requirePermission, ForbiddenError } from "@/lib/permissions";
import { safeNextPath } from "@/lib/auth/safe-next";

const freeCtx = {
  plan: { code: "free", name: "Free" },
  features: {
    admins: { enabled: true, limit: 1 },
    custom_roles: { enabled: false, limit: null },
    branches: { enabled: true, limit: 1 },
    work_locations: { enabled: true, limit: null },
  },
};

describe("entitlements", () => {
  it("reports limits; null means unlimited, a disabled feature means 0", () => {
    expect(limitOf(freeCtx, "admins")).toBe(1);
    expect(limitOf(freeCtx, "work_locations")).toBeNull();
    expect(limitOf(freeCtx, "custom_roles")).toBe(0);
    expect(limitOf(freeCtx, "advanced_reporting")).toBe(0);
  });

  it("refuses the item that would exceed a limit", () => {
    expect(() => assertLimit(freeCtx, "branches", 0)).not.toThrow();
    expect(() => assertLimit(freeCtx, "branches", 1)).toThrow(EntitlementError);
    expect(() => assertLimit(freeCtx, "work_locations", 999)).not.toThrow();
  });

  it("refuses features outside the plan with an upgrade message", () => {
    expect(() => assertFeature(freeCtx, "custom_roles")).toThrow(/isn't included in the Free plan/);
  });
});

describe("permissions", () => {
  it("checks membership of the permission set", () => {
    const ctx = { permissions: new Set(["members.view"] as const) };
    expect(can(ctx, "members.view")).toBe(true);
    expect(can(ctx, "roles.manage")).toBe(false);
    expect(() => requirePermission(ctx, "roles.manage")).toThrow(ForbiddenError);
  });
});

describe("userMessageFor", () => {
  it("turns plan-limit errors into upgrade messages", () => {
    expect(userMessageFor({ message: "plan_limit_exceeded:admins:1" })).toBe(
      "Your plan allows up to 1 administrator. Starter includes 2 administrators for ₦5,000 a month. Upgrade from Settings → Subscription.",
    );
    expect(userMessageFor({ message: "plan_limit_exceeded:branches:1" })).toMatch(
      /^Your plan allows up to 1 branch\. Starter includes 2 branches for ₦5,000 a month\./,
    );
    expect(userMessageFor({ message: "staff_limit_exceeded:3" })).toMatch(/3 active staff/);
    expect(userMessageFor({ message: "work_location_limit_exceeded:2" })).toMatch(
      /covers 2 work locations\. Add another for ₦1,000 a month/,
    );
  });

  it("maps known RPC errors and Postgres codes", () => {
    expect(userMessageFor({ message: "slug_taken" })).toMatch(/already taken/);
    expect(userMessageFor({ code: "42501", message: "new row violates row-level security" })).toBe(
      "You don't have permission to do that.",
    );
  });

  it("never leaks internal SQL details for unknown errors", () => {
    expect(
      userMessageFor({ code: "XX000", message: 'relation "public.secret_table" does not exist' }),
    ).toBe("Something went wrong. Please try again.");
  });
});

describe("safeNextPath", () => {
  it("allows same-site relative paths only", () => {
    expect(safeNextPath("/w/acme/settings")).toBe("/w/acme/settings");
    expect(safeNextPath("//evil.example")).toBe("/workspaces");
    expect(safeNextPath("https://evil.example")).toBe("/workspaces");
    expect(safeNextPath("/\\evil.example")).toBe("/workspaces");
    expect(safeNextPath(undefined, "/onboarding")).toBe("/onboarding");
  });
});
