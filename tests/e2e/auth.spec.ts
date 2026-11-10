import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  createConfirmedUser,
  latestEmailLink,
  login,
  newSession,
  testEmail,
} from "./helpers";

test("a new user registers, confirms their email and creates a workspace", async ({ browser }) => {
  const page = await newSession(browser);
  const email = testEmail("founder");

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Ada Founder");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Open the confirmation link from the local mail catcher, in the same browser.
  const link = await latestEmailLink(email, "/auth/v1/verify");
  await page.goto(link);
  await page.waitForURL(/\/onboarding/);

  const company = `Founder Foods ${Date.now()}`;
  await page.getByLabel("Company name").fill(company);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(/\/w\/[a-z0-9-]+\?welcome=1/);
  await expect(page.getByText("Your workspace is ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Welcome to ${company}` })).toBeVisible();
  await expect(page.getByText("Owner").first()).toBeVisible();
});

test("sign-in errors don't reveal whether an account exists", async ({ browser }) => {
  const page = await newSession(browser);
  const user = await createConfirmedUser("Bola Login");

  await page.goto("/login");
  await page.getByLabel("Work email").fill(user.email);
  await page.getByLabel("Password").fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

  await page.getByLabel("Work email").fill(testEmail("nobody"));
  await page.getByLabel("Password").fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

  await page.goto("/forgot-password");
  await page.getByLabel("Work email").fill(testEmail("nobody"));
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
});

test("private pages require sign-in and sign-out ends the session", async ({ browser }) => {
  const page = await newSession(browser);
  await page.goto("/workspaces");
  await expect(page).toHaveURL(/\/login\?next=%2Fworkspaces/);

  const user = await createConfirmedUser("Chidi Session");
  await login(page, user.email);
  await expect(page).toHaveURL(/\/onboarding|\/workspaces/);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("password reset link lets the user choose a new password", async ({ browser }) => {
  const page = await newSession(browser);
  const user = await createConfirmedUser("Dayo Reset");

  await page.goto("/forgot-password");
  await page.getByLabel("Work email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible();

  const link = await latestEmailLink(user.email, "/auth/v1/verify");
  await page.goto(link);
  await page.waitForURL(/\/reset-password/);
  const newPassword = "Brand-New-Pass-42";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Your password has been updated.")).toBeVisible();

  const fresh = await newSession(browser);
  await login(fresh, user.email, newPassword);
  await expect(fresh).not.toHaveURL(/\/login/);
});
