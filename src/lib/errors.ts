import { isFeature, limitMessage } from "@/lib/entitlements";

type DbError = { code?: string; message?: string } | null | undefined;

/**
 * Translate a database / PostgREST error into a message safe to show users.
 * Internal details (table names, SQL) are never shown; unknown errors are
 * logged by the caller and replaced with a generic message.
 */
export function userMessageFor(
  error: DbError,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  const msg = error.message ?? "";

  const limit = /plan_limit_exceeded:([a-z_]+):(\d+)/.exec(msg);
  if (limit) {
    const [, feature, value] = limit;
    if (feature && isFeature(feature)) return limitMessage(feature, Number(value));
    return "Your plan's limit has been reached. Upgrade your plan to add more.";
  }

  const known: Record<string, string> = {
    slug_taken: "That workspace address is already taken. Try another.",
    slug_reserved: "That workspace address is reserved. Try another.",
    too_many_companies: "You've created several workspaces today. Please try again tomorrow.",
    email_not_confirmed: "Please confirm your email address first.",
    invitation_invalid: "This invitation is no longer valid. Ask for a new one.",
    invitation_email_mismatch:
      "This invitation was sent to a different email address. Sign in with that address to accept it.",
    not_authenticated: "Please sign in again.",
  };
  for (const [key, text] of Object.entries(known)) {
    if (msg.includes(key)) return text;
  }

  // Messages raised deliberately by our triggers are written for end users.
  const friendlyTriggerMessages = [
    "at least one active owner",
    "roles whose permissions you hold",
    "permissions you hold yourself",
    "cannot change your own membership status",
    "Only an owner",
    "System roles cannot be deleted",
    "Owner role",
    "cannot be placed under itself",
  ];
  if (friendlyTriggerMessages.some((m) => msg.includes(m))) return msg;

  switch (error.code) {
    case "42501":
      return "You don't have permission to do that.";
    case "23505":
      return "Something with that name already exists.";
    case "23503":
      return "That refers to something that no longer exists. Refresh and try again.";
    case "23514":
      return "Some of the details aren't valid. Check them and try again.";
    default:
      return fallback;
  }
}
