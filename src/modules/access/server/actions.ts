"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hitRateLimit, RATE_LIMITS, rateLimitMessage } from "@/lib/rate-limit";
import { brandedEmail, sendEmail } from "@/lib/email";
import { assertFeature } from "@/lib/entitlements";
import { isPermission } from "@/lib/permissions";
import { userMessageFor } from "@/lib/errors";
import { errorState, type FormState } from "@/lib/forms";
import { ActionError, check, workspaceAction } from "@/lib/tenancy/actions";
import {
  invitationIdSchema,
  inviteSchema,
  memberIdSchema,
  memberStatusSchema,
  roleIdSchema,
  roleSchema,
  uuidsFrom,
} from "../schemas";

export type InviteState = FormState & { inviteLink?: string };

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  let inviteLink: string | undefined;
  const result = await workspaceAction({
    formData,
    permission: "members.invite",
    schema: inviteSchema,
    run: async ({ ctx, data, supabase }) => {
      const rl = await hitRateLimit(RATE_LIMITS.inviteByUser, ctx.user.id);
      if (!rl.allowed) throw new ActionError(rateLimitMessage(rl.retryAfterSeconds));

      const roleIds = uuidsFrom(formData, "roleIds");
      // 256-bit random token; only its SHA-256 hash is stored.
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

      const { data: inv, error } = await supabase
        .from("company_invitations")
        .insert({
          company_id: ctx.company.id,
          email: data.email,
          role_ids: roleIds,
          token_hash: tokenHash,
        })
        .select("id")
        .single();
      if (error?.code === "23505") {
        throw new ActionError(
          "There's already a pending invitation for this email. Revoke it first to send a new one.",
        );
      }
      check(error, "create invitation");

      const link = `${env.appUrl}/invite/${token}`;
      const { data: inviter } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ctx.user.id)
        .single();
      const who = inviter?.full_name || "A colleague";
      const email = brandedEmail({
        heading: `Join ${ctx.company.name} on WOHKAH`,
        paragraphs: [
          `${who} has invited you to the ${ctx.company.name} workspace on WOHKAH.`,
          "Accept the invitation to set up your account. You'll use it to see your work information, and more as your company enables it.",
        ],
        cta: { label: "Accept invitation", url: link },
        footnote: `This invitation was sent to ${data.email} and expires in 7 days. If you weren't expecting it, you can ignore this email.`,
      });
      const sent = await sendEmail({
        to: data.email,
        subject: `${who} invited you to ${ctx.company.name} on WOHKAH`,
        ...email,
        idempotencyKey: `invite-${inv?.id}`,
      });

      if (sent.sent) {
        return { status: "success", message: `Invitation sent to ${data.email}.` };
      }
      inviteLink = link;
      return {
        status: "success",
        message:
          sent.reason === "not_configured"
            ? "Invitation created. Email sending isn't configured yet, so copy this link and send it to them yourself."
            : "Invitation created, but the email couldn't be sent. Copy this link and send it to them yourself.",
      };
    },
  });
  return { ...result, inviteLink };
}

export async function revokeInvitation(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "members.invite",
    schema: invitationIdSchema,
    successMessage: "Invitation revoked.",
    run: async ({ ctx, data, supabase }) => {
      const { error, count } = await supabase
        .from("company_invitations")
        .update({ status: "revoked" }, { count: "exact" })
        .eq("id", data.invitationId)
        .eq("company_id", ctx.company.id)
        .eq("status", "pending");
      check(error, "revoke invitation");
      if (!count) throw new ActionError("That invitation is no longer pending.");
    },
  });
}

/** Accept from /invite/[token]. The database checks the email matches. */
export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return errorState("This invitation link is invalid.");
  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !slug) {
    return errorState(
      userMessageFor(error, "We couldn't accept the invitation. Please try again."),
    );
  }
  redirect(`/w/${slug}`);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function setMemberStatus(_prev: FormState, formData: FormData) {
  const status = String(formData.get("status"));
  const messages: Record<string, string> = {
    active: "Member reactivated.",
    suspended: "Member suspended. They can no longer access this workspace.",
    removed: "Member removed from the workspace.",
  };
  return workspaceAction({
    formData,
    permission: "members.manage",
    schema: memberStatusSchema,
    successMessage: messages[status] ?? "Saved.",
    run: async ({ ctx, data, supabase }) => {
      const { error, count } = await supabase
        .from("company_members")
        .update({ status: data.status }, { count: "exact" })
        .eq("id", data.memberId)
        .eq("company_id", ctx.company.id);
      check(error, "update member status");
      if (!count) throw new ActionError("That member could not be found.");
    },
  });
}

/** Replace a member's company-wide roles with the selected set. */
export async function setMemberRoles(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "roles.assign",
    schema: memberIdSchema,
    successMessage: "Roles updated.",
    run: async ({ ctx, data, supabase }) => {
      const desired = uuidsFrom(formData, "roleIds");
      if (desired.length === 0) {
        throw new ActionError("Choose at least one role. Use Staff Member for basic access.");
      }
      const { data: current, error } = await supabase
        .from("member_roles")
        .select("id, role_id")
        .eq("company_id", ctx.company.id)
        .eq("member_id", data.memberId)
        .eq("scope_type", "company");
      check(error, "load member roles");

      const have = new Set(current!.map((r) => r.role_id));
      const toAdd = desired.filter((id) => !have.has(id));
      const toRemove = current!.filter((r) => !desired.includes(r.role_id));

      // Add first, then remove, so ownership transfers never pass through
      // a moment with no owner (the database also refuses that).
      if (toAdd.length) {
        const { error: addError } = await supabase.from("member_roles").insert(
          toAdd.map((roleId) => ({
            company_id: ctx.company.id,
            member_id: data.memberId,
            role_id: roleId,
            scope_type: "company" as const,
          })),
        );
        check(addError, "assign roles");
      }
      if (toRemove.length) {
        const { error: removeError } = await supabase
          .from("member_roles")
          .delete()
          .eq("company_id", ctx.company.id)
          .in(
            "id",
            toRemove.map((r) => r.id),
          );
        check(removeError, "remove roles");
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Custom roles (plan feature: custom_roles)
// ---------------------------------------------------------------------------
export async function saveRole(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "roles.manage",
    schema: roleSchema,
    successMessage: "Role saved.",
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "custom_roles");
      const { error } = data.roleId
        ? await supabase
            .from("roles")
            .update({ name: data.name, description: data.description })
            .eq("id", data.roleId)
            .eq("company_id", ctx.company.id)
        : await supabase
            .from("roles")
            .insert({ company_id: ctx.company.id, name: data.name, description: data.description });
      if (error?.code === "23505") throw new ActionError("A role with that name already exists.");
      check(error, "save role");
    },
  });
}

export async function setRolePermissions(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "roles.manage",
    schema: roleIdSchema,
    successMessage: "Permissions updated.",
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "custom_roles");
      const desired = [...new Set(formData.getAll("permissions").map(String))].filter(isPermission);
      const { data: current, error } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .eq("company_id", ctx.company.id)
        .eq("role_id", data.roleId);
      check(error, "load role permissions");
      const have = new Set<string>(current!.map((p) => p.permission_key));
      const want = new Set<string>(desired);
      const toAdd = desired.filter((k) => !have.has(k));
      const toRemove = [...have].filter((k) => !want.has(k));

      if (toAdd.length) {
        const { error: e } = await supabase.from("role_permissions").insert(
          toAdd.map((key) => ({
            company_id: ctx.company.id,
            role_id: data.roleId,
            permission_key: key,
          })),
        );
        check(e, "add permissions");
      }
      if (toRemove.length) {
        const { error: e } = await supabase
          .from("role_permissions")
          .delete()
          .eq("company_id", ctx.company.id)
          .eq("role_id", data.roleId)
          .in("permission_key", toRemove);
        check(e, "remove permissions");
      }
    },
  });
}

export async function deleteRole(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "roles.manage",
    schema: roleIdSchema,
    successMessage: "Role deleted.",
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "custom_roles");
      const { error, count } = await supabase
        .from("roles")
        .delete({ count: "exact" })
        .eq("id", data.roleId)
        .eq("company_id", ctx.company.id);
      if (error?.code === "23503") {
        throw new ActionError("This role is still assigned to members. Remove it from them first.");
      }
      check(error, "delete role");
      if (!count) throw new ActionError("That role could not be deleted.");
    },
  });
}
