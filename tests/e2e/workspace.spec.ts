import { expect, test } from "@playwright/test";
import { createConfirmedUser, createWorkspaceAs, expectToast, login, newSession } from "./helpers";

test("an owner sets up departments, branches and holidays; changes are audited", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Sade Setup");
  const slug = await createWorkspaceAs(owner.email, "Setup Stores");
  const page = await newSession(browser);
  await login(page, owner.email);

  // Departments
  await page.goto(`/w/${slug}/settings/departments`);
  await page.getByRole("button", { name: "Add department" }).click();
  await page.getByLabel("Name").fill("Operations");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Department saved.");
  await expect(page.getByRole("cell", { name: "Operations", exact: true })).toBeVisible();

  // Branches: the Free plan allows one.
  await page.goto(`/w/${slug}/settings/branches`);
  await page.getByRole("button", { name: "Add branch" }).click();
  await page.getByLabel("Name").fill("Lagos HQ");
  await page.getByLabel("City").fill("Lagos");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Branch saved.");
  await expect(page.getByText("1 active of 1 allowed on the Free plan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add branch" })).toBeDisabled();
  await expect(page.getByText("You've reached your plan's limit of 1 branch")).toBeVisible();

  // Holidays
  await page.goto(`/w/${slug}/settings/holidays?year=2027`);
  await page.getByLabel("Date").fill("2027-10-01");
  await page.getByLabel("Holiday").fill("Independence Day");
  await page.getByRole("button", { name: "Add" }).click();
  await expectToast(page, "Holiday added.");
  await expect(page.getByRole("cell", { name: "Independence Day", exact: true })).toBeVisible();

  // Company profile validation and save
  await page.goto(`/w/${slug}/settings/company`);
  await page.getByLabel("Website").fill("not a url");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter a full web address")).toBeVisible();
  await page.getByLabel("Website").fill("https://setupstores.example");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, "Company profile saved.");

  // Audit log
  await page.goto(`/w/${slug}/settings/audit`);
  await expect(page.getByRole("cell", { name: "Department created" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Branch created" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Holiday created" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Company changed" }).first()).toBeVisible();

  // Home checklist reflects real data
  await page.goto(`/w/${slug}`);
  await expect(page.getByText("3 of 4 steps complete")).toBeVisible();
});

test("the Free plan's one-administrator limit is enforced", async ({ browser }) => {
  const owner = await createConfirmedUser("Limit Owner");
  const hire = await createConfirmedUser("Limit Hire");
  const slug = await createWorkspaceAs(owner.email, "Limit Logistics");

  const ownerPage = await newSession(browser);
  await login(ownerPage, owner.email);
  await ownerPage.goto(`/w/${slug}/members`);
  await ownerPage.getByRole("button", { name: "Invite people" }).click();
  await ownerPage.getByLabel("Email address").fill(hire.email);
  await ownerPage.getByLabel(/Staff Manager/).check();
  await ownerPage.getByRole("button", { name: "Send invitation" }).click();
  const link = await ownerPage.getByLabel("Invitation link").inputValue();

  const hirePage = await newSession(browser);
  await login(hirePage, hire.email);
  await hirePage.goto(new URL(link).pathname);
  await hirePage.getByRole("button", { name: /Accept and join/ }).click();
  await expect(hirePage.getByText("Your plan allows up to 1 administrator")).toBeVisible();
});

test("custom roles are not available on the Free plan", async ({ browser }) => {
  const owner = await createConfirmedUser("Roles Owner");
  const slug = await createWorkspaceAs(owner.email, "Roles Retail");
  const page = await newSession(browser);
  await login(page, owner.email);
  await page.goto(`/w/${slug}/roles`);
  await expect(page.getByText("Upgrade to Growth for custom roles and permissions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create role" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Staff Manager" })).toBeVisible();
});
