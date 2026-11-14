import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  admin,
  createConfirmedUser,
  latestEmailLink,
  login,
  newSession,
  testEmail,
} from "./helpers";

test("a new user registers, confirms their email and creates a business account", async ({
  browser,
}) => {
  const page = await newSession(browser);
  const email = testEmail("founder");

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(
    page.getByText(
      "Start your 7-day free trial and experience a better way to manage your business and your people.",
    ),
  ).toBeVisible();
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Founder");
  await page.getByLabel("Email address").fill(email);
  await expect(page.getByLabel("Country")).toHaveValue("NG");
  await page.getByLabel("Phone number").fill("0803 123 4567");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("How did you hear about WOHKAH? (optional)").selectOption("whatsapp");
  await page.getByRole("checkbox", { name: /I agree to the General Terms of Use/ }).check();
  await page.getByRole("checkbox", { name: /product updates, business tips/ }).check();
  await page.getByRole("button", { name: "Start my free trial" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Open the confirmation link from the local mail catcher, in the same browser.
  const link = await latestEmailLink(email, "/auth/v1/verify");
  await page.goto(link);
  await page.waitForURL(/\/onboarding/);

  const company = `Founder Foods ${Date.now()}`;
  await page.getByLabel("Company name").fill(company);
  await page.getByRole("button", { name: "Create your business account" }).click();
  await page.waitForURL(/\/w\/[a-z0-9-]+\?welcome=1/);
  await expect(page.getByText("Your business account is ready")).toBeVisible();
  // Business setup started with the 7-day trial selected.
  await expect(page.getByText("Your 7-day free trial has started.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Welcome to ${company}` })).toBeVisible();
  await expect(page.getByText("Owner").first()).toBeVisible();
});

test("registration: details are saved, consent is separate and E.164 phone is stored", async ({
  browser,
}) => {
  const page = await newSession(browser);
  const email = testEmail("details");
  await page.goto("/register");
  // Wait for the form to be interactive: a country picked before then is reset.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("First name").fill("Bola");
  await page.getByLabel("Last name").fill("Adeyemi");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Country").selectOption("GH");
  await page.getByLabel("Phone number").fill("024 123 4567");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("How did you hear about WOHKAH? (optional)").selectOption("other");
  await page.getByLabel("Please tell us where").fill("A radio advert");
  await page.getByRole("checkbox", { name: /I agree to the General Terms of Use/ }).check();
  // Marketing consent left unticked.
  await page.getByRole("button", { name: "Start my free trial" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = users.users.find((u) => u.email === email)!;
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, full_name, phone")
    .eq("id", user.id)
    .single();
  expect(profile).toEqual({
    first_name: "Bola",
    last_name: "Adeyemi",
    full_name: "Bola Adeyemi",
    phone: "+233241234567",
  });
  const { data: reg } = await admin
    .from("user_registrations")
    .select("acquisition_source, acquisition_detail, terms_accepted_at, marketing_consent")
    .eq("user_id", user.id)
    .single();
  expect(reg?.acquisition_source).toBe("other");
  expect(reg?.acquisition_detail).toBe("A radio advert");
  expect(reg?.terms_accepted_at).toBeTruthy();
  expect(reg?.marketing_consent).toBe(false);
});

test("registration form: validation, password visibility, phone and required consent", async ({
  page,
}) => {
  await page.goto("/register");
  const submit = page.getByRole("button", { name: "Start my free trial" });

  // Empty form: every required field explains itself, nothing is sent.
  await submit.click();
  for (const message of [
    "Enter your first name.",
    "Enter your last name.",
    "Enter your email address.",
    "Enter your phone number.",
    "Choose a password.",
    "Please agree to the General Terms of Use and Privacy Policy to continue.",
  ]) {
    await expect(page.getByText(message)).toBeVisible();
  }
  await expect(page).toHaveURL(/\/register/);

  // Email and phone are checked.
  await page.getByLabel("Email address").fill("ada@");
  await page.getByLabel("Phone number").fill("12345");
  await submit.click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("Enter a valid phone number for the country you picked."),
  ).toBeVisible();

  // Password: requirements tick off, and show/hide keeps what was typed.
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("Sunrise-Lagos-2026");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("Sunrise-Lagos-2026");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("Sunrise-Lagos-2026");

  // Consent: the terms box starts unticked and links to the policies; marketing is optional.
  const terms = page.getByRole("checkbox", { name: /I agree to the General Terms of Use/ });
  await expect(terms).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /product updates, business tips/ }),
  ).not.toBeChecked();
  await expect(page.getByRole("link", { name: "General Terms of Use" })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy",
  );

  // "Other" reveals a detail field.
  await expect(page.getByLabel("Please tell us where")).toHaveCount(0);
  await page.getByLabel("How did you hear about WOHKAH? (optional)").selectOption("other");
  await expect(page.getByLabel("Please tell us where")).toBeVisible();

  // Existing sign-in link.
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("sign-in errors don't reveal whether an account exists", async ({ browser }) => {
  const page = await newSession(browser);
  const user = await createConfirmedUser("Bola Login");

  await page.goto("/login");
  await expect(page.getByText("Sign in to your WOHKAH account.")).toBeVisible();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

  await page.getByLabel("Email address").fill(testEmail("nobody"));
  await page.getByLabel("Password").fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(testEmail("nobody"));
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
  await page.getByLabel("Email address").fill(user.email);
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
