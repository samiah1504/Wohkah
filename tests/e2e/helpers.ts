import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !publishable || !secret) {
  throw new Error("E2E tests need .env.local with the local Supabase URL and keys.");
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  throw new Error("E2E tests only run against a local Supabase stack, never a hosted project.");
}

/** Test-only admin client: creates confirmed users so tests don't depend on email. */
export const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const PASSWORD = "Wohkah-Test-2026";

export function uniq(): string {
  return randomUUID().slice(0, 8);
}

export function testEmail(label: string): string {
  return `${label}-${uniq()}@e2e.wohkah.test`;
}

export async function createConfirmedUser(fullName: string) {
  const email = testEmail(fullName.toLowerCase().replace(/\W+/g, "-"));
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return { id: data.user.id, email, fullName };
}

/** Create a workspace through the real API path (PostgREST + RLS), as that user. */
export async function createWorkspaceAs(email: string, name: string) {
  const client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  const slug = `e2e-${uniq()}`;
  const { error } = await client.rpc("create_company", { p_name: name, p_slug: slug });
  if (error) throw error;
  return slug;
}

/**
 * A fresh browser context with its own client IP, so the app's per-IP rate
 * limits don't throttle the suite (all tests come from one machine).
 */
export async function newSession(
  browser: Browser,
  opts: Parameters<Browser["newContext"]>[0] = {},
) {
  const ip = `10.${randomBytes(1)[0]}.${randomBytes(1)[0]}.${(randomBytes(1)[0]! % 250) + 1}`;
  const context = await browser.newContext({
    ...opts,
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
  return context.newPage();
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Most recent email to `to` in the local Mailpit inbox (supabase start). */
export async function latestEmailLink(to: string, contains: string): Promise<string> {
  const mailpit = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    if (res.ok) {
      const body = (await res.json()) as { messages?: { ID: string }[] };
      const id = body.messages?.[0]?.ID;
      if (id) {
        const msg = (await (await fetch(`${mailpit}/api/v1/message/${id}`)).json()) as {
          Text?: string;
          HTML?: string;
        };
        const haystack = `${msg.Text ?? ""}\n${msg.HTML ?? ""}`.replace(/&amp;/g, "&");
        const link = haystack.match(/https?:\/\/[^\s"'<>)]+/g)?.find((l) => l.includes(contains));
        if (link) return link;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} containing a link with "${contains}"`);
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
