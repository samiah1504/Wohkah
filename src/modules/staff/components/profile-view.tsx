import Link from "next/link";
import { ArchiveIcon, DownloadIcon, FileTextIcon, LockIcon, PencilIcon } from "lucide-react";
import { ActionButton } from "@/components/action-forms";
import { Button } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import {
  DOCUMENT_CATEGORIES,
  EMPLOYMENT_TYPES,
  GENDERS,
  STAFF_STATUS,
  describeHistory,
  staffNo,
  type DocumentCategory,
  type EmploymentType,
} from "@/lib/copy/staff";
import type { StaffMember, StaffPrivate } from "../server/queries";
import { setDocumentArchived } from "../server/actions";

export type ProfileTab = "overview" | "private" | "documents" | "history";

export function StatusBadge({ status }: { status: keyof typeof STAFF_STATUS }) {
  const s = STAFF_STATUS[status];
  return (
    <Badge variant={s.tone === "default" ? "default" : s.tone}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          s.tone === "success" && "bg-success",
          s.tone === "warning" && "bg-warning",
          s.tone === "info" && "bg-[#2d4a66]",
          (s.tone === "neutral" || s.tone === "default") && "bg-taupe",
        )}
      />
      {s.label}
    </Badge>
  );
}

export function ProfileHeader({
  staff,
  actions,
}: {
  staff: StaffMember;
  actions?: React.ReactNode;
}) {
  const meta = [staff.job_title, staff.branch?.name].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar name={staff.full_name} className="bg-sand text-walnut size-14 text-lg font-bold" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-walnut truncate text-2xl font-extrabold">
              {staff.full_name}
            </h1>
            <StatusBadge status={staff.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {meta || "No job title yet"}
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <span className="tabular-nums">Staff no. {staffNo(staff.staff_number)}</span>
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ProfileTabs({
  base,
  current,
  showPrivate,
}: {
  base: string;
  current: ProfileTab;
  showPrivate: boolean;
}) {
  const tabs: [ProfileTab, string][] = [
    ["overview", "Overview"],
    ...(showPrivate
      ? ([
          ["private", "Private details"],
          ["documents", "Documents"],
        ] as [ProfileTab, string][])
      : []),
    ["history", "History"],
  ];
  return (
    <nav aria-label="Staff record" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-6">
        {tabs.map(([key, label]) => (
          <li key={key}>
            <Link
              href={key === "overview" ? base : `${base}?tab=${key}`}
              aria-current={current === key ? "page" : undefined}
              className={cn(
                "-mb-px block border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                current === key
                  ? "border-primary text-walnut"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-surface rounded-xl border", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-walnut text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Details({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words">
            {value === null || value === undefined || value === "" ? (
              <span className="text-muted-foreground font-normal">Not recorded</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OverviewTab({
  staff,
  base,
  self = false,
}: {
  staff: StaffMember;
  base: string;
  /** The staff member looking at their own record: no links into other records. */
  self?: boolean;
}) {
  const staffBase = base.replace(/\/staff\/[^/]+$/, "/staff");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Job" className="lg:col-span-2">
        <Details
          items={[
            ["Job title", staff.job_title],
            ["Employment type", EMPLOYMENT_TYPES[staff.employment_type as EmploymentType]],
            ["Branch", staff.branch?.name],
            [
              "Reports to",
              staff.manager && self ? (
                staff.manager.full_name
              ) : staff.manager ? (
                <Link
                  className="text-walnut underline-offset-2 hover:underline"
                  href={`${staffBase}/${staff.manager.id}`}
                >
                  {staff.manager.full_name}
                </Link>
              ) : null,
            ],
            ["Started", staff.start_date ? formatDate(staff.start_date) : null],
            ...(staff.end_date
              ? ([["Left", formatDate(staff.end_date)]] as [string, string][])
              : []),
          ]}
        />
      </Panel>
      <Panel title="Contact">
        <Details
          items={[
            ["Email address", staff.email],
            ["Phone number", formatPhone(staff.phone)],
            ...(self
              ? []
              : ([["Staff portal", staff.member_id ? "Has a sign-in" : "Not invited yet"]] as [
                  string,
                  string,
                ][])),
          ]}
        />
      </Panel>
      {self ? null : (
        <Panel
          title={`Reports to ${staff.first_name ?? staff.full_name.split(" ")[0]}`}
          className="lg:col-span-3"
        >
          {staff.directReports.length ? (
            <ul className="divide-y">
              {staff.directReports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Link href={`${staffBase}/${r.id}`} className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={r.full_name}
                      className="bg-sand text-walnut size-8 text-xs font-bold"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium hover:underline">
                        {r.full_name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {r.job_title ?? "No job title"}
                      </span>
                    </span>
                  </Link>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nobody reports to them.</p>
          )}
        </Panel>
      )}
    </div>
  );
}

export function PrivateTab({ data, editHref }: { data: StaffPrivate | null; editHref?: string }) {
  const addr = (data?.home_address ?? {}) as Record<string, string>;
  const address = [addr.line1, addr.line2, addr.city, addr.state].filter(Boolean).join(", ");
  const edit = editHref ? (
    <Button asChild variant="ghost" size="sm">
      <Link href={editHref}>
        <PencilIcon /> Edit
      </Link>
    </Button>
  ) : null;
  if (!data) {
    return (
      <div className="bg-surface flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
        <LockIcon className="text-muted-foreground size-6" aria-hidden />
        <p className="font-medium">No private details recorded yet.</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Date of birth, home address, emergency contact, next of kin and bank details are kept
          here, visible only to people you give access.
        </p>
        {editHref ? (
          <Button asChild size="sm" className="mt-2">
            <Link href={editHref}>Add private details</Link>
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Personal" action={edit}>
        <Details
          items={[
            ["Date of birth", data.date_of_birth ? formatDate(data.date_of_birth) : null],
            ["Gender", data.gender ? GENDERS[data.gender as keyof typeof GENDERS] : null],
            ["Home address", address],
          ]}
        />
      </Panel>
      <Panel title="Bank details">
        <Details
          items={[
            ["Bank", data.bank_name],
            [
              "Account number",
              data.bank_account_number ? (
                <span className="tabular-nums">{data.bank_account_number}</span>
              ) : null,
            ],
            ["Account name", data.bank_account_name],
          ]}
        />
      </Panel>
      <Panel title="Emergency contact">
        <Details
          items={[
            ["Name", data.emergency_name],
            ["Phone number", data.emergency_phone],
            ["Relationship", data.emergency_relationship],
          ]}
        />
      </Panel>
      <Panel title="Next of kin">
        <Details
          items={[
            ["Name", data.kin_name],
            ["Phone number", data.kin_phone],
            ["Relationship", data.kin_relationship],
          ]}
        />
      </Panel>
      <Panel title="Tax and pension" className="lg:col-span-2">
        <Details
          items={[
            ["Tax ID (TIN)", data.tin],
            ["Pension PIN", data.pension_pin],
            ["Pension fund administrator", data.pfa_name],
          ]}
        />
      </Panel>
    </div>
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTab({
  slug,
  base,
  docs,
  canManage,
  upload,
}: {
  slug: string;
  base: string;
  docs: {
    id: string;
    name: string;
    category: string;
    size_bytes: number;
    created_at: string;
    archived_at: string | null;
  }[];
  canManage: boolean;
  upload?: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-xl border">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-walnut text-sm font-semibold">
          Documents{" "}
          <span className="text-muted-foreground font-normal">
            ({docs.filter((d) => !d.archived_at).length})
          </span>
        </h2>
        {upload}
      </header>
      {docs.length ? (
        <ul className="divide-y">
          {docs.map((d) => (
            <li
              key={d.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-5 py-3",
                d.archived_at && "opacity-60",
              )}
            >
              <FileTextIcon className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {d.name}
                  {d.archived_at ? (
                    <Badge variant="neutral" className="ml-2">
                      Archived
                    </Badge>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {DOCUMENT_CATEGORIES[d.category as DocumentCategory] ?? d.category} ·{" "}
                  {fileSize(d.size_bytes)} · added {formatDate(d.created_at.slice(0, 10))}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm">
                  <a href={`${base}/documents/${d.id}`} target="_blank" rel="noopener">
                    <DownloadIcon /> Open
                  </a>
                </Button>
                {canManage ? (
                  <ActionButton
                    action={setDocumentArchived}
                    hidden={{ slug, id: d.id, archive: d.archived_at ? "false" : "true" }}
                    variant="ghost"
                    confirm={d.archived_at ? undefined : "Archive this document?"}
                  >
                    <ArchiveIcon /> {d.archived_at ? "Restore" : "Archive"}
                  </ActionButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FileTextIcon className="text-muted-foreground size-6" aria-hidden />
          <p className="font-medium">No documents yet.</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Keep employment letters, ID cards, certificates and guarantor forms here instead of in
            WhatsApp chats.
          </p>
        </div>
      )}
    </section>
  );
}

export function HistoryTab({
  items,
  timezone,
}: {
  items: {
    id: number;
    event: string;
    details: unknown;
    created_at: string;
    actor: string | null;
  }[];
  timezone: string;
}) {
  if (!items.length) return <p className="text-muted-foreground text-sm">No history yet.</p>;
  return (
    <section className="bg-surface rounded-xl border px-5 py-4">
      <ol className="relative grid gap-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-[var(--border)]">
        {items.map((h) => (
          <li key={h.id} className="relative pl-6">
            <span
              aria-hidden
              className="bg-primary ring-surface absolute top-1.5 left-0 size-[11px] rounded-full ring-4"
            />
            <p className="text-sm font-medium">{describeHistory(h)}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(h.created_at, timezone)}
              {h.actor ? ` · by ${h.actor}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
