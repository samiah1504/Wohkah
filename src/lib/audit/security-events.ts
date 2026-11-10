import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentifier, requestMeta } from "@/lib/request-meta";

export type LoginEvent =
  | "signup"
  | "login_success"
  | "login_failure"
  | "logout"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enrolled"
  | "mfa_unenrolled"
  | "mfa_challenge_failed"
  | "rate_limited";

/**
 * Append a security event (login_events). Emails are stored hashed only.
 * Logging failures never block the user's action but are reported.
 * Business changes are audited by the database trigger, not here.
 */
export async function recordLoginEvent(
  event: LoginEvent,
  who: { userId?: string | null; email?: string | null },
): Promise<void> {
  try {
    const meta = await requestMeta();
    const { error } = await createAdminClient()
      .from("login_events")
      .insert({
        event,
        user_id: who.userId ?? null,
        email_hash: who.email ? hashIdentifier(who.email) : null,
        ip: meta.ip,
        user_agent: meta.userAgent?.slice(0, 300) ?? null,
      });
    if (error) throw error;
  } catch (err) {
    console.error("[security-events] failed to record event", {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
