import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every matched request:
 *  1. refreshes the Supabase session cookie (token rotation),
 *  2. sends signed-out visitors of private pages to /login,
 *  3. sends users who enabled two-step verification to /login/mfa until they
 *     complete it.
 *
 * This is a convenience layer, NOT the security boundary: every page and
 * Server Action verifies the user itself, and the database enforces RLS.
 * Self-contained on purpose (the Proxy runs separately from render code).
 */

const PRIVATE_PREFIXES = ["/w/", "/workspaces", "/onboarding", "/account", "/reset-password"];

function isPrivate(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Not configured yet: pages explain what's missing.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached by a CDN.
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // Must run before any response is produced so refreshed tokens are written.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    const [p, q] = path.split("?");
    target.pathname = p ?? "/";
    target.search = q ? `?${q}` : "";
    const res = NextResponse.redirect(target);
    // Keep any refreshed session cookies.
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  };

  if (isPrivate(pathname)) {
    const next = encodeURIComponent(pathname + search);
    if (!claims) return redirectTo(`/login?next=${next}`);

    if (claims.aal !== "aal2") {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2") return redirectTo(`/login/mfa?next=${next}`);
    }
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
