import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { EMPLOYMENT_TYPES, type EmploymentType } from "@/lib/copy/staff";
import { CONTRACT_FILTERS, type ContractFilter } from "@/lib/copy/documents";
import type { FieldValues } from "@/lib/contracts/document";

const UUID = /^[0-9a-f-]{36}$/;

function fail(what: string, error: { code?: string }): never {
  console.error(`[documents] ${what} failed`, { code: error.code });
  throw new Error(`Could not load ${what}.`);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function listTemplates(ctx: TenantContext, includeArchived = false) {
  const supabase = await createClient();
  let q = supabase
    .from("contract_templates")
    .select("id, kind, name, starter_key, archived_at, updated_at")
    .eq("company_id", ctx.company.id)
    .order("name");
  if (!includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) fail("templates", error);
  return data;
}

export async function getTemplate(ctx: TenantContext, id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select("id, kind, name, body, starter_key, archived_at, updated_at")
    .eq("company_id", ctx.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("template", error);
  return data;
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------
export function parseContractFilter(value: unknown): ContractFilter {
  return CONTRACT_FILTERS.some(([k]) => k === value) ? (value as ContractFilter) : "waiting";
}

export async function listContracts(
  ctx: TenantContext,
  filter: ContractFilter | "all",
  employeeId?: string,
) {
  const supabase = await createClient();
  let q = supabase
    .from("contracts")
    .select(
      "id, kind, title, status, sent_at, completed_at, created_at, employee:employees(id, full_name, job_title), signatures:contract_signatures(party)",
    )
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") {
    const statuses = CONTRACT_FILTERS.find(([k]) => k === filter)![2];
    q = q.in("status", [...statuses]);
  }
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error) fail("contracts", error);
  return data;
}
export type ContractRow = Awaited<ReturnType<typeof listContracts>>[number];

/** Contracts waiting for a business signature (for people who sign for the business). */
export async function contractsAwaitingBusiness(ctx: TenantContext) {
  const rows = await listContracts(ctx, "waiting");
  return rows.filter(
    (r) => r.kind === "contract" && !r.signatures.some((s) => s.party === "business"),
  );
}

export async function contractCounts(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("status")
    .eq("company_id", ctx.company.id);
  if (error) fail("contracts", error);
  const counts: Record<string, number> = {};
  for (const r of data) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

export async function getContract(ctx: TenantContext, id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, kind, title, body, status, content_hash, sent_at, completed_at, cancelled_at, cancel_reason, final_pdf_path, final_pdf_hash, amends_id, template_id, created_at, employee:employees(id, full_name, first_name, email, member_id, job_title)",
    )
    .eq("company_id", ctx.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("contract", error);
  if (!data) return null;
  const [sigs, events] = await Promise.all([
    supabase
      .from("contract_signatures")
      .select("party, signer_name, mark_type, mark, signed_at, signer_user_id")
      .eq("contract_id", id)
      .order("signed_at"),
    supabase
      .from("contract_events")
      .select("id, event, party, actor_user_id, created_at")
      .eq("contract_id", id)
      .order("id", { ascending: false })
      .limit(100),
  ]);
  if (sigs.error) fail("signatures", sigs.error);
  if (events.error) fail("contract history", events.error);
  const actorIds = [
    ...new Set(events.data.map((e) => e.actor_user_id).filter(Boolean)),
  ] as string[];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of people ?? []) names.set(p.id, p.full_name ?? "");
  }
  return {
    ...data,
    signatures: sigs.data,
    events: events.data.map((e) => ({
      ...e,
      actor: e.actor_user_id ? (names.get(e.actor_user_id) ?? null) : null,
    })),
  };
}
export type ContractDetail = NonNullable<Awaited<ReturnType<typeof getContract>>>;

/** Which side the signed-in person signs for, if any, and whether it's still needed. */
export function signingPartyFor(ctx: TenantContext, c: ContractDetail) {
  const party =
    c.employee?.member_id && c.employee.member_id === ctx.memberId
      ? ("staff" as const)
      : c.kind === "contract" && ctx.permissions.has("contracts.sign")
        ? ("business" as const)
        : null;
  if (!party || c.status !== "awaiting_signatures") return { party, canSign: false };
  const done = c.signatures.some((s) => s.party === party);
  const signedOtherSide = c.signatures.some((s) => s.signer_user_id === ctx.user.id);
  return { party, canSign: !done && !signedOtherSide };
}

/** Values for {{fields}} from the staff record and business details. */
export async function fieldValuesFor(ctx: TenantContext, employeeId: string): Promise<FieldValues> {
  const supabase = await createClient();
  const [{ data: e }, { data: company }, { data: priv }] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "full_name, first_name, last_name, job_title, email, phone, staff_number, start_date, employment_type, reports_to, branch:branches(name)",
      )
      .eq("company_id", ctx.company.id)
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("name, legal_name, address")
      .eq("id", ctx.company.id)
      .single(),
    supabase
      .from("employee_private")
      .select("home_address")
      .eq("employee_id", employeeId)
      .maybeSingle(),
  ]);
  if (!e) return {};
  let manager: string | null = null;
  if (e.reports_to) {
    const { data: m } = await supabase
      .from("employees")
      .select("full_name, job_title")
      .eq("id", e.reports_to)
      .maybeSingle();
    manager = m ? [m.full_name, m.job_title].filter(Boolean).join(", ") : null;
  }
  const joinAddress = (a: unknown) => {
    const o = (a ?? {}) as Record<string, string | undefined>;
    return [o.line1, o.line2, o.city, o.state].filter(Boolean).join(", ") || null;
  };
  return {
    staff_name: e.full_name,
    staff_first_name: e.first_name,
    staff_last_name: e.last_name,
    job_title: e.job_title,
    branch: e.branch?.name ?? null,
    start_date: e.start_date ? formatDate(e.start_date) : null,
    employment_type: EMPLOYMENT_TYPES[e.employment_type as EmploymentType]?.toLowerCase() ?? null,
    staff_number: String(e.staff_number).padStart(4, "0"),
    staff_email: e.email,
    staff_phone: e.phone ? formatPhone(e.phone) : null,
    staff_address: joinAddress(priv?.home_address),
    reports_to: manager,
    business_name: company?.legal_name || company?.name || ctx.company.name,
    business_address: joinAddress(company?.address),
    today: formatDate(new Date().toISOString().slice(0, 10)),
  };
}

// ---------------------------------------------------------------------------
// Job descriptions
// ---------------------------------------------------------------------------
export async function listJobDescriptions(ctx: TenantContext, includeArchived = false) {
  const supabase = await createClient();
  let q = supabase
    .from("job_descriptions")
    .select(
      "id, title, archived_at, updated_at, versions:job_description_versions(id, version, published_at), staff:employees(id)",
    )
    .eq("company_id", ctx.company.id)
    .order("title");
  if (!includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) fail("job descriptions", error);
  const latestIds = data
    .map(
      (jd) =>
        jd.versions.reduce((a, b) => (b.version > (a?.version ?? 0) ? b : a), jd.versions[0])?.id,
    )
    .filter(Boolean) as string[];
  const acks = new Map<string, number>();
  if (latestIds.length) {
    const { data: rows } = await supabase
      .from("job_description_acknowledgements")
      .select("version_id")
      .in("version_id", latestIds);
    for (const r of rows ?? []) acks.set(r.version_id, (acks.get(r.version_id) ?? 0) + 1);
  }
  return data.map((jd) => {
    const latest = jd.versions.reduce<(typeof jd.versions)[number] | undefined>(
      (a, b) => (!a || b.version > a.version ? b : a),
      undefined,
    );
    return {
      id: jd.id,
      title: jd.title,
      archived_at: jd.archived_at,
      updated_at: jd.updated_at,
      version: latest?.version ?? 0,
      staffCount: jd.staff.length,
      acknowledged: latest ? (acks.get(latest.id) ?? 0) : 0,
    };
  });
}

export async function getJobDescription(ctx: TenantContext, id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("id, title, archived_at, created_at, updated_at")
    .eq("company_id", ctx.company.id)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("job description", error);
  if (!data) return null;
  const [versions, staff] = await Promise.all([
    supabase
      .from("job_description_versions")
      .select("id, version, body, change_note, published_at, published_by")
      .eq("job_description_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name, job_title, status")
      .eq("company_id", ctx.company.id)
      .eq("job_description_id", id)
      .order("full_name"),
  ]);
  if (versions.error) fail("job description versions", versions.error);
  if (staff.error) fail("staff", staff.error);
  const current = versions.data[0] ?? null;
  const acked = new Map<string, string>();
  if (current && staff.data.length) {
    const { data: acks } = await supabase
      .from("job_description_acknowledgements")
      .select("employee_id, acknowledged_at")
      .eq("version_id", current.id);
    for (const a of acks ?? []) acked.set(a.employee_id, a.acknowledged_at);
  }
  return {
    ...data,
    versions: versions.data,
    current,
    staff: staff.data.map((s) => ({ ...s, acknowledgedAt: acked.get(s.id) ?? null })),
  };
}
export type JobDescriptionDetail = NonNullable<Awaited<ReturnType<typeof getJobDescription>>>;

/** Staff the signed-in person can assign job descriptions to. */
export async function assignableStaff(ctx: TenantContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, job_title, job_description_id")
    .eq("company_id", ctx.company.id)
    .in("status", ["active", "on_leave", "suspended", "invited", "onboarding"])
    .order("full_name");
  if (error) fail("staff", error);
  return data;
}

// ---------------------------------------------------------------------------
// One staff member's documents (their own view, or a manager's)
// ---------------------------------------------------------------------------
export async function staffJobDescription(ctx: TenantContext, employeeId: string) {
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("employees")
    .select("job_description_id")
    .eq("company_id", ctx.company.id)
    .eq("id", employeeId)
    .maybeSingle();
  if (!e?.job_description_id) return null;
  const { data: jd } = await supabase
    .from("job_descriptions")
    .select("id, title, versions:job_description_versions(id, version, body, published_at)")
    .eq("id", e.job_description_id)
    .maybeSingle();
  if (!jd || !jd.versions.length) return null;
  const current = jd.versions.reduce((a, b) => (b.version > a.version ? b : a));
  const { data: ack } = await supabase
    .from("job_description_acknowledgements")
    .select("acknowledged_at")
    .eq("employee_id", employeeId)
    .eq("version_id", current.id)
    .maybeSingle();
  return { id: jd.id, title: jd.title, current, acknowledgedAt: ack?.acknowledged_at ?? null };
}
