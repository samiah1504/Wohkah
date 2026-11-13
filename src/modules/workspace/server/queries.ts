import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";

/**
 * Read models for workspace settings. All reads use the user's client (RLS)
 * and are additionally filtered to the selected workspace, so a person in
 * several companies only ever sees the one in the URL.
 */

function fail(context: string, error: { code?: string }): never {
  console.error(`[workspace] ${context} failed`, { code: error.code });
  throw new Error(`Could not load ${context}.`);
}

export async function getCompanyProfile(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, slug, name, legal_name, business_email, phone, industry, country_code, address, website, size_band, timezone, currency, working_days, work_start, work_end, created_at",
    )
    .eq("id", ctx.company.id)
    .single();
  if (error) fail("company profile", error);
  return data;
}

export type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

export function asAddress(value: unknown): Address {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Address) : {};
}

export async function listDepartments(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, description, parent_id, archived_at, created_at")
    .eq("company_id", ctx.company.id)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) fail("departments", error);
  return data;
}

export async function listBranches(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code, address, phone, is_headquarters, archived_at, created_at")
    .eq("company_id", ctx.company.id)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("is_headquarters", { ascending: false })
    .order("name");
  if (error) fail("branches", error);
  return data;
}

export async function listHolidays(ctx: TenantContext, year: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_holidays")
    .select("id, holiday_date, name, branch:branches(id, name)")
    .eq("company_id", ctx.company.id)
    .gte("holiday_date", `${year}-01-01`)
    .lte("holiday_date", `${year}-12-31`)
    .order("holiday_date");
  if (error) fail("holidays", error);
  return data;
}

/** Real counts for the dashboard setup checklist (no hardcoded figures). */
export async function getSetupSummary(ctx: TenantContext) {
  const supabase = await createClient();
  const cid = ctx.company.id;
  const [departments, branches, members, invitations] = await Promise.all([
    supabase
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid)
      .is("archived_at", null),
    supabase
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid)
      .is("archived_at", null),
    supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid)
      .eq("status", "active"),
    supabase
      .from("company_invitations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", cid)
      .eq("status", "pending"),
  ]);
  for (const [name, r] of Object.entries({ departments, branches, members, invitations })) {
    if (r.error) fail(name, r.error);
  }
  return {
    departments: departments.count ?? 0,
    branches: branches.count ?? 0,
    members: members.count ?? 0,
    // Invitations are only visible to people who may view members.
    pendingInvitations: invitations.count ?? 0,
  };
}

export async function listWorkLocations(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_locations")
    .select("id, name, address, branch_id, archived_at, branch:branches(id, name)")
    .eq("company_id", ctx.company.id)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) fail("work locations", error);
  return data;
}
