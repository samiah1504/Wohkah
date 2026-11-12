import { describe, expect, it } from "vitest";
import { passwordSchema } from "@/modules/identity/schemas";

describe("password rules (must match Supabase Auth settings)", () => {
  it("accepts 10+ characters with upper, lower, digit and symbol", () => {
    expect(passwordSchema.safeParse("Wohkah-Test-2026").success).toBe(true);
  });

  it.each([
    ["too short", "Ab1-short"],
    ["no symbol", "Wohkah2026Test"],
    ["no digit", "Wohkah-Test-Pass"],
    ["no uppercase", "wohkah-test-2026"],
    ["no lowercase", "WOHKAH-TEST-2026"],
  ])("rejects a password with %s", (_label, pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });
});
