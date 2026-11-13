/**
 * Subscription journeys: trial, staff allowance, work locations, checkout
 * without payment credentials, trial expiry with too many staff, reactivation.
 * Payment success itself is covered by database tests (service-role fixture),
 * never by simulating a payment in the app.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  createConfirmedUser,
  createWorkspaceAs,
  expectToast,
  login,
  newSession,
} from "./helpers";

async function companyId(slug: string) {
  const { data, error } = await admin.from("companies").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id as string;
}

async function addStaff(page: Page, name: string) {
  await page.getByRole("button", { name: "Add staff" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Add staff" }).click();
  await expectToast(page, "Staff member added.");
}

test("Free plan: 3 active staff, the 4th is blocked with an upgrade prompt", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Free Staff Owner");
  const slug = await createWorkspaceAs(owner.email, "Three Staff Shop");
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/staff`);
  for (const name of ["Ada One", "Bayo Two", "Chi Three"]) await addStaff(page, name);
  await expect(page.getByText("3 of 3 active staff places in use.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add staff" })).toBeDisabled();
  await expect(page.getByText("The Free plan includes 3 active staff")).toBeVisible();
  await expect(page.getByRole("link", { name: "Upgrade to Starter" })).toBeVisible();
});

test("an owner starts a 7-day trial and sees it on the subscription page", async ({ browser }) => {
  const owner = await createConfirmedUser("Trial Owner");
  const slug = await createWorkspaceAs(owner.email, "Trial Traders");
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/settings/subscription`);
  await expect(page.getByText("Free plan", { exact: true })).toBeVisible();
  const growth = page.getByRole("heading", { name: "Growth", exact: true }).locator("xpath=../..");
  await growth.getByRole("button", { name: "Start 7-day free trial" }).click();
  await expect(page.getByText("Your 7-day free trial has started. No card needed.")).toBeVisible();
  await expect(page.getByText(/7 days left in your free trial/)).toBeVisible();
  await expect(page.getByText("Growth plan", { exact: true })).toBeVisible();
  // One trial per workspace.
  await expect(page.getByRole("button", { name: /free trial/ })).toHaveCount(0);
});

test("checkout without payment credentials charges nothing and changes nothing", async ({
  browser,
}) => {
  test.skip(
    Boolean(process.env.PAYSTACK_SECRET_KEY),
    "Only meaningful when Paystack isn't configured.",
  );
  const owner = await createConfirmedUser("Checkout Owner");
  const slug = await createWorkspaceAs(owner.email, "Checkout Co");
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/settings/subscription/checkout?plan=starter`);
  await page.getByRole("radio", { name: /Yearly/ }).check();
  await page.getByLabel("Extra active staff").fill("2");
  await expect(page.getByText("Total per year")).toBeVisible();
  // ₦50,000 + 2 × ₦12,000
  await page.getByRole("button", { name: "Proceed to Payment (₦74,000)" }).click();
  await expect(
    page.getByText(/Online payment isn't connected in this environment yet/),
  ).toBeVisible();
  await expect(page.getByText(/nothing has been charged/)).toBeVisible();

  await page.goto(`/w/${slug}/settings/subscription`);
  await expect(page.getByText("Free plan", { exact: true })).toBeVisible();
  await expect(page.getByText("Awaiting payment")).toBeVisible();
});

test("work locations: one on Free, then a prompt to add more", async ({ browser }) => {
  const owner = await createConfirmedUser("Location Owner");
  const slug = await createWorkspaceAs(owner.email, "Location Lane");
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/settings/work-locations`);
  await page.getByRole("button", { name: "Add work location" }).click();
  await page.getByLabel("Name").fill("Ikeja shop");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Work location saved.");
  await expect(page.getByRole("button", { name: "Add work location" })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: /Add a work location \(₦1,000\/month\)/ }),
  ).toBeVisible();
});

test("trial expiry with more than 3 staff: choose who stays, pause the rest, reactivate later", async ({
  browser,
}) => {
  const owner = await createConfirmedUser("Expiry Owner");
  const slug = await createWorkspaceAs(owner.email, "Expiry Express");
  const id = await companyId(slug);
  const page = await newSession(browser);
  await login(page, owner.email);

  await page.goto(`/w/${slug}/settings/subscription`);
  const starter = page
    .getByRole("heading", { name: "Starter", exact: true })
    .locator("xpath=../..");
  await starter.getByRole("button", { name: "Start 7-day free trial" }).click();
  await expect(page.getByText("Your 7-day free trial has started. No card needed.")).toBeVisible();

  await page.goto(`/w/${slug}/staff`);
  for (const name of ["Ada", "Bola", "Chidi", "Dayo", "Ese"]) await addStaff(page, name);

  // The trial runs out (test fixture moves the end date into the past).
  const { error } = await admin
    .from("company_subscriptions")
    .update({ trial_ends_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("company_id", id);
  if (error) throw error;

  await page.goto(`/w/${slug}/staff`);
  // TEMP diagnostic for CI
  await page.waitForLoadState("networkidle");
  console.log(
    "DIAG staff page after expiry:\n" + (await page.locator("body").innerText()).slice(0, 2500),
  );
  await expect(page.getByText(/more active staff \(5\) than your plan covers \(3\)/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose who stays active" })).toBeVisible();
  for (const name of ["Dayo", "Ese"]) await page.getByRole("checkbox", { name }).uncheck();
  await page.getByRole("checkbox", { name: "Ada" }).check();
  await page.getByRole("button", { name: "Keep selected staff active" }).click();
  await expect(page.getByText(/2 staff members are now paused/)).toBeVisible();
  await expect(page.getByText("Paused because of the plan limit (2)")).toBeVisible();
  await expect(page.getByText(/There are no free staff places/)).toBeVisible();

  // After buying capacity (recorded by the verified-payment path in production;
  // here a fixture sets the paid state directly), paused staff can return.
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("code", "starter")
    .single();
  await admin
    .from("company_subscriptions")
    .update({
      plan_id: plan!.id,
      status: "active",
      billing_interval: "monthly",
      current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    })
    .eq("company_id", id);
  await page.reload();
  await page.getByRole("checkbox", { name: "Dayo" }).check();
  await page.getByRole("checkbox", { name: "Ese" }).check();
  await page.getByRole("button", { name: "Reactivate selected" }).click();
  await expect(page.getByText("2 staff members reactivated.")).toBeVisible();
  await expect(page.getByText("5 of 10 active staff places in use.")).toBeVisible();
});
