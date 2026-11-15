import Link from "next/link";
import { Badge } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import {
  CONTRACT_STATUS_TONE,
  contractStatusLabel,
  type ContractKind,
  type ContractStatus,
} from "@/lib/copy/documents";

export type DocumentsSection = "contracts" | "job-descriptions" | "templates";

/** Section navigation inside Documents. Only sections the person can use are shown. */
export function DocumentsNav({
  slug,
  current,
  show,
}: {
  slug: string;
  current: DocumentsSection;
  show: { contracts: boolean; jobDescriptions: boolean; templates: boolean };
}) {
  const items: [DocumentsSection, string, string, boolean][] = [
    ["contracts", "Contracts", `/w/${slug}/documents`, show.contracts],
    [
      "job-descriptions",
      "Job descriptions",
      `/w/${slug}/documents/job-descriptions`,
      show.jobDescriptions,
    ],
    ["templates", "Templates", `/w/${slug}/documents/templates`, show.templates],
  ];
  const visible = items.filter((i) => i[3]);
  if (visible.length < 2) return null;
  return (
    <nav
      aria-label="Documents"
      className="-mx-4 mb-6 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex gap-6">
        {visible.map(([key, label, href]) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={current === key ? "page" : undefined}
              className={cn(
                "-mb-px block border-b-2 py-3 text-sm font-semibold whitespace-nowrap",
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

export function ContractStatusBadge({
  status,
  kind,
}: {
  status: ContractStatus;
  kind: ContractKind;
}) {
  const tone = CONTRACT_STATUS_TONE[status];
  return (
    <Badge variant={tone}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          (tone === "neutral" || tone === "default") && "bg-taupe",
        )}
      />
      {contractStatusLabel(status, kind)}
    </Badge>
  );
}

/** "Business ✓ · Staff …" progress for a contract. */
export function SignatureProgress({
  kind,
  signed,
}: {
  kind: ContractKind;
  signed: { party: string }[];
}) {
  const parties = kind === "contract" ? (["business", "staff"] as const) : (["staff"] as const);
  return (
    <span className="text-muted-foreground inline-flex flex-wrap gap-x-3 text-xs">
      {parties.map((p) => {
        const done = signed.some((s) => s.party === p);
        return (
          <span key={p} className={done ? "text-success font-medium" : undefined}>
            {done ? "✓" : "○"} {p === "business" ? "Business" : "Staff"}
          </span>
        );
      })}
    </span>
  );
}
