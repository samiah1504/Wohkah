"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isPermission } from "@/lib/permissions";
import { userMessageFor } from "@/lib/errors";
import { errorState, type FormState } from "@/lib/forms";
import { ActionError, check, workspaceAction } from "@/lib/tenancy/actions";
import { createInvitation } from "./invitations";
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
      const out = await createInvitation({
        ctx,
        supabase,
        email: data.email,
        roleIds: uuidsFrom(formData, "roleIds"),
      });
      inviteLink = out.link;
      return { status: "success", message: out.message };
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
    suspended: "Access suspended. They can no longer sign in to your business account.",
    removed: "Access removed. They can no longer sign in to your business account.",
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
      // No roles = basic access only (their own staff portal).
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
// Roles: every business defines its own (all plans). Owner is the only built-in role.
// ---------------------------------------------------------------------------
export async function saveRole(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "roles.manage",
    schema: roleSchema,
    successMessage: "Role saved.",
    run: async ({ ctx, data, supabase }) => {
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
    successMessage: "Access updated.",
    run: async ({ ctx, data, supabase }) => {
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
      const { error, count } = await supabase
        .from("roles")
        .delete({ count: "exact" })
        .eq("id", data.roleId)
        .eq("company_id", ctx.company.id);
      if (error?.code === "23503") {
        throw new ActionError(
          "This role is still given to someone. Take it off them first, then delete it.",
        );
      }
      check(error, "delete role");
      if (!count) throw new ActionError("That role could not be deleted.");
    },
  });
}
