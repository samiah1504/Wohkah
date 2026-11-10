import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitRule = { name: string; limit: number; windowSeconds: number };

/** Central catalogue so limits are reviewed in one place. */
export const RATE_LIMITS = {
  loginByIp: { name: "login:ip", limit: 20, windowSeconds: 300 },
  loginByEmail: { name: "login:email", limit: 8, windowSeconds: 900 },
  registerByIp: { name: "register:ip", limit: 5, windowSeconds: 3600 },
  resetByEmail: { name: "reset:email", limit: 3, windowSeconds: 3600 },
  resetByIp: { name: "reset:ip", limit: 10, windowSeconds: 3600 },
  mfaByUser: { name: "mfa:user", limit: 10, windowSeconds: 900 },
  inviteByUser: { name: "invite:user", limit: 30, windowSeconds: 3600 },
  createCompanyByUser: { name: "company:user", limit: 5, windowSeconds: 86400 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Counts one attempt against `rule` for `subject` (already hashed or an id).
 * Fails CLOSED: if the limiter can't be reached, the attempt is refused rather
 * than allowed without limits.
 */
export async function hitRateLimit(rule: RateLimitRule, subject: string): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: `${rule.name}:${subject}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    const row = data?.[0];
    if (error || !row) throw error ?? new Error("empty rate limit response");
    const retry = Math.max(0, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
    return { allowed: row.allowed, retryAfterSeconds: row.allowed ? 0 : retry };
  } catch (err) {
    console.error("[rate-limit] limiter unavailable, refusing request", {
      rule: rule.name,
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

/** Human message for a refused attempt. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}
