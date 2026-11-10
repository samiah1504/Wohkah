import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";

function fail(context: string, error: { code?: string }): never {
  console.error(`[access] ${context} failed`, { code: error.code });
  throw new Error(`Could not load ${context}.`);
}

const directoryRoles = z.array(
  z.object({
    member_role_id: z.uuid(),
    role_id: z.uuid(),
    name: z.string(),
    system_key: z.string().nullable(),
    scope_type: z.enum(["company", "department", "branch"]),
  }),
);

/** Members with emails and roles (requires members.view; checked in the database). */
export async function getMemberDirectory(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workspace_member_directory", {
    p_company: ctx.company.id,
  });
  if (error) fail("members", error);
  return data.map((m) => ({ ...m, roles: directoryRoles.parse(m.roles) }));
}

export type DirectoryMember = Awaited<ReturnType<typeof getMemberDirectory>>[number];

export async function listPendingInvitations(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_invitations")
    .select("id, email, role_ids, expires_at, created_at")
    .eq("company_id", ctx.company.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) fail("invitations", error);
  return data;
}

export async function listRoles(ctx: TenantContext) {
  const supabase = await createClient();
  const [roles, perms, assignments] = await Promise.all([
    supabase
      .from("roles")
      .select("id, name, description, system_key, is_locked")
      .eq("company_id", ctx.company.id)
      .order("system_key", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase.from("role_permissions").select("role_id, permission_key").eq("company_id", ctx.company.id),
    supabase.from("member_roles").select("role_id, member_id").eq("company_id", ctx.company.id),
  ]);
  if (roles.error) fail("roles", roles.error);
  if (perms.error) fail("role permissions", perms.error);
  if (assignments.error) fail("role assignments", assignments.error);

  const SYSTEM_ORDER = ["owner", "hr_admin", "ops_manager", "dept_manager", "accountant", "employee"];
  return roles.data
    .map((r) => ({
      ...r,
      permissions: perms.data.filter((p) => p.role_id === r.id).map((p) => p.permission_key),
      memberCount: new Set(assignments.data.filter((a) => a.role_id === r.id).map((a) => a.member_id)).size,
    }))
    .sort((a, b) => {
      const ai = a.system_key ? SYSTEM_ORDER.indexOf(a.system_key) : 99;
      const bi = b.system_key ? SYSTEM_ORDER.indexOf(b.system_key) : 99;
      return ai - bi || a.name.localeCompare(b.name);
    });
}

export type RoleWithPermissions = Awaited<ReturnType<typeof listRoles>>[number];

export async function listPermissionCatalog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("key, module, description, is_sensitive")
    .order("sort_order");
  if (error) fail("permissions", error);
  return data;
}
