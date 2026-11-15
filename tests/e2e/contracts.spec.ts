/**
 * Phase 3: contracts, electronic signing and job descriptions, end to end:
 * owner prepares a contract from a starter template, fills the blanks and
 * sends it; the staff member signs on a phone with an emailed code; the owner
 * signs for the business; the signed PDF is stored privately. Job
 * descriptions are published, assigned and confirmed.
 */
import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import { DISALLOWED_TERMS } from "../../src/lib/copy/terms";
import {
  createConfirmedUser,
  createWorkspaceAs,
  expectToast,
  latestEmailLink,
  latestSigningCode,
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

async function languageIssues(page: Page) {
  const text = await page.locator("body").innerText();
  return DISALLOWED_TERMS.filter((re) => re.test(text)).map((re) => `${page.url()} matches ${re}`);
}

async function ready(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Owner with a Starter business and one staff member linked to the staff portal. */
async function setUp(browser: Browser) {
  const owner = await createConfirmedUser("Contract Owner");
  const person = await createConfirmedUser("Kemi Baker");
  const slug = await createWorkspaceAs(owner.email, "Kemi Bakes Ltd");
  await setPlanFor(slug, "starter");
  const page = await newSession(browser);
  await login(page, owner.email);

  await ready(page, `/w/${slug}/staff/new`);
  await page.getByLabel("First name").fill("Kemi");
  await page.getByLabel("Last name").fill("Baker");
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Job title").fill("Baker");
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByText("Kemi Baker has been added.")).toBeVisible();
  const profile = page.url().split("?")[0]!;
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Invite to staff portal" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${person.email}.`)).toBeVisible();
  const invite = await latestEmailLink(person.email, "/invite/");

  const staffPage = await newSession(browser, { ...devices["Pixel 7"] });
  await login(staffPage, person.email);
  await staffPage.goto(new URL(invite).pathname);
  await staffPage.getByRole("button", { name: /Accept and join/ }).click();
  await staffPage.waitForURL(new RegExp(`/w/${slug}$`));
  return { owner, person, slug, page, staffPage, profile };
}

test("a contract is prepared from a template, signed by the staff member and the business, and stored", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const { owner, person, slug, page, staffPage } = await setUp(browser);

  // Start from a starter template.
  await ready(page, `/w/${slug}/documents/templates`);
  await expect(page.getByText(/not legal advice/)).toBeVisible();
  await capture(page, "templates");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Contract of employment" })
    .getByRole("link", { name: "Use this template" })
    .click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Template name")).toHaveValue("Contract of employment");
  await capture(page, "template-editor");
  await page.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByText("Template saved.")).toBeVisible();

  // Prepare a contract for Kemi.
  await ready(page, `/w/${slug}/documents/contracts/new`);
  await page.getByLabel("Staff member").selectOption({ label: "Kemi Baker · Baker" });
  await page.getByRole("button", { name: "Prepare document" }).click();
  await page.waitForURL(/\/documents\/contracts\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  const contractUrl = page.url();
  await expect(page.getByRole("heading", { name: /Fill in the blanks/ })).toBeVisible();
  await expect(page.getByText(/and save the draft first/)).toBeVisible();
  await capture(page, "contract-draft");
  // Staff details were filled in automatically.
  await expect(page.getByLabel("Document")).toHaveValue(/Kemi Baker/);
  const blanks = page.locator('input[name^="blank:"]');
  const count = await blanks.count();
  expect(count).toBeGreaterThan(3);
  for (let i = 0; i < count; i++) await blanks.nth(i).fill("To be agreed");
  await page.getByLabel("Monthly salary").fill("₦150,000");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectToast(page, "Draft saved.");
  await expect(page.getByRole("heading", { name: /Fill in the blanks/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Send for signing" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/Sent\. Kemi Baker can now sign it/)).toBeVisible();
  await expect(page.getByText("Waiting for signatures").first()).toBeVisible();
  await expect(page.getByText("₦150,000")).toBeVisible();

  // The staff member signs on a phone.
  await ready(staffPage, `/w/${slug}/me`);
  await expect(staffPage.getByRole("heading", { name: "Waiting for you" })).toBeVisible();
  await staffPage.getByRole("link", { name: "Review and sign" }).click();
  await staffPage.waitForLoadState("networkidle");
  await expect(staffPage.getByText("₦150,000")).toBeVisible();
  await expect(staffPage.getByLabel("Your full name")).toHaveValue("Kemi Baker");
  await staffPage.getByRole("checkbox", { name: /I have read this document/ }).check();
  const before = Date.now() - 1000;
  await staffPage.getByRole("button", { name: "Email me a code" }).click();
  await expect(staffPage.getByText(`Code sent to ${person.email}`)).toBeVisible();
  // A wrong code is refused and nothing is signed.
  await staffPage.getByLabel("6-digit code").fill("000000");
  await staffPage.getByRole("button", { name: "Sign document" }).click();
  await expect(staffPage.getByText(/That code isn't right/).first()).toBeVisible();
  const code = await latestSigningCode(person.email, before);
  await staffPage.getByLabel("6-digit code").fill(code);
  await capture(staffPage, "sign-phone");
  await staffPage.getByRole("button", { name: "Sign document" }).click();
  await expect(staffPage.getByText("You've signed this document.")).toBeVisible();
  const overflow = await staffPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The owner signs for the business, drawing the signature.
  await ready(page, `/w/${slug}/documents`);
  await expect(
    page.getByRole("heading", { name: /Waiting for you to sign for the business/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review and sign" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your full name").fill("Contract Owner");
  await page.getByRole("radio", { name: "Draw" }).click();
  const pad = page.getByRole("img", { name: "Draw your signature here" });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 80);
  await page.mouse.down();
  for (const [dx, dy] of <[number, number][]>[
    [60, 40],
    [120, 90],
    [180, 50],
    [240, 100],
  ]) {
    await page.mouse.move(box.x + dx, box.y + dy, { steps: 5 });
  }
  await page.mouse.up();
  await expect(page.getByText("Signature drawn.")).toBeVisible();
  await page.getByRole("checkbox", { name: /I have read this document/ }).check();
  const before2 = Date.now() - 1000;
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("6-digit code").fill(await latestSigningCode(owner.email, before2));
  await page.getByRole("button", { name: "Sign document" }).click();
  await expect(page.getByText(/Everyone has signed/)).toBeVisible();

  // The signed copy is stored privately and opens through a short-lived link.
  await page.goto(contractUrl);
  await expect(page.getByText("Signed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Signed copy with signing certificate saved")).toBeVisible();
  await capture(page, "contract-signed");
  const download = page.getByRole("link", { name: "Signed copy (PDF)" });
  const res = await page.request.get((await download.getAttribute("href"))!, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  const pdf = await page.request.get(res.headers().location!);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // The staff member sees it signed and can download it too.
  await ready(staffPage, `/w/${slug}/me?tab=contracts`);
  await expect(staffPage.getByText("Signed", { exact: true }).first()).toBeVisible();

  const issues: string[] = [];
  for (const p of [`/w/${slug}/documents`, `/w/${slug}/documents/templates`, contractUrl]) {
    await page.goto(p);
    issues.push(...(await languageIssues(page)));
  }
  expect(issues).toEqual([]);
});

test("job descriptions are published, assigned and confirmed by staff, again after each change", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const { slug, page, staffPage, profile } = await setUp(browser);

  await ready(page, `/w/${slug}/documents/job-descriptions/new`);
  await page.getByLabel("Job title").fill("Baker");
  await page
    .getByLabel("Job description")
    .fill("## Main duties\n- Bake bread by 6am\n- Keep the oven area clean");
  await page.getByRole("button", { name: "Save job description" }).click();
  await expect(page.getByText("Saved as version 1.")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("checkbox", { name: /Kemi Baker/ }).check();
  await page.getByRole("button", { name: "Save staff" }).click();
  await expectToast(page, /Staff updated/);
  await expect(page.getByText("Who has read it (0 of 1)")).toBeVisible();

  await ready(staffPage, `/w/${slug}/me`);
  await expect(staffPage.getByText("Your job description: Baker")).toBeVisible();
  await ready(staffPage, `/w/${slug}/me?tab=job`);
  await expect(staffPage.getByText("Bake bread by 6am")).toBeVisible();
  await capture(staffPage, "job-description-phone");
  await staffPage.getByRole("button", { name: "I've read it and understand" }).click();
  await expect(staffPage.getByText(/You confirmed version 1/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Who has read it (1 of 1)")).toBeVisible();

  // A change publishes version 2 and asks again.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel("Job description")
    .fill("## Main duties\n- Bake bread by 5am\n- Keep the oven area clean");
  await page.getByLabel("What changed? (optional)").fill("Earlier start");
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText("Saved as version 2.")).toBeVisible();
  await expect(page.getByText("Who has read it (0 of 1)")).toBeVisible();

  await ready(staffPage, `/w/${slug}/me?tab=job`);
  await expect(staffPage.getByText("Bake bread by 5am")).toBeVisible();
  await expect(
    staffPage.getByRole("button", { name: "I've read it and understand" }),
  ).toBeVisible();

  // The manager sees it on the staff record.
  await ready(page, `${profile}?tab=job`);
  await expect(page.getByText("Not confirmed yet (version 2).")).toBeVisible();
});

test("on the Free plan, contracts show what's needed to use them", async ({ browser }) => {
  const owner = await createConfirmedUser("Free Docs Owner");
  const slug = await createWorkspaceAs(owner.email, "Free Docs Shop");
  const page = await newSession(browser);
  await login(page, owner.email);
  await ready(page, `/w/${slug}/documents`);
  await expect(page.getByText(/Upgrade to Starter/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "New contract" })).toHaveCount(0);
});
