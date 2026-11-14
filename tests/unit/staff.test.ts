import { describe, expect, it } from "vitest";
import { privateSchema, staffSchema } from "@/modules/staff/schemas";
import { csvCell } from "@/lib/csv";
import { STATUS_ACTIONS, describeHistory, staffNo } from "@/lib/copy/staff";

const base = { firstName: "Ada", lastName: "Obi", employmentType: "full_time" };

describe("staff form", () => {
  it("stores phone numbers in international format", () => {
    const r = staffSchema.parse({ ...base, phoneCountry: "NG", phone: "0803 123 4567" });
    expect(r.phone).toBe("+2348031234567");
  });

  it("rejects an invalid phone number and a bad email address", () => {
    expect(staffSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
    expect(staffSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("turns empty optional fields into nothing", () => {
    const r = staffSchema.parse({ ...base, email: "", jobTitle: " ", branchId: "", reportsTo: "" });
    expect(r).toMatchObject({ email: null, jobTitle: null, branchId: null, reportsTo: null });
  });

  it("doesn't let someone report to themselves", () => {
    const id = "6f1c1b0e-3c39-4d0e-9a52-6a1f4c7b8e21";
    expect(staffSchema.safeParse({ ...base, id, reportsTo: id }).success).toBe(false);
  });
});

describe("private details form", () => {
  const id = "6f1c1b0e-3c39-4d0e-9a52-6a1f4c7b8e21";

  it("accepts account numbers with spaces and keeps the digits", () => {
    expect(privateSchema.parse({ id, bankAccountNumber: "0123 456 789" }).bankAccountNumber).toBe(
      "0123456789",
    );
    expect(privateSchema.safeParse({ id, bankAccountNumber: "12AB" }).success).toBe(false);
  });

  it("refuses a date of birth in the future", () => {
    expect(privateSchema.safeParse({ id, dateOfBirth: "2999-01-01" }).success).toBe(false);
    expect(privateSchema.safeParse({ id, dateOfBirth: "1990-05-01" }).success).toBe(true);
  });
});

describe("staff list download", () => {
  it("quotes cells and neutralises spreadsheet formulas", () => {
    expect(csvCell('Ada "AJ" Obi')).toBe('"Ada ""AJ"" Obi"');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
    expect(csvCell("+2348031234567")).toBe('"+2348031234567"');
  });
});

describe("staff wording", () => {
  it("pads staff numbers", () => {
    expect(staffNo(7)).toBe("0007");
  });

  it("offers only status changes the database allows", () => {
    // Mirrors app.staff_status_allowed(): no jump from active straight to archived.
    expect(STATUS_ACTIONS.active?.map((a) => a.to)).not.toContain("archived");
    expect(STATUS_ACTIONS.archived?.map((a) => a.to)).toEqual(["resigned"]);
    expect(STATUS_ACTIONS.plan_suspended).toBeUndefined();
  });

  it("describes history in plain words", () => {
    expect(
      describeHistory({ event: "status_changed", details: { from: "active", to: "on_leave" } }),
    ).toMatch(/On leave/);
  });
});
