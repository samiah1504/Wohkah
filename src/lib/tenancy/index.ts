import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isPermission, type Permission } from "@/lib/permissions";
import { isFeature, type Entitlements } from "@/lib/entitlements";

/**
 * TenantContext: everything a request needs to act inside ONE workspace.
 *
 * Resolved on the server from the URL slug and the signed-in user, never from
 * an id sent by the browser (ADR-0003). workspace_context() runs under the
 * user's RLS, so it returns nothing unless they are an active member.
 * Services take companyId only from this object.
 */
export type TenantContext = {
  user: SessionUser;
  company: {
    id: string;
    slug: string;
    name: string;
    status: "active" | "suspended" | "closed";
    countryCode: string;
    timezone: string;
    currency: string;
    logoPath: string | null;
  };
  memberId: string;
  permissions: ReadonlySet<Permission>;
  roles: {
    roleId: string;
    name: string;
    systemKey: string | null;
    scopeType: "company" | "department" | "branch";
  }[];
  plan: { code: string; name: string };
  subscriptionStatus: string | null;
  features: Entitlements;
};

const contextSchema = z.object({
  company: z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    status: z.enum(["active", "suspended", "closed"]),
    country_code: z.string(),
    timezone: z.string(),
    currency: z.string(),
    logo_path: z.string().nullable(),
  }),
  member_id: z.uuid(),
  permissions: z.array(z.string()),
  roles: z.array(
    z.object({
      role_id: z.uuid(),
      name: z.string(),
      system_key: z.string().nullable(),
      scope_type: z.enum(["company", "department", "branch"]),
    }),
  ),
  plan: z.object({ code: z.string(), name: z.string() }),
  subscription_status: z.string().nullable(),
  features: z.record(z.string(), z.object({ enabled: z.boolean(), limit: z.number().nullable() })),
});

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Resolve the workspace for this request, or null if the user may not access it. */
export const getTenant = cache(async (slug: string): Promise<TenantContext | null> => {
  const user = await requireUser(`/w/${encodeURIComponent(slug)}`);
  if (!SLUG.test(slug)) return null;

  const supabase = await createClient();
  // Record trial expiry / due plan changes and create reminders before
  // reading the context (idempotent; a no-op for non-members).
  const refreshed = await supabase.rpc("refresh_workspace_subscription", { p_slug: slug });
  if (refreshed.error) {
    console.error("[tenancy] refresh_workspace_subscription failed", {
      code: refreshed.error.code,
    });
  }
  const { data, error } = await supabase.rpc("workspace_context", { p_slug: slug });
  if (error) {
    console.error("[tenancy] workspace_context failed", { code: error.code });
    throw new Error("Could not load the workspace.");
  }
  if (!data) return null;

  const parsed = contextSchema.parse(data);
  const features: Entitlements = {};
  for (const [key, value] of Object.entries(parsed.features)) {
    if (isFeature(key)) features[key] = value;
  }

  return {
    user,
    company: {
      id: parsed.company.id,
      slug: parsed.company.slug,
      name: parsed.company.name,
      status: parsed.company.status,
      countryCode: parsed.company.country_code,
      timezone: parsed.company.timezone,
      currency: parsed.company.currency,
      logoPath: parsed.company.logo_path,
    },
    memberId: parsed.member_id,
    permissions: new Set(parsed.permissions.filter(isPermission)),
    roles: parsed.roles.map((r) => ({
      roleId: r.role_id,
      name: r.name,
      systemKey: r.system_key,
      scopeType: r.scope_type,
    })),
    plan: parsed.plan,
    subscriptionStatus: parsed.subscription_status,
    features,
  };
});

/**
 * For pages and actions under /w/[slug]. A workspace the user can't access
 * returns 404, so its existence isn't revealed.
 */
export async function requireTenant(slug: string): Promise<TenantContext> {
  const ctx = await getTenant(slug);
  if (!ctx) notFound();
  return ctx;
}

export type WorkspaceSummary = { slug: string; name: string; roleNames: string[] };

/** Workspaces the signed-in user belongs to (for the switcher). */
export const listMyWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  const user = await requireUser("/workspaces");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("company:companies!inner(slug, name), member_roles(role:roles(name))")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (error) {
    console.error("[tenancy] listMyWorkspaces failed", { code: error.code });
    throw new Error("Could not load your workspaces.");
  }
  return (data ?? []).map((row) => ({
    slug: row.company.slug,
    name: row.company.name,
    roleNames: row.member_roles.map((mr) => mr.role?.name).filter((n): n is string => !!n),
  }));
});
