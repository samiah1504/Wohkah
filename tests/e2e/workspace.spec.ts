import { expect, test } from "@playwright/test";
import { createConfirmedUser, createWorkspaceAs, expectToast, login, newSession } from "./helpers";

test("an owner sets up branches and holidays; changes are audited", async ({ browser }) => {
  const owner = await createConfirmedUser("Sade Setup");
  const slug = await createWorkspaceAs(owner.email, "Setup Stores");
  const page = await newSession(browser);
  await login(page, owner.email);

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
  await expect(page.getByRole("link", { name: "Upgrade to Starter" })).toBeVisible();
  // Departments are no longer part of WOHKAH.
  await expect(page.getByRole("link", { name: "Departments" })).toHaveCount(0);

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
  await expect(page.getByRole("cell", { name: "Branch created" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Holiday created" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Company changed" }).first()).toBeVisible();

  // Home checklist reflects real data
  await page.goto(`/w/${slug}`);
  await expect(page.getByText("2 of 3 steps complete")).toBeVisible();
});

test("the Free plan's one-administrator limit is enforced", async ({ browser }) => {
  const owner = await createConfirmedUser("Limit Owner");
  const hire = await createConfirmedUser("Limit Hire");
  const slug = await createWorkspaceAs(owner.email, "Limit Logistics");

  const ownerPage = await newSession(browser);
  await login(ownerPage, owner.email);
  // The business creates its own role and gives it some access.
  await ownerPage.goto(`/w/${slug}/roles`);
  await ownerPage.getByRole("button", { name: "Create role" }).click();
  await ownerPage.getByLabel("Role name").fill("Supervisor");
  await ownerPage.getByRole("button", { name: "Save" }).click();
  await expectToast(ownerPage, "Role saved.");
  await ownerPage.getByRole("button", { name: "Edit access" }).click();
  await ownerPage.getByLabel("See who has access and their roles").check();
  await ownerPage.getByRole("button", { name: "Save" }).click();
  await expectToast(ownerPage, "Access updated.");

  await ownerPage.goto(`/w/${slug}/members`);
  await ownerPage.getByRole("button", { name: "Invite people" }).click();
  await ownerPage.getByLabel("Email address").fill(hire.email);
  await ownerPage.getByLabel(/Supervisor/).check();
  await ownerPage.getByRole("button", { name: "Send invitation" }).click();
  const link = await ownerPage.getByLabel("Invitation link").inputValue();

  const hirePage = await newSession(browser);
  await login(hirePage, hire.email);
  await hirePage.goto(new URL(link).pathname);
  await hirePage.getByRole("button", { name: /Accept and join/ }).click();
  await expect(hirePage.getByText("Your plan allows up to 1 administrator")).toBeVisible();
});

test("any plan can create, rename and delete its own roles; Owner is the only built-in role", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Roles Owner");
  const slug = await createWorkspaceAs(owner.email, "Roles Retail");
  const page = await newSession(browser);
  await login(page, owner.email);
  await page.goto(`/w/${slug}/roles`);
  // A new business starts with the Owner role only.
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(2); // "Access" + Owner

  await page.getByRole("button", { name: "Create role" }).click();
  await page.getByLabel("Role name").fill("Cashier");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Role saved.");
  await expect(page.getByRole("columnheader", { name: "Cashier" })).toBeVisible();

  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Role name").fill("Head Cashier");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Role saved.");
  await expect(page.getByRole("columnheader", { name: "Head Cashier" })).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expectToast(page, "Role deleted.");
  await expect(page.getByRole("columnheader", { name: "Head Cashier" })).toHaveCount(0);
});
