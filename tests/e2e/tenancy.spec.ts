import { devices, expect, test } from "@playwright/test";
import { createConfirmedUser, createWorkspaceAs, login, newSession } from "./helpers";

test("a user cannot open a workspace they don't belong to", async ({ browser }) => {
  const a = await createConfirmedUser("Amaka Alpha");
  const b = await createConfirmedUser("Bayo Bravo");
  await createWorkspaceAs(a.email, "Alpha Ltd");
  const bravo = await createWorkspaceAs(b.email, "Bravo Ltd");

  const page = await newSession(browser);
  await login(page, a.email);
  for (const path of [`/w/${bravo}`, `/w/${bravo}/members`, `/w/${bravo}/settings/company`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Workspace not found" })).toBeVisible();
    await expect(page.getByText("Bravo Ltd")).toHaveCount(0);
  }
});

test("an invited person joins a second workspace and switches between them", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Ope Owner");
  const person = await createConfirmedUser("Pat Person");
  const ownerSlug = await createWorkspaceAs(owner.email, "Owner Industries");
  const ownSlug = await createWorkspaceAs(person.email, "Person Ventures");

  // Owner invites the person as an Employee. Email isn't configured in CI, so
  // the app shows a copyable link instead of claiming it sent an email.
  const ownerPage = await newSession(browser);
  await login(ownerPage, owner.email);
  await ownerPage.goto(`/w/${ownerSlug}/members`);
  await ownerPage.getByRole("button", { name: "Invite people" }).click();
  await ownerPage.getByLabel("Email address").fill(person.email);
  await ownerPage.getByRole("button", { name: "Send invitation" }).click();
  const linkField = ownerPage.getByLabel("Invitation link");
  await expect(linkField).toBeVisible();
  const inviteLink = await linkField.inputValue();
  expect(inviteLink).toContain("/invite/");

  const personPage = await newSession(browser);
  await login(personPage, person.email);
  await personPage.goto(new URL(inviteLink).pathname);
  await personPage.getByRole("button", { name: /Accept and join Owner Industries/ }).click();
  await personPage.waitForURL(new RegExp(`/w/${ownerSlug}$`));

  // As an Employee there: employee portal, no administration.
  await expect(personPage.getByText("Your employee portal")).toBeVisible();
  const sidebar = personPage.getByRole("navigation", { name: "Workspace" }).first();
  await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "People" })).toHaveCount(0);
  await personPage.goto(`/w/${ownerSlug}/settings/departments`);
  await expect(personPage.getByText("You don't have access to this page")).toBeVisible();

  // Switch to their own workspace, where they are the Owner.
  await personPage.goto(`/w/${ownerSlug}`);
  await personPage
    .getByRole("button", { name: /Owner Industries/ })
    .first()
    .click();
  await personPage.getByRole("menuitem", { name: /Person Ventures/ }).click();
  await personPage.waitForURL(new RegExp(`/w/${ownSlug}$`));
  await expect(
    personPage.getByRole("heading", { name: "Welcome to Person Ventures" }),
  ).toBeVisible();
  await expect(
    personPage
      .getByRole("navigation", { name: "Workspace" })
      .first()
      .getByRole("link", { name: "Settings" }),
  ).toBeVisible();

  // The invitation link can't be reused.
  await personPage.goto(new URL(inviteLink).pathname);
  await expect(personPage.getByText("This invitation isn't valid")).toBeVisible();
});

test("employee portal is usable on a phone", async ({ browser }) => {
  const owner = await createConfirmedUser("Mobile Owner");
  const slug = await createWorkspaceAs(owner.email, "Mobile Co");
  const page = await newSession(browser, { ...devices["Pixel 7"] });
  await login(page, owner.email);
  await page.goto(`/w/${slug}`);
  const bottomNav = page.getByRole("navigation", { name: "Workspace" }).last();
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Profile" })).toBeVisible();
  // No horizontal scrolling at phone width.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
