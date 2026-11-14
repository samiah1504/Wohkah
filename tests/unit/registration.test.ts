import { describe, expect, it } from "vitest";
import { countryOptions, toE164 } from "@/lib/phone";
import { ACQUISITION_SOURCES, registerSchema } from "@/modules/identity/schemas";

const valid = {
  firstName: "Ada",
  lastName: "Okafor",
  email: "ada@example.com",
  phoneCountry: "NG",
  phone: "0803 123 4567",
  password: "Sunrise-Lagos-2026",
  terms: "on",
};

describe("phone numbers", () => {
  it("turns Nigerian local and international formats into E.164", () => {
    for (const input of ["0803 123 4567", "08031234567", "803 123 4567", "+234 803 123 4567"]) {
      expect(toE164("NG", input)).toBe("+2348031234567");
    }
  });
  it("validates numbers for other countries and rejects invalid ones", () => {
    expect(toE164("GB", "07911 123456")).toBe("+447911123456");
    expect(toE164("NG", "12345")).toBeNull();
    expect(toE164("NG", "not a number")).toBeNull();
    expect(toE164("XX", "08031234567")).toBeNull();
  });
  it("offers every country, with Nigeria first", () => {
    const list = countryOptions();
    expect(list[0]).toMatchObject({ code: "NG", dial: "+234", name: "Nigeria" });
    expect(list.length).toBeGreaterThan(200);
  });
});

describe("registration form rules", () => {
  it("accepts a complete form; marketing consent defaults to no", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.marketing).toBe(false);
    expect(r.success && r.data.acquisitionSource).toBeUndefined();
  });
  it("records optional marketing consent and acquisition source", () => {
    const r = registerSchema.safeParse({
      ...valid,
      marketing: "on",
      acquisitionSource: "whatsapp",
    });
    expect(r.success && r.data.marketing).toBe(true);
    expect(r.success && r.data.acquisitionSource).toBe("whatsapp");
  });
  it("requires the terms checkbox, both names and a strong password", () => {
    const fields = (input: Record<string, string>) => {
      const r = registerSchema.safeParse(input);
      return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
    };
    const { terms: _t, ...noTerms } = valid;
    expect(fields(noTerms)).toContain("terms");
    expect(fields({ ...valid, firstName: " " })).toContain("firstName");
    expect(fields({ ...valid, lastName: "" })).toContain("lastName");
    expect(fields({ ...valid, password: "short" })).toContain("password");
    expect(fields({ ...valid, email: "ada@" })).toContain("email");
    expect(fields({ ...valid, acquisitionSource: "billboard" })).toContain("acquisitionSource");
  });
  it("lists the ten approved acquisition options", () => {
    expect(ACQUISITION_SOURCES.map(([, l]) => l)).toEqual([
      "Instagram",
      "Facebook",
      "TikTok",
      "LinkedIn",
      "Google Search",
      "YouTube",
      "WhatsApp",
      "Referral from a friend",
      "Business community",
      "Other",
    ]);
  });
});
