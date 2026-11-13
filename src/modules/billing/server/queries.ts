import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";

const count = z.coerce.number();
const nullableLimit = z.number().nullable();

const overviewSchema = z.object({
  plan_code: z.string(),
  status: z.string(),
  billing_interval: z.enum(["monthly", "annual"]).nullable(),
  current_period_end: z.string().nullable(),
  trial: z
    .object({
      plan_code: z.string(),
      started_at: z.string(),
      ends_at: z.string(),
      outcome: z.string(),
    })
    .nullable(),
  pending_plan_code: z.string().nullable(),
  pending_change_at: z.string().nullable(),
  staff_selection_required: z.boolean(),
  usage: z.object({
    active_staff: count,
    paused_staff: count,
    admins: count,
    branches: count,
    departments: count,
    work_locations: count,
    storage_mb: count,
  }),
  allowances: z.object({
    staff: count,
    extra_staff: count,
    work_locations: nullableLimit,
    extra_work_locations: count,
    admins: nullableLimit,
    branches: nullableLimit,
    departments: nullableLimit,
    storage_mb: nullableLimit,
  }),
});

export type SubscriptionOverview = z.infer<typeof overviewSchema>;

function fail(what: string, error: { code?: string }): never {
  console.error(`[billing] ${what} failed`, { code: error.code });
  throw new Error(`Could not load ${what}.`);
}

/** Requires subscription.view (checked in the database). */
export async function getSubscriptionOverview(ctx: TenantContext): Promise<SubscriptionOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscription_overview", {
    p_company: ctx.company.id,
  });
  if (error) fail("subscription", error);
  return overviewSchema.parse(data);
}

export async function getTrialEligibility(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trial_eligibility", { p_company: ctx.company.id });
  if (error) fail("trial eligibility", error);
  const row = data?.[0];
  return { eligible: Boolean(row?.eligible), reason: row?.reason ?? null };
}

export async function listSubscriptionEvents(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_events")
    .select(
      "id, event, details, created_at, from_plan:subscription_plans!subscription_events_from_plan_id_fkey(name), to_plan:subscription_plans!subscription_events_to_plan_id_fkey(name)",
    )
    .eq("company_id", ctx.company.id)
    .order("id", { ascending: false })
    .limit(20);
  if (error) fail("subscription history", error);
  return data;
}

export async function listInvoices(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_invoices")
    .select(
      "id, reference, status, total_minor, billing_interval, created_at, paid_at, plan:subscription_plans(name)",
    )
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) fail("payment history", error);
  return data;
}

export async function listMyNotifications(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("company_id", ctx.company.id)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) fail("notifications", error);
  return data;
}

const allowancesSchema = z.object({
  plan_code: z.string(),
  staff: count,
  active_staff: count,
  work_locations: nullableLimit,
  used_work_locations: count,
  staff_selection_required: z.boolean(),
});
export type WorkspaceAllowances = z.infer<typeof allowancesSchema>;

/** Staff and work-location allowances (including paid extras). Any member. */
export async function getWorkspaceAllowances(ctx: TenantContext): Promise<WorkspaceAllowances> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workspace_allowances", { p_company: ctx.company.id });
  if (error) fail("allowances", error);
  return allowancesSchema.parse(data);
}
