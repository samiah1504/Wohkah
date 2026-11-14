import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";
import { STATUS_GROUPS, type StaffStatus, type StatusGroup } from "@/lib/copy/staff";

export const ACTIVE_STATUSES = ["active", "on_leave", "suspended"] as const;
export const PAGE_SIZE = 25;

function fail(what: string, error: { code?: string }): never {
  console.error(`[staff] ${what} failed`, { code: error.code });
  throw new Error(`Could not load ${what}.`);
}

/** Everyone, for the plan-limit selection and reactivation forms. */
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
  if (error) fail("staff", error);
  return data;
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];

export type StaffFilters = { q: string; group: StatusGroup; branch: string | null; page: number };

export function parseFilters(sp: Record<string, string | string[] | undefined>): StaffFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const group = one("status");
  const page = Number(one("page"));
  return {
    q: one("q").trim().slice(0, 80),
    group: (["current", "left", "archived", "all"] as const).includes(group as StatusGroup)
      ? (group as StatusGroup)
      : "current",
    branch: /^[0-9a-f-]{36}$/.test(one("branch")) ? one("branch") : null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const LIST_COLUMNS =
  "id, staff_number, first_name, last_name, full_name, job_title, email, phone, status, employment_type, start_date, branch:branches(id, name)";

/** Filtered, paged staff list. RLS limits it to the staff this person may see. */
export async function listStaffPage(ctx: TenantContext, f: StaffFilters, pageSize = PAGE_SIZE) {
  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("company_id", ctx.company.id)
    .neq("status", "plan_suspended");
  if (f.group !== "all") query = query.in("status", [...STATUS_GROUPS[f.group]] as StaffStatus[]);
  if (f.branch) query = query.eq("branch_id", f.branch);
  if (f.q) {
    // Commas and brackets would break the filter syntax; the rest is matched as text.
    const term = f.q.replace(/[,()*%\\]/g, " ").trim();
    const number = Number(term.replace(/^#?0*/, ""));
    const ors = [
      `full_name.ilike.%${term}%`,
      `job_title.ilike.%${term}%`,
      `email.ilike.%${term}%`,
      `phone.ilike.%${term.replace(/\s/g, "")}%`,
    ];
    if (Number.isInteger(number) && number > 0) ors.push(`staff_number.eq.${number}`);
    query = query.or(ors.join(","));
  }
  const from = (f.page - 1) * pageSize;
  const { data, error, count } = await query
    .order("full_name")
    .order("staff_number")
    .range(from, from + pageSize - 1);
  if (error) fail("staff", error);
  return { rows: data, total: count ?? 0 };
}

export type StaffListRow = Awaited<ReturnType<typeof listStaffPage>>["rows"][number];

/** Every row matching the filters (for export). */
export async function listStaffForExport(ctx: TenantContext, f: StaffFilters) {
  return listStaffPage(ctx, { ...f, page: 1 }, 5000);
}

export async function getStaffMember(ctx: TenantContext, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, staff_number, first_name, last_name, full_name, job_title, email, phone, status, employment_type, start_date, end_date, member_id, reports_to, created_at, branch:branches(id, name)",
    )
    .eq("company_id", ctx.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("staff member", error);
  if (!data) return null;
  const [manager, reports] = await Promise.all([
    data.reports_to
      ? supabase
          .from("employees")
          .select("id, full_name, job_title")
          .eq("company_id", ctx.company.id)
          .eq("id", data.reports_to)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("employees")
      .select("id, full_name, job_title, status")
      .eq("company_id", ctx.company.id)
      .eq("reports_to", data.id)
      .order("full_name"),
  ]);
  return { ...data, manager: manager.data, directReports: reports.data ?? [] };
}

export type StaffMember = NonNullable<Awaited<ReturnType<typeof getStaffMember>>>;

export async function getStaffPrivate(ctx: TenantContext, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_private")
    .select("*")
    .eq("company_id", ctx.company.id)
    .eq("employee_id", id)
    .maybeSingle();
  if (error) fail("private details", error);
  return data;
}

export type StaffPrivate = NonNullable<Awaited<ReturnType<typeof getStaffPrivate>>>;

export async function listStaffDocuments(ctx: TenantContext, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_documents")
    .select("id, name, category, size_bytes, content_type, created_at, archived_at")
    .eq("company_id", ctx.company.id)
    .eq("employee_id", id)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (error) fail("documents", error);
  return data;
}

export async function listStaffHistory(ctx: TenantContext, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_history")
    .select("id, event, details, created_at, actor_user_id")
    .eq("company_id", ctx.company.id)
    .eq("employee_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) fail("history", error);
  const ids = [...new Set(data.map((h) => h.actor_user_id).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of people ?? []) names.set(p.id, p.full_name);
  }
  return data.map((h) => ({
    ...h,
    actor: h.actor_user_id ? (names.get(h.actor_user_id) ?? null) : null,
  }));
}

/** Job titles already used in this business, for suggestions. */
export async function jobTitleSuggestions(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("job_title")
    .eq("company_id", ctx.company.id)
    .not("job_title", "is", null)
    .limit(1000);
  if (error) fail("job titles", error);
  return [...new Set(data.map((r) => r.job_title!.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** People someone can report to (current staff). */
export async function managerOptions(ctx: TenantContext, excludeId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select("id, full_name, job_title")
    .eq("company_id", ctx.company.id)
    .in("status", [...STATUS_GROUPS.current] as StaffStatus[])
    .order("full_name");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) fail("staff", error);
  return data;
}

/** The signed-in person's own staff record in this business, if they have one. */
export async function getMyStaffRecordId(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("member_id", ctx.memberId)
    .maybeSingle();
  if (error) fail("your record", error);
  return data?.id ?? null;
}
