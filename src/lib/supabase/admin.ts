import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ConfigurationError, env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * SERVICE-ROLE client. It BYPASSES Row Level Security.
 *
 * Only allow-listed modules may import this file (eslint.config.mjs). Current
 * uses: rate limiting, login/security event logging. Never use it to read or
 * write tenant data on behalf of a user; use the user client instead.
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    throw new ConfigurationError("Supabase service key");
  }
  return createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
