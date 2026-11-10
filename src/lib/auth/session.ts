import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  /** Authenticator assurance level: aal2 after a successful MFA challenge. */
  aal: "aal1" | "aal2";
};

/**
 * The signed-in user for this request, verified with getClaims() (the JWT
 * signature is checked; cookies alone are never trusted). Memoised per
 * request with React cache.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Always read the request first so session-dependent UI is never prerendered
  // as static, even in a build without Supabase configuration.
  await cookies();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const claims = data.claims;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
  };
});

/** Use in pages and actions that need a signed-in user. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

export { safeNextPath } from "./safe-next";
