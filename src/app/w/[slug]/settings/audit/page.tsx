import type { Metadata } from "next";
import Link from "next/link";
import { ScrollTextIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { EmptyState } from "@/components/ui/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

const ENTITY_LABELS: Record<string, string> = {
  companies: "Company",
  company_members: "Membership",
  departments: "Department",
  branches: "Branch",
  public_holidays: "Holiday",
  roles: "Role",
  role_permissions: "Role permission",
  member_roles: "Role assignment",
  company_invitations: "Invitation",
  company_subscriptions: "Subscription",
  company_feature_overrides: "Plan override",
  support_access_grants: "Support access",
};

const VERBS: Record<string, string> = { insert: "created", update: "changed", delete: "removed" };

function describe(action: string, entityType: string) {
  const op = action.split(".").pop() ?? "";
  return `${ENTITY_LABELS[entityType] ?? entityType} ${VERBS[op] ?? op}`;
}

/**
 * Friendly labels for the fields people change. Anything not listed here
 * (ids, internal keys such as system_key, flags) is never shown to customers.
 */
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  legal_name: "Legal name",
  description: "Description",
  email: "Email",
  business_email: "Business email",
  phone: "Phone",
  website: "Website",
  industry: "Industry",
  size_band: "Company size",
  timezone: "Time zone",
  currency: "Currency",
  country_code: "Country",
  work_start: "Work starts",
  work_end: "Work ends",
  holiday_date: "Date",
  code: "Code",
  status: "Status",
  is_headquarters: "Head office",
  archived_at: "Archived",
};

function display(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return "none";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v;
  if (typeof v === "number") return String(v);
  return null; // objects and lists aren't summarised
}

function summarise(changes: unknown): string {
  if (!changes || typeof changes !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(changes as Record<string, unknown>)) {
    const label = FIELD_LABELS[k];
    if (!label) continue;
    if (Array.isArray(v) && v.length === 2) {
      const [before, after] = [display(v[0]), display(v[1])];
      if (before !== null && after !== null) parts.push(`${label}: ${before} → ${after}`);
    } else {
      const value = display(v);
      if (value !== null) parts.push(`${label}: ${value}`);
    }
    if (parts.length === 4) break;
  }
  return parts.join("; ");
}

export default function AuditPage(props: PageProps<"/w/[slug]/settings/audit">) {
  return (
    <TenantPage params={props.params} anyOf={["audit.view"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        // Keyset pagination on the identity column (newest first).
        const before =
          typeof sp.before === "string" && /^\d+$/.test(sp.before) ? Number(sp.before) : null;
        const supabase = await createClient();
        let query = supabase
          .from("audit_logs")
          .select("id, actor_user_id, actor_type, action, entity_type, changes, created_at")
          .eq("company_id", ctx.company.id)
          .order("id", { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (before) query = query.lt("id", before);
        const { data, error } = await query;
        if (error) throw new Error("Could not load the audit log.");
        const rows = data.slice(0, PAGE_SIZE);
        const hasMore = data.length > PAGE_SIZE;

        const actorIds = [
          ...new Set(rows.map((r) => r.actor_user_id).filter((x): x is string => !!x)),
        ];
        const { data: actors } = actorIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
          : { data: [] };
        const names = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

        if (rows.length === 0) {
          return <EmptyState icon={<ScrollTextIcon />} title="No activity recorded yet" />;
        }
        return (
          <div className="grid gap-4">
            <p className="text-muted-foreground text-sm">
              Every change to workspace settings, members and roles is recorded here and can&apos;t
              be edited or deleted.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(r.created_at, ctx.company.timezone)}
                    </TableCell>
                    <TableCell>
                      {r.actor_user_id ? names.get(r.actor_user_id) || "A former member" : "System"}
                    </TableCell>
                    <TableCell>{describe(r.action, r.entity_type)}</TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-md truncate text-xs lg:table-cell">
                      {summarise(r.changes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMore ? (
              <Link
                href={`/w/${ctx.company.slug}/settings/audit?before=${rows.at(-1)!.id}`}
                className="text-walnut justify-self-center text-sm font-semibold hover:underline"
              >
                Older entries →
              </Link>
            ) : null}
          </div>
        );
      }}
    </TenantPage>
  );
}
