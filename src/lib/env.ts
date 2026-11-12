import "server-only";
import { z } from "zod";

/**
 * Server-side configuration, validated once. Secrets in here never reach the
 * browser: only NEXT_PUBLIC_* values are bundled for the client.
 *
 * Supabase key names: new projects use publishable/secret keys; older ones use
 * anon/service_role. Both are accepted.
 */
const schema = z.object({
  supabaseUrl: z.url().optional(),
  supabasePublishableKey: z.string().min(20).optional(),
  supabaseSecretKey: z.string().min(20).optional(),
  appUrl: z.url().default("http://localhost:3000"),
  rootDomain: z.string().min(1).default("localhost:3000"),
  resendApiKey: z.string().min(10).optional(),
  emailFrom: z.string().default("WOHKAH <no-reply@wohkah.com>"),
  /** Public contact address shown on the website. */
  contactEmail: z.email().optional(),
});

function read() {
  const e = process.env;
  const blank = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : undefined);
  return schema.parse({
    supabaseUrl: blank(e.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey:
      blank(e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? blank(e.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseSecretKey: blank(e.SUPABASE_SECRET_KEY) ?? blank(e.SUPABASE_SERVICE_ROLE_KEY),
    // Tolerate a trailing slash ("https://x.app/") so links never get "//".
    appUrl: blank(e.NEXT_PUBLIC_APP_URL)?.replace(/\/+$/, ""),
    rootDomain: blank(e.APP_ROOT_DOMAIN)
      ?.replace(/^https?:\/\//, "")
      .replace(/\/+$/, ""),
    resendApiKey: blank(e.RESEND_API_KEY),
    emailFrom: blank(e.EMAIL_FROM),
    contactEmail: blank(e.NEXT_PUBLIC_CONTACT_EMAIL),
  });
}

export const env = read();

export class ConfigurationError extends Error {
  constructor(what: string) {
    super(`${what} is not configured. See .env.example and DEPLOYMENT.md.`);
    this.name = "ConfigurationError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(env.resendApiKey);
}

export function supabaseConfig(): { url: string; publishableKey: string } {
  if (!env.supabaseUrl || !env.supabasePublishableKey) throw new ConfigurationError("Supabase");
  return { url: env.supabaseUrl, publishableKey: env.supabasePublishableKey };
}
