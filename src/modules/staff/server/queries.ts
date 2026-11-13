import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";

export const ACTIVE_STATUSES = ["active", "on_leave", "suspended"] as const;

export async function listStaff(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, job_title, email, phone, status, plan_suspended_at, created_at, branch:branches(name)",
    )
    .eq("company_id", ctx.company.id)
    .order("status")
    .order("full_name");
  if (error) {
    console.error("[staff] list failed", { code: error.code });
    throw new Error("Could not load staff.");
  }
  return data;
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];
