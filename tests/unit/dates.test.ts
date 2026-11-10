import { describe, expect, it } from "vitest";
import { formatDate, todayIn } from "@/lib/dates";

describe("dates", () => {
  it("uses the company's time zone for 'today'", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Lagos (UTC+1).
    const now = new Date("2026-12-31T23:30:00Z");
    expect(todayIn("Africa/Lagos", now)).toBe("2027-01-01");
    expect(todayIn("UTC", now)).toBe("2026-12-31");
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatDate("2027-01-01", { day: "numeric", month: "short" })).toBe("1 Jan");
  });
});
