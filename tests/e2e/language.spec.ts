/**
 * PRODUCT_LANGUAGE_AND_POSITIONING.md is enforced on what customers actually
 * see: the rendered text of public pages and workspace screens.
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
  for (const path of ["/", "/about", "/contact", "/privacy", "/terms", "/login", "/register"]) {
    await page.goto(path);
    // Open every FAQ so its answer text is checked too.
    for (const d of await page.locator("details").all())
      await d.evaluate((el) => el.setAttribute("open", ""));
    issues.push(...(await visibleTextIssues(page)));
  }
  expect(issues).toEqual([]);
});

test("workspace screens use small-business language", async ({ browser }) => {
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
    `/w/${slug}/settings/departments`,
    `/w/${slug}/settings/branches`,
    `/w/${slug}/settings/holidays`,
    `/w/${slug}/settings/subscription`,
    `/w/${slug}/settings/subscription/checkout?plan=growth`,
    `/w/${slug}/settings/work-locations`,
    `/w/${slug}/staff`,
    `/w/${slug}/settings/audit`,
    "/account",
    "/onboarding",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    issues.push(...(await visibleTextIssues(page)));
  }
  expect(issues).toEqual([]);
  // The renamed roles are what customers see.
  await page.goto(`/w/${slug}/roles`);
  await expect(page.getByRole("columnheader", { name: "Staff Manager" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Staff Member" })).toBeVisible();
});
