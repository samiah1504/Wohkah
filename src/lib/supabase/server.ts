import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";
import { requestMeta } from "@/lib/request-meta";
import type { Database } from "./database.types";

/**
 * Supabase client acting AS THE SIGNED-IN USER. Every query runs under the
 * user's JWT, so Row Level Security applies. This is the client for all normal
 * reads and writes.
 *
 * Create one per request (never share across requests). Cookie writes fail
 * silently in Server Components, which can't set cookies; the proxy refreshes
 * the session on every request so that's safe.
 */
export async function createClient() {
  const { url, publishableKey } = supabaseConfig();
  const cookieStore = await cookies();
  const meta = await requestMeta();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy handles refreshes.
        }
      },
    },
    global: {
      // Forwarded so the database audit trigger can record who acted from where.
      headers: {
        ...(meta.ip ? { "x-wohkah-client-ip": meta.ip } : {}),
        ...(meta.userAgent ? { "x-wohkah-user-agent": meta.userAgent.slice(0, 300) } : {}),
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;
