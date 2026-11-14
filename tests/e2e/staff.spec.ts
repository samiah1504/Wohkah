/**
 * Phase 2: staff records. Add, profile, edit, private details, documents,
 * status changes, history, search and filters, download, the staff portal
 * invitation and the staff member's read-only "My record".
 */
import path from "node:path";
import { devices, expect, test, type Page } from "@playwright/test";
import { DISALLOWED_TERMS } from "../../src/lib/copy/terms";
import { createConfirmedUser, createWorkspaceAs, login, newSession } from "./helpers";

/** Saved for reviewing the look (uploaded by CI, not compared). */
async function capture(page: Page, name: string) {
  await page.screenshot({ path: `screen-captures/${name}.png`, fullPage: true });
}

async function languageIssues(page: Page) {
  const text = await page.locator("body").innerText();
  return DISALLOWED_TERMS.filter((re) => re.test(text)).map((re) => `${page.url()} matches ${re}`);
}

async function addStaff(
  page: Page,
  slug: string,
  s: { first: string; last: string; title?: string; email?: string; phone?: string },
) {
  await page.goto(`/w/${slug}/staff/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("First name").fill(s.first);
  await page.getByLabel("Last name").fill(s.last);
  if (s.email) await page.getByLabel("Email address").fill(s.email);
  if (s.phone) await page.getByRole("textbox", { name: "Phone number" }).fill(s.phone);
  if (s.title) await page.getByLabel("Job title").fill(s.title);
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByText(`${s.first} ${s.last} has been added.`)).toBeVisible();
  return page.url().split("?")[0]!;
}

test("an owner keeps a full staff record: add, edit, private details, documents, status and history", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const owner = await createConfirmedUser("Records Owner");
  const slug = await createWorkspaceAs(owner.email, "Records Ride Stores");
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/staff`);
  await expect(page.getByText("No staff yet")).toBeVisible();
  await capture(page, "staff-empty");

  // Validation keeps what was typed.
  await page.goto(`/w/${slug}/staff/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("First name").fill("Amaka");
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByText("Enter a last name.")).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveValue("Amaka");
  await capture(page, "staff-add-errors");

  const profile = await addStaff(page, slug, {
    first: "Amaka",
    last: "Eze",
    title: "Cashier",
    phone: "0803 123 4567",
  });
  await expect(page.getByRole("heading", { name: "Amaka Eze" })).toBeVisible();
  await expect(page.getByText("Staff no. 0001")).toBeVisible();
  await expect(page.getByText("+234 803 123 4567")).toBeVisible();
  await capture(page, "staff-profile");

  // Edit the job title.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Job title").fill("Head Cashier");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByText("Head Cashier").first()).toBeVisible();

  // Private details.
  await page.getByRole("link", { name: "Private details" }).click();
  await page.getByRole("link", { name: "Add private details" }).click();
  await page.getByLabel("Bank", { exact: true }).fill("Example Bank");
  await capture(page, "staff-private-form");
  await page.getByLabel("Account number").fill("12AB");
  await page.getByRole("button", { name: "Save private details" }).click();
  await expect(page.getByText(/digits only/)).toBeVisible();
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByLabel("Account name").fill("Amaka Eze");
  await page.getByRole("button", { name: "Save private details" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByText("0123456789")).toBeVisible();
  await capture(page, "staff-private-tab");

  // A document, stored privately and opened through a short-lived link.
  await page.getByRole("link", { name: "Documents" }).click();
  await page.getByRole("button", { name: "Add document" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("File").setInputFiles(path.resolve("tests/e2e/fixtures/contract.pdf"));
  await expect(dialog.getByLabel("Name")).toHaveValue("contract");
  await dialog.getByLabel("Name").fill("Employment contract");
  await dialog.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Employment contract")).toBeVisible();
  const open = page.getByRole("link", { name: /Open/ }).first();
  const href = await open.getAttribute("href");
  const res = await page.request.get(href!, { maxRedirects: 0 });
  await capture(page, "staff-documents");
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain("/storage/v1/object/sign/staff-documents/");

  // Status: on leave, then back.
  await page.goto(profile);
  await page.getByRole("button", { name: "Change status" }).click();
  await page.getByRole("radio", { name: "Mark as on leave" }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Change status" }).click();
  await expect(page.getByText("On leave").first()).toBeVisible();

  // History lists what happened, in plain words.
  await page.getByRole("link", { name: "History" }).click();
  for (const line of [
    "Added to the business",
    "Job title changed to Head Cashier",
    "Private details updated",
    "Document added: Employment contract",
    "Status changed from Active to On leave",
  ]) {
    await expect(page.getByText(line)).toBeVisible();
  }
  await capture(page, "staff-history");

  const issues: string[] = [];
  for (const tab of ["", "?tab=private", "?tab=documents", "?tab=history"]) {
    await page.goto(profile + tab);
    issues.push(...(await languageIssues(page)));
  }
  expect(issues).toEqual([]);
});

test("search, filters, pages and the staff list download", async ({ browser }) => {
  const owner = await createConfirmedUser("List Owner");
  const slug = await createWorkspaceAs(owner.email, "List Lane Ltd");
  const page = await newSession(browser);
  await login(page, owner.email);

  await addStaff(page, slug, { first: "Bola", last: "Ade", title: "Driver" });
  await addStaff(page, slug, { first: "Chidi", last: "Okafor", title: "Chef" });
  const third = await addStaff(page, slug, { first: "Dayo", last: "Bello", title: "=Danger" });
  await page.goto(third);
  await page.getByRole("button", { name: "Change status" }).click();
  await page.getByRole("radio", { name: "Record resignation" }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Change status" }).click();
  await expect(page.getByText("Resigned").first()).toBeVisible();

  await page.goto(`/w/${slug}/staff`);
  const table = page.getByRole("table");
  await expect(table.getByRole("link", { name: "Bola Ade" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Dayo Bello" })).toHaveCount(0);
  await capture(page, "staff-list");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "staff-list-phone");
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByRole("searchbox", { name: "Search staff" }).fill("chef");
  await page.waitForURL(/q=chef/);
  await expect(table.getByRole("link", { name: "Chidi Okafor" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Bola Ade" })).toHaveCount(0);

  await page.goto(`/w/${slug}/staff?status=left`);
  await expect(table.getByRole("link", { name: "Dayo Bello" })).toBeVisible();
  await page.goto(`/w/${slug}/staff?q=0002`);
  await expect(table.getByRole("link", { name: "Chidi Okafor" })).toBeVisible();
  await page.goto(`/w/${slug}/staff?q=nobody-here`);
  await expect(page.getByText("No staff match these filters.")).toBeVisible();

  // Download: all staff, formulas neutralised, no private details.
  await page.goto(`/w/${slug}/staff?status=all`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download list" }).click(),
  ]);
  const csv = await (
    await download.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString("utf8"));
  expect(csv).toContain('"Staff no.","First name"');
  expect(csv).toContain('"Bola","Ade"');
  expect(csv).toContain(`"'=Danger"`);
  expect(csv).not.toMatch(/account number|date of birth/i);
});

test("staff see their own record in the staff portal, and can't change it", async ({ browser }) => {
  const owner = await createConfirmedUser("Portal Owner");
  const person = await createConfirmedUser("Kemi Staff");
  const slug = await createWorkspaceAs(owner.email, "Portal Pantry");
  const page = await newSession(browser);
  await login(page, owner.email);
  const profile = await addStaff(page, slug, {
    first: "Kemi",
    last: "Staff",
    title: "Baker",
    email: person.email,
  });

  await page.getByRole("button", { name: "Invite to staff portal" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Send invitation" }).click();
  const linkField = page.getByLabel("Invitation link");
  await expect(linkField).toBeVisible();
  const invite = await linkField.inputValue();

  const staffPage = await newSession(browser, { ...devices["Pixel 7"] });
  await login(staffPage, person.email);
  await staffPage.goto(new URL(invite).pathname);
  await staffPage.getByRole("button", { name: /Accept and join Portal Pantry/ }).click();
  await staffPage.waitForURL(new RegExp(`/w/${slug}$`));

  await staffPage.goto(`/w/${slug}/me`);
  await expect(staffPage.getByRole("heading", { name: "Kemi Staff" })).toBeVisible();
  await expect(staffPage.getByText("Baker").first()).toBeVisible();
  await expect(staffPage.getByRole("button", { name: "Change status" })).toHaveCount(0);
  await expect(staffPage.getByRole("link", { name: "Edit" })).toHaveCount(0);
  // No horizontal scrolling on a phone.
  const overflow = await staffPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await capture(staffPage, "my-record-phone");

  // The staff list and other records stay closed.
  await staffPage.goto(`/w/${slug}/staff`);
  await expect(staffPage.getByText("You don't have access to this page")).toBeVisible();
  await staffPage.goto(profile.replace(/^https?:\/\/[^/]+/, ""));
  await expect(staffPage.getByText("You don't have access to this page")).toBeVisible();

  // The owner now sees the record linked.
  await page.goto(profile);
  await expect(page.getByText("Has a sign-in")).toBeVisible();
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Joined the staff portal")).toBeVisible();
});
