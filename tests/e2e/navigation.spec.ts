/**
 * The business navigation: six sections on desktop (collapsible sidebar),
 * five items on phones, built from each person's access, and honest about
 * modules that aren't built yet.
 */
import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import {
  admin,
  createConfirmedUser,
  createWorkspaceAs,
  latestEmailLink,
  login,
  newSession,
  setPlanFor,
} from "./helpers";

test.use({ actionTimeout: 15_000, navigationTimeout: 20_000 });

async function capture(page: Page, name: string) {
  await page
    .screenshot({ path: `screen-captures/${name}.png`, fullPage: true, timeout: 10_000 })
    .catch(() => undefined);
}

/** Invite someone, then give them a business-defined role with the given access. */
async function addPerson(
  browser: Browser,
  page: Page,
  slug: string,
  label: string,
  permissions: string[],
) {
  const person = await createConfirmedUser(label);
  await page.goto(`/w/${slug}/members`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Invite people" }).click();
  await page.getByLabel("Email address").fill(person.email);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${person.email}.`)).toBeVisible();
  const invite = await latestEmailLink(person.email, "/invite/");
  const other = await newSession(browser);
  await login(other, person.email);
  await other.goto(new URL(invite).pathname);
  await other.getByRole("button", { name: /Accept and join/ }).click();
  await other.waitForURL(new RegExp(`/w/${slug}$`));
  if (permissions.length) {
    const { data: company } = await admin.from("companies").select("id").eq("slug", slug).single();
    const { data: member } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", company!.id)
      .eq("user_id", person.id)
      .single();
    const { data: role } = await admin
      .from("roles")
      .insert({ company_id: company!.id, name: `${label} role` })
      .select("id")
      .single();
    await admin
      .from("role_permissions")
      .insert(
        permissions.map((p) => ({ company_id: company!.id, role_id: role!.id, permission_key: p })),
      );
    const { error } = await admin.from("member_roles").insert({
      company_id: company!.id,
      member_id: member!.id,
      role_id: role!.id,
      scope_type: "company",
    });
    if (error) throw error;
  }
  return { person, page: other };
}

test("owners get six sections in a collapsible sidebar, with hubs that are honest about what's coming", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Nav Owner");
  const slug = await createWorkspaceAs(owner.email, "Navigation Naija Ltd");
  const page = await newSession(browser, { viewport: { width: 1366, height: 900 } });
  await login(page, owner.email);
  await page.goto(`/w/${slug}`);
  await page.waitForLoadState("networkidle");
  await capture(page, "home-owner-desktop");

  const sidebar = page.getByRole("navigation", { name: "Business" }).first();
  const sections = ["Home", "People", "Salary Management", "Settings", "Work", "More"];
  for (const name of sections)
    await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();

  // Nested pages appear under the current section.
  await sidebar.getByRole("link", { name: "People", exact: true }).click();
  await expect(page.getByRole("heading", { name: "People", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Staff directory" })).toBeVisible();
  await capture(page, "people-hub");

  // Unbuilt modules are labelled, never links.
  const attendance = page.locator("[aria-disabled]").filter({ hasText: "Attendance" }).first();
  await expect(attendance).toContainText("Coming soon");
  await expect(page.getByRole("link", { name: /^Attendance/ })).toHaveCount(0);

  await sidebar.getByRole("link", { name: "Salary Management", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Salary Management" })).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.locator("main").getByRole("link")).toHaveCount(0);

  await sidebar.getByRole("link", { name: "Settings", exact: true }).click();
  for (const group of ["Company", "Team", "Account"])
    await expect(page.getByRole("heading", { name: group, exact: true })).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: /Who can sign in/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/w/${slug}/members$`));

  // The setup guide lives on its own page, reachable from Settings.
  await page.goto(`/w/${slug}/settings`);
  await page
    .locator("main")
    .getByRole("link", { name: /The steps to get your business ready/ })
    .click();
  await expect(page.getByRole("heading", { name: "Setup guide" })).toBeVisible();
  await expect(page.getByText(/of 6 steps done/)).toBeVisible();

  // Notifications.
  await page
    .getByRole("button", { name: /^Notifications/ })
    .first()
    .click();
  await expect(page.getByRole("menu").getByText("Notifications", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // Collapse to icons, and remember it.
  await page.getByRole("button", { name: "Collapse menu" }).click();
  await expect(page.getByRole("button", { name: "Expand menu" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand menu" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "People", exact: true })).toBeVisible(); // still reachable by name
  await capture(page, "sidebar-collapsed");
  await page.getByRole("button", { name: "Expand menu" }).click();

  // Phone: five items, Settings in More.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${slug}`);
  const bar = page.getByRole("navigation", { name: "Business" }).last();
  await expect(bar.getByRole("link")).toHaveText(["Home", "People", "Salary", "Work", "More"]);
  await capture(page, "home-owner-phone");
});

test("a manager without salary access never sees Salary Management, and staff get their own portal", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Nav Owner Two");
  const slug = await createWorkspaceAs(owner.email, "Two Roles Ventures");
  await setPlanFor(slug, "starter");
  const page = await newSession(browser);
  await login(page, owner.email);

  const { page: managerPage } = await addPerson(browser, page, slug, "Shift Supervisor", [
    "staff.view",
  ]);
  await managerPage.goto(`/w/${slug}`);
  const managerNav = managerPage.getByRole("navigation", { name: "Business" }).first();
  await expect(managerNav.getByRole("link", { name: "People", exact: true })).toBeVisible();
  await expect(
    managerNav.getByRole("link", { name: "Salary Management", exact: true }),
  ).toHaveCount(0);
  await managerPage.goto(`/w/${slug}/salaries`);
  await expect(managerPage.getByText("You don't have access to this page")).toBeVisible();
  await managerPage.goto(`/w/${slug}/settings/subscription`);
  await expect(managerPage.getByText("You don't have access to this page")).toBeVisible();

  const { person: staffPerson, page: staffDesk } = await addPerson(
    browser,
    page,
    slug,
    "Shop Assistant",
    [],
  );
  await staffDesk.close();
  const staffPhone = await newSession(browser, { ...devices["Pixel 7"] });
  await login(staffPhone, staffPerson.email);
  await staffPhone.goto(`/w/${slug}`);
  const bar = staffPhone.getByRole("navigation", { name: "Business" }).last();
  await expect(bar.getByRole("link")).toHaveText([
    "Home",
    "My Work",
    "Attendance",
    "Salary",
    "More",
  ]);
  await expect(staffPhone.getByRole("heading", { name: "Waiting for you" })).toBeVisible();
  await capture(staffPhone, "home-staff-phone");
  await bar.getByRole("link", { name: "Salary" }).click();
  await expect(staffPhone.getByRole("heading", { name: "My Salary" })).toBeVisible();
  await expect(staffPhone.getByText("Coming soon").first()).toBeVisible();
  for (const path of ["people", "settings", "documents"]) {
    await staffPhone.goto(`/w/${slug}/${path}`);
    await expect(staffPhone.getByText("You don't have access to this page")).toBeVisible();
  }
  const overflow = await staffPhone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
