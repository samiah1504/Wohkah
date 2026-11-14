/**
 * PRODUCT_LANGUAGE_AND_POSITIONING.md is enforced on what customers actually
 * see: the rendered text of public pages and signed-in screens (desktop and mobile).
 */
import { expect, test, type Page } from "@playwright/test";
import { DISALLOWED_TERMS } from "../../src/lib/copy/terms";
import { createConfirmedUser, createWorkspaceAs, login, newSession } from "./helpers";

const DISALLOWED: readonly RegExp[] = DISALLOWED_TERMS;

/** Deliberate uses that speak the customer's own words ("no HR department"). */
const ALLOWED_PHRASES = [/no HR department/gi, /an HR department/gi, /an HR manager/gi];

async function visibleTextIssues(page: Page): Promise<string[]> {
  let text = await page.locator("body").innerText();
  for (const phrase of ALLOWED_PHRASES) text = text.replace(phrase, "");
  return DISALLOWED.filter((re) => re.test(text)).map((re) => `${page.url()} matches ${re}`);
}

test("public pages use small-business language", async ({ page }) => {
  const issues: string[] = [];
  for (const path of [
    "/",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/login",
    "/register",
    "/forgot-password",
  ]) {
    await page.goto(path);
    // Open every FAQ so its answer text is checked too.
    for (const d of await page.locator("details").all())
      await d.evaluate((el) => el.setAttribute("open", ""));
    issues.push(...(await visibleTextIssues(page)));
  }
  expect(issues).toEqual([]);
});

test("signed-in screens use small-business language", async ({ browser }) => {
  const owner = await createConfirmedUser("Language Owner");
  const slug = await createWorkspaceAs(owner.email, "Language Lane Stores");
  const page = await newSession(browser);
  await login(page, owner.email);
  const issues: string[] = [];
  for (const path of [
    `/w/${slug}`,
    `/w/${slug}/members`,
    `/w/${slug}/roles`,
    `/w/${slug}/settings/company`,
    `/w/${slug}/settings/branches`,
    `/w/${slug}/settings/holidays`,
    `/w/${slug}/settings/subscription`,
    `/w/${slug}/settings/subscription/checkout?plan=growth`,
    `/w/${slug}/settings/work-locations`,
    `/w/${slug}/staff`,
    `/w/${slug}/staff/new`,
    `/w/${slug}/me`,
    `/w/${slug}/settings/audit`,
    "/account",
    "/onboarding",
    "/workspaces?all=1",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    issues.push(...(await visibleTextIssues(page)));
  }
  // Mobile layout: header, switcher and bottom navigation.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [`/w/${slug}`, `/w/${slug}/staff`, `/w/${slug}/settings/subscription`]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    issues.push(...(await visibleTextIssues(page)));
  }
  expect(issues).toEqual([]);
  // The roles page.
  await page.goto(`/w/${slug}/roles`);
  // Only Owner is built in; businesses name every other role themselves.
  await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
});
