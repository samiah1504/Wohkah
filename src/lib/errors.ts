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

  const staffLimit = /staff_limit_exceeded:(\d+)/.exec(msg);
  if (staffLimit) {
    return `Your subscription covers ${staffLimit[1]} active staff, and they're all in use. Upgrade your plan or add extra staff places (paid plans) from Settings → Subscription, or mark someone who has left as Left.`;
  }
  const locationLimit = /work_location_limit_exceeded:(\d+)/.exec(msg);
  if (locationLimit) {
    return `Your subscription covers ${locationLimit[1]} work location${locationLimit[1] === "1" ? "" : "s"}. Add another for ₦1,000 a month from Settings → Subscription, or archive one you no longer use.`;
  }
  const tooMany = /too_many_selected:(\d+)/.exec(msg);
  if (tooMany)
    return `You can keep up to ${tooMany[1]} staff active on this plan. Unselect some and try again.`;
  const selection = /staff_selection_required:(\d+)/.exec(msg);
  if (selection) {
    return `That plan includes ${selection[1]} active staff. Choose which staff stay active first (on the Staff page), then try again. No records are deleted.`;
  }

  const known: Record<string, string> = {
    "trial_not_eligible:owner_trial_used":
      "You've already used a free trial in the last 12 months. You can subscribe, or keep using the Free plan.",
    "trial_not_eligible:workspace_already_trialled":
      "This business has already had its free trial. You can subscribe at any time.",
    "trial_not_eligible:already_on_paid_plan": "This business is already on a paid plan or trial.",
    trial_plan_invalid: "Free trials are available for Starter, Growth and Business.",
    not_a_downgrade: "That plan isn't lower than your current one. Use Upgrade instead.",
    nothing_to_pay: "There's nothing to pay for with that selection.",
    extra_staff_not_available:
      "Extra staff places are available on paid plans. Upgrade to add more staff.",
    interval_not_available: "That plan isn't available for yearly billing.",
    "at least one active owner": "Your business must always have at least one active owner.",
    slug_taken: "That web address is already taken. Try another.",
    slug_reserved: "That web address is reserved. Try another.",
    too_many_companies:
      "You've created several business accounts today. Please try again tomorrow.",
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
    "staff selection or reactivation",
    "New staff can only be added",
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
