/**
 * Public website: navigation, calls to action, pricing, footer pages, SEO
 * files and mobile layout. Needs no database, so it also runs without
 * Supabase (e.g. `E2E_PORT=3100 pnpm test:e2e marketing`).
 */
import { devices, expect, test, type Page } from "@playwright/test";

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("the homepage explains WOHKAH and every call to action works", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Staff management software for small businesses/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Running a business is hard enough/ }),
  ).toBeVisible();
  await expect(page.getByText("No HR department required.")).toBeVisible();
  await expect(page.getByText("Preview with sample data.")).toBeVisible();

  // Header navigation scrolls to real sections.
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  for (const [label, id] of [
    ["Features", "features"],
    ["How It Works", "how-it-works"],
    ["Who It's For", "who-its-for"],
    ["Pricing", "pricing"],
    ["FAQs", "faqs"],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }

  // Primary calls to action lead to the real sign-up and login pages.
  await page.goto("/");
  await page.getByRole("link", { name: /Start Managing Your Staff/ }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.getByRole("link", { name: /Create Your Free Business Account/ }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("pricing shows the approved plans, trial and add-on prices", async ({ page }) => {
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");
  await expect(pricing.getByText("Start with a 7-day free trial. No card required.")).toBeVisible();
  for (const [name, monthly, yearly, staff] of [
    ["Free", "₦0", "₦0", "3 active staff"],
    ["Starter", "₦5,000", "₦50,000", "10 active staff"],
    ["Growth", "₦10,000", "₦100,000", "25 active staff"],
    ["Business", "₦15,000", "₦150,000", "50 active staff"],
  ] as const) {
    const card = pricing.getByRole("region", { name: `${name} plan` });
    await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(card.getByText(monthly, { exact: true })).toBeVisible();
    await expect(card.getByText(staff)).toBeVisible();
    await pricing.getByRole("radio", { name: "Yearly" }).click();
    await expect(card.getByText(yearly, { exact: true })).toBeVisible();
    await pricing.getByRole("radio", { name: "Monthly" }).click();
  }
  await expect(pricing.getByText("Scale", { exact: true })).toHaveCount(0);
  await expect(pricing.getByText(/custom domain/i)).toHaveCount(0);
  // 10 included + 5 extra on Starter: ₦5,000 + 5 × ₦1,000.
  await expect(pricing.getByText(/With 15 active staff you pay/)).toContainText("₦10,000");
  await expect(
    pricing.getByText(/Each extra location costs ₦1,000 a month or ₦12,000 a year/),
  ).toBeVisible();

  // Comparison table: every plan column, current plan not highlighted publicly.
  const table = pricing.getByRole("table", { name: /Compare what each WOHKAH plan includes/ });
  await expect(table.locator("thead").getByRole("columnheader")).toHaveCount(5);
  await expect(table.getByRole("rowheader", { name: /Active staff included/ })).toBeVisible();

  await pricing
    .getByRole("region", { name: "Growth plan" })
    .getByRole("link", { name: "Start free trial" })
    .click();
  await expect(page).toHaveURL(/\/register\?plan=growth$/);
});

test("unbuilt features are clearly marked and FAQs open", async ({ page }) => {
  await page.goto("/#features");
  await expect(page.locator("#features").getByText("Coming soon").first()).toBeVisible();
  const faq = page.locator("#faqs");
  await faq.getByText("How much does additional staff cost?").click();
  await expect(
    faq.getByText(/each additional active staff member costs ₦1,000 a month/),
  ).toBeVisible();
  await faq.getByText("Is there a free trial?").click();
  await expect(faq.getByText(/free for 7 days, with no card required/)).toBeVisible();
});

test("footer pages exist", async ({ page }) => {
  for (const [label, heading] of [
    ["About", /made for real small businesses/],
    ["Contact", /Talk to the WOHKAH team/],
    ["Privacy Policy", /Privacy Policy/],
    ["Terms of Service", /Terms of Service/],
  ] as const) {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText("A product of Crift Concepts");
});

test("search engines get a sitemap, robots rules and a sharing image", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/about");
  expect(sitemap).not.toContain("/w/");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/w\//);
  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("on a phone, the menu works and nothing scrolls sideways", async ({ browser }) => {
  const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
  const context = await browser.newContext(pixel);
  const page = await context.newPage();
  await page.goto("/");
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-menu");
  await menu.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(menu).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "Get Started" }).click();
  await expect(page).toHaveURL(/\/register$/);
  for (const path of ["/about", "/contact", "/privacy", "/terms"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await context.close();
});
