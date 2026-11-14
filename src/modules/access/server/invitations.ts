import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { brandedEmail, sendEmail } from "@/lib/email";
import { hitRateLimit, RATE_LIMITS, rateLimitMessage } from "@/lib/rate-limit";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";
import { userMessageFor } from "@/lib/errors";
import { ActionError, check } from "@/lib/tenancy/actions";

/**
 * Create an invitation and email it (or return a link to share when email
 * isn't configured). Used by Team Access and by "Invite to staff portal" on a
 * staff record (which links the new sign-in to that record).
 */
export async function createInvitation({
  ctx,
  supabase,
  email,
  roleIds,
  employeeId,
}: {
  ctx: TenantContext;
  supabase: ServerSupabase;
  email: string;
  roleIds: string[];
  employeeId?: string;
}): Promise<{ message: string; link?: string }> {
  const rl = await hitRateLimit(RATE_LIMITS.inviteByUser, ctx.user.id);
  if (!rl.allowed) throw new ActionError(rateLimitMessage(rl.retryAfterSeconds));

  // 256-bit random token; only its SHA-256 hash is stored.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  const { data: inv, error } = await supabase
    .from("company_invitations")
    .insert({
      company_id: ctx.company.id,
      email,
      role_ids: roleIds,
      token_hash: tokenHash,
      ...(employeeId ? { employee_id: employeeId } : {}),
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    throw new ActionError(
      "There's already a pending invitation for this email. Revoke it first to send a new one.",
    );
  }
  if (error && /staff_|access to this staff record/.test(error.message)) {
    throw new ActionError(userMessageFor(error));
  }
  check(error, "create invitation");

  const link = `${env.appUrl}/invite/${token}`;
  const { data: inviter } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", ctx.user.id)
    .single();
  const who = inviter?.full_name || "A colleague";
  const body = brandedEmail({
    heading: `Join ${ctx.company.name} on WOHKAH`,
    paragraphs: [
      `${who} has invited you to join ${ctx.company.name} on WOHKAH.`,
      employeeId
        ? "Accept the invitation to set up your sign-in. You'll see your staff record, and more as your employer turns it on."
        : "Accept the invitation to set up your account. You'll use it to see your work information, and more as your company enables it.",
    ],
    cta: { label: "Accept invitation", url: link },
    footnote: `This invitation was sent to ${email} and expires in 7 days. If you weren't expecting it, you can ignore this email.`,
  });
  const sent = await sendEmail({
    to: email,
    subject: `${who} invited you to ${ctx.company.name} on WOHKAH`,
    ...body,
    idempotencyKey: `invite-${inv?.id}`,
  });
  if (sent.sent) return { message: `Invitation sent to ${email}.` };
  return {
    link,
    message:
      sent.reason === "not_configured"
        ? "Invitation created. Email sending isn't configured yet, so copy this link and send it to them yourself."
        : "Invitation created, but the email couldn't be sent. Copy this link and send it to them yourself.",
  };
}
