import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/tenancy";
import { can } from "@/lib/permissions";

/**
 * Real numbers for Home. Every query runs with the person's own access (RLS),
 * so a branch manager's dashboard counts only their branch. Nothing is
 * estimated: modules that aren't built aren't counted.
 */

export async function staffOverview(ctx: TenantContext) {
  if (!can(ctx, "staff.view")) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("status, member_id")
    .eq("company_id", ctx.company.id);
  if (error) throw new Error("Could not load staff.");
  const count = (...s: string[]) => data.filter((e) => s.includes(e.status)).length;
  const current = data.filter((e) =>
    ["active", "on_leave", "suspended", "invited", "onboarding"].includes(e.status),
  );
  return {
    total: current.length,
    working: count("active"),
    onLeave: count("on_leave"),
    suspended: count("suspended"),
    paused: count("plan_suspended"),
    withoutPortal: current.filter((e) => !e.member_id).length,
  };
}

export type PendingItem = { key: string; label: string; count: number; href: string };

/** What needs someone's attention, limited to what this person can act on. */
export async function pendingActions(ctx: TenantContext): Promise<PendingItem[]> {
  const supabase = await createClient();
  const base = `/w/${ctx.company.slug}`;
  const items: PendingItem[] = [];
  const jobs: Promise<void>[] = [];

  if (can(ctx, "contracts.sign") || can(ctx, "contracts.manage")) {
    jobs.push(
      (async () => {
        const { data } = await supabase
          .from("contracts")
          .select("id, kind, status, signatures:contract_signatures(party)")
          .eq("company_id", ctx.company.id)
          .in("status", ["draft", "awaiting_signatures"]);
        const rows = data ?? [];
        if (can(ctx, "contracts.sign")) {
          const n = rows.filter(
            (c) =>
              c.status === "awaiting_signatures" &&
              c.kind === "contract" &&
              !c.signatures.some((s) => s.party === "business"),
          ).length;
          if (n)
            items.push({
              key: "sign",
              label:
                n === 1
                  ? "Contract to sign for the business"
                  : "Contracts to sign for the business",
              count: n,
              href: `${base}/documents`,
            });
        }
        if (can(ctx, "contracts.manage")) {
          const staff = rows.filter(
            (c) =>
              c.status === "awaiting_signatures" && !c.signatures.some((s) => s.party === "staff"),
          ).length;
          if (staff)
            items.push({
              key: "staff-sign",
              label:
                staff === 1 ? "Document waiting for a staff member" : "Documents waiting for staff",
              count: staff,
              href: `${base}/documents`,
            });
          const drafts = rows.filter((c) => c.status === "draft").length;
          if (drafts)
            items.push({
              key: "drafts",
              label: drafts === 1 ? "Draft contract not sent" : "Draft contracts not sent",
              count: drafts,
              href: `${base}/documents?status=drafts`,
            });
        }
      })(),
    );
  }

  if (can(ctx, "job_descriptions.manage")) {
    jobs.push(
      (async () => {
        const { data: jds } = await supabase
          .from("job_descriptions")
          .select("id, versions:job_description_versions(id, version), staff:employees(id)")
          .eq("company_id", ctx.company.id)
          .is("archived_at", null);
        const latest = (jds ?? [])
          .filter((j) => j.versions.length && j.staff.length)
          .map((j) => ({
            id: j.versions.reduce((a, b) => (b.version > a.version ? b : a)).id,
            staff: j.staff.length,
          }));
        if (!latest.length) return;
        const { data: acks } = await supabase
          .from("job_description_acknowledgements")
          .select("version_id")
          .in(
            "version_id",
            latest.map((l) => l.id),
          );
        const done = acks?.length ?? 0;
        const waiting = latest.reduce((a, l) => a + l.staff, 0) - done;
        if (waiting > 0)
          items.push({
            key: "jd",
            label:
              waiting === 1
                ? "Staff member yet to confirm their job description"
                : "Staff yet to confirm their job description",
            count: waiting,
            href: `${base}/documents/job-descriptions`,
          });
      })(),
    );
  }

  if (can(ctx, "members.view")) {
    jobs.push(
      (async () => {
        const { count } = await supabase
          .from("company_invitations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", ctx.company.id)
          .eq("status", "pending");
        if (count)
          items.push({
            key: "invites",
            label: count === 1 ? "Invitation not yet accepted" : "Invitations not yet accepted",
            count,
            href: `${base}/members`,
          });
      })(),
    );
  }

  await Promise.all(jobs);
  const order = ["sign", "staff-sign", "jd", "drafts", "invites"];
  return items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export type ActivityItem = {
  id: string;
  at: string;
  text: string;
  who: string | null;
  href: string | null;
};

const HISTORY_TEXT: Record<string, (name: string, d: Record<string, string | null>) => string> = {
  added: (n) => `${n} was added`,
  status_changed: (n) => `${n}'s status changed`,
  job_title_changed: (n, d) => (d.to ? `${n} is now ${d.to}` : `${n}'s job title was removed`),
  branch_changed: (n, d) => (d.to ? `${n} moved to ${d.to}` : `${n}'s branch was removed`),
  manager_changed: (n, d) => (d.to ? `${n} now reports to ${d.to}` : `${n}'s manager was removed`),
  employment_type_changed: (n) => `${n}'s employment type changed`,
  details_updated: (n) => `${n}'s details were updated`,
  private_details_updated: (n) => `${n}'s private details were updated`,
  document_added: (n, d) => `Document added for ${n}: ${d.name ?? ""}`,
  document_archived: (n, d) => `Document archived for ${n}: ${d.name ?? ""}`,
  portal_linked: (n) => `${n} joined the staff portal`,
  job_description_changed: (n, d) =>
    d.to ? `${n} was given the ${d.to} job description` : `${n}'s job description was removed`,
  job_description_acknowledged: (n) => `${n} confirmed their job description`,
  contract_signed: (n, d) => `${n} signed ${d.name ?? "a document"}`,
};

/** Recent staff changes the person is allowed to see, newest first. */
export async function recentActivity(ctx: TenantContext, limit = 8): Promise<ActivityItem[]> {
  if (!can(ctx, "staff.view")) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_history")
    .select("id, event, details, actor_user_id, created_at, employee:employees(id, full_name)")
    .eq("company_id", ctx.company.id)
    .order("id", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of people ?? []) names.set(p.id, p.full_name ?? "");
  }
  return rows.map((r) => {
    const name = r.employee?.full_name ?? "A staff member";
    const text =
      HISTORY_TEXT[r.event]?.(name, (r.details ?? {}) as Record<string, string | null>) ??
      `${name}'s record was updated`;
    return {
      id: String(r.id),
      at: r.created_at,
      text,
      who: r.actor_user_id ? (names.get(r.actor_user_id) ?? null) : null,
      href: r.employee ? `/w/${ctx.company.slug}/staff/${r.employee.id}` : null,
    };
  });
}

export type SetupStep = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  href: string;
  allowed: boolean;
};

/** The setup guide: done-ness comes from real records. */
export async function setupSteps(ctx: TenantContext): Promise<SetupStep[]> {
  const supabase = await createClient();
  const cid = ctx.company.id;
  const base = `/w/${ctx.company.slug}`;
  const head = { count: "exact" as const, head: true };
  const [company, branches, locations, staff, members, invitations] = await Promise.all([
    supabase
      .from("companies")
      .select("phone, business_email, address, created_at, updated_at")
      .eq("id", cid)
      .single(),
    supabase.from("branches").select("id", head).eq("company_id", cid).is("archived_at", null),
    supabase
      .from("work_locations")
      .select("id", head)
      .eq("company_id", cid)
      .is("archived_at", null),
    supabase.from("employees").select("id", head).eq("company_id", cid),
    supabase
      .from("company_members")
      .select("id", head)
      .eq("company_id", cid)
      .eq("status", "active"),
    supabase
      .from("company_invitations")
      .select("id", head)
      .eq("company_id", cid)
      .eq("status", "pending"),
  ]);
  const c = company.data;
  const address = (c?.address ?? {}) as Record<string, string | undefined>;
  const profileSaved = c
    ? new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 60_000
    : false;
  return [
    {
      key: "profile",
      label: "Add your business details",
      detail: "Phone number, email address and address, shown on contracts.",
      done: Boolean(c?.phone || c?.business_email || address.line1),
      href: `${base}/settings/company`,
      allowed: can(ctx, "company.settings.manage"),
    },
    {
      key: "hours",
      label: "Check your working days and hours",
      detail: "Used for attendance and leave.",
      done: profileSaved,
      href: `${base}/settings/company`,
      allowed: can(ctx, "company.settings.manage"),
    },
    {
      key: "branch",
      label: "Add a branch or office",
      detail: `${branches.count ?? 0} added`,
      done: (branches.count ?? 0) > 0,
      href: `${base}/settings/branches`,
      allowed: can(ctx, "branches.manage"),
    },
    {
      key: "location",
      label: "Add an approved work location",
      detail: "Where staff may clock in.",
      done: (locations.count ?? 0) > 0,
      href: `${base}/settings/work-locations`,
      allowed: can(ctx, "work_locations.manage"),
    },
    {
      key: "staff",
      label: "Add your staff",
      detail: `${staff.count ?? 0} added`,
      done: (staff.count ?? 0) > 0,
      href: `${base}/staff/new`,
      allowed: can(ctx, "staff.manage"),
    },
    {
      key: "invite",
      label: "Invite managers or staff to WOHKAH",
      detail: `${Math.max(0, (members.count ?? 1) - 1)} joined${invitations.count ? `, ${invitations.count} invited` : ""}`,
      done: (members.count ?? 0) > 1 || (invitations.count ?? 0) > 0,
      href: `${base}/members`,
      allowed: can(ctx, "members.invite"),
    },
  ];
}
