import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { activeSection, bottomBarFor, navigationFor, type NavSection } from "@/lib/navigation";

const slug = "acme";
const owner = navigationFor({ slug, permissions: new Set(PERMISSIONS), hasStaffRecord: true });
const manager = navigationFor({
  slug,
  permissions: new Set<Permission>(["staff.view", "staff.manage", "job_descriptions.manage"]),
  hasStaffRecord: true,
});
const staff = navigationFor({ slug, permissions: new Set(), hasStaffRecord: true });

const keys = (s: NavSection[]) => s.map((x) => x.key);

/** Does an href (/w/acme/staff/new?tab=x) match a page in src/app? */
function routeExists(href: string): boolean {
  const path = href.split("?")[0]!;
  if (path === "/account") return existsSync("src/app/(user)/account/page.tsx");
  if (path === "/contact") return existsSync("src/app/(marketing)/contact/page.tsx");
  const rest = path.replace(/^\/w\/acme/, "");
  const dir = join("src/app/w/[slug]", rest);
  return existsSync(join(dir, "page.tsx"));
}

describe("business navigation", () => {
  it("gives the owner the six sections, in the agreed order", () => {
    expect(keys(owner)).toEqual(["home", "people", "salaries", "settings", "work", "more"]);
    expect(owner.find((s) => s.key === "salaries")?.label).toBe("Salary Management");
  });

  it("doesn't show Salary Management to managers without salary access", () => {
    expect(keys(manager)).not.toContain("salaries");
    expect(keys(manager)).toEqual(["home", "people", "settings", "work", "more"]);
  });

  it("gives staff a simple staff portal", () => {
    expect(staff.map((s) => s.label)).toEqual([
      "Home",
      "My Work",
      "My Attendance",
      "My Salary",
      "More",
    ]);
    const all = staff.flatMap((s) => s.children);
    // Nothing that manages other people.
    expect(all.some((c) => /staff directory|team access|roles|subscription/i.test(c.label))).toBe(
      false,
    );
  });

  it("shows at most five items in the phone bar, with Settings under More", () => {
    for (const nav of [owner, manager, staff]) {
      const bar = bottomBarFor(nav);
      expect(bar.length).toBeLessThanOrEqual(5);
      expect(keys(bar)).not.toContain("settings");
    }
    expect(bottomBarFor(owner).map((s) => s.shortLabel)).toEqual([
      "Home",
      "People",
      "Salary",
      "Work",
      "More",
    ]);
    expect(owner.find((s) => s.key === "more")!.children.some((c) => c.key === "settings")).toBe(
      true,
    );
  });

  it("only offers pages a person may use", () => {
    const people = manager.find((s) => s.key === "people")!.children.map((c) => c.key);
    expect(people).toContain("directory");
    expect(people).not.toContain("contracts"); // no contracts access
    const settings = manager.find((s) => s.key === "settings")!.children.map((c) => c.key);
    expect(settings).not.toContain("subscription");
    expect(settings).not.toContain("access");
  });

  it("every link leads to a page that exists; unbuilt modules are never links", () => {
    for (const nav of [owner, manager, staff]) {
      for (const s of nav) {
        expect(routeExists(s.href), s.href).toBe(true);
        for (const c of s.children) if (c.href) expect(routeExists(c.href), c.href).toBe(true);
      }
    }
    const soon = owner
      .flatMap((s) => s.children)
      .filter((c) => !c.href)
      .map((c) => c.key);
    expect(soon).toEqual(
      expect.arrayContaining(["tasks", "meetings", "records", "attendance", "leave"]),
    );
  });

  it("marks the right section as current", () => {
    expect(activeSection(owner, "/w/acme")).toBe("home");
    expect(activeSection(owner, "/w/acme/staff/123")).toBe("people");
    expect(activeSection(owner, "/w/acme/documents/templates")).toBe("people");
    expect(activeSection(owner, "/w/acme/members")).toBe("settings");
    expect(activeSection(owner, "/w/acme/settings/branches")).toBe("settings");
    expect(activeSection(owner, "/w/acme/me")).toBe("more");
    expect(activeSection(staff, "/w/acme/attendance")).toBe("attendance");
    expect(activeSection(staff, "/w/acme/work")).toBe("work");
  });
});
