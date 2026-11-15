import Link from "next/link";
import { CheckCircle2Icon, ClipboardListIcon, FileSignatureIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/dates";
import { CONTRACT_KIND } from "@/lib/copy/documents";
import type { ContractRow } from "../server/queries";
import { DocumentView } from "./document-view";
import { ContractStatusBadge } from "./shared";
import { AcknowledgeForm } from "./acknowledge-form";

type JobDescription = {
  id: string;
  title: string;
  current: { id: string; version: number; body: string; published_at: string };
  acknowledgedAt: string | null;
} | null;

/** A staff member's job description: theirs to confirm, or a manager's view. */
export function JobDescriptionTab({
  slug,
  jd,
  self,
  timezone,
  manageHref,
}: {
  slug: string;
  jd: JobDescription;
  self: boolean;
  timezone: string;
  manageHref?: string;
}) {
  if (!jd) {
    return (
      <div className="bg-surface flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
        <ClipboardListIcon className="text-muted-foreground size-6" aria-hidden />
        <p className="font-medium">No job description yet.</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          {self
            ? "When your manager shares your job description, you'll read it here."
            : "Write job descriptions in Documents and choose who each one is for."}
        </p>
        {manageHref ? (
          <Button asChild size="sm" variant="outline" className="mt-1">
            <Link href={manageHref}>Go to job descriptions</Link>
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {jd.acknowledgedAt ? (
        <p
          className="bg-success/10 text-foreground flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          role="status"
        >
          <CheckCircle2Icon className="text-success size-4 shrink-0" aria-hidden />
          {self ? "You confirmed" : "Confirmed"} version {jd.current.version} on{" "}
          {formatDateTime(jd.acknowledgedAt, timezone)}.
        </p>
      ) : self ? (
        <div className="border-primary/40 bg-sand/50 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <strong className="text-walnut">Please read your job description</strong>, then confirm
            you understand what your job involves.
          </p>
          <AcknowledgeForm slug={slug} versionId={jd.current.id} />
        </div>
      ) : (
        <p className="bg-sand/60 text-walnut rounded-lg px-4 py-3 text-sm">
          Not confirmed yet (version {jd.current.version}).
        </p>
      )}
      <DocumentView body={`# ${jd.title}\n\n${jd.current.body}`} />
      <p className="text-muted-foreground text-xs">
        Version {jd.current.version} · published {formatDate(jd.current.published_at.slice(0, 10))}
      </p>
    </div>
  );
}

/** Contracts and policies for one staff member. */
export function ContractsTab({
  slug,
  rows,
  self,
  newHref,
}: {
  slug: string;
  rows: ContractRow[];
  self: boolean;
  newHref?: string;
}) {
  return (
    <div className="grid gap-4">
      {newHref ? (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={newHref}>
              <PlusIcon /> New contract
            </Link>
          </Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="bg-surface flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
          <FileSignatureIcon className="text-muted-foreground size-6" aria-hidden />
          <p className="font-medium">{self ? "Nothing to sign." : "No contracts yet."}</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {self
              ? "Contracts and policies the business sends you appear here."
              : "Prepare a contract from a template and send it for signing."}
          </p>
        </div>
      ) : (
        <ul className="bg-surface divide-y overflow-hidden rounded-xl border">
          {rows.map((c) => {
            const waitingForMe =
              self &&
              c.status === "awaiting_signatures" &&
              !c.signatures.some((s) => s.party === "staff");
            return (
              <li key={c.id}>
                <Link
                  href={self ? `/w/${slug}/sign/${c.id}` : `/w/${slug}/documents/contracts/${c.id}`}
                  className="hover:bg-subtle/60 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {CONTRACT_KIND[c.kind].label} ·{" "}
                      {formatDate((c.completed_at ?? c.sent_at ?? c.created_at).slice(0, 10))}
                    </span>
                  </span>
                  {waitingForMe ? (
                    <span className="bg-primary text-walnut rounded-md px-3 py-1.5 text-sm font-semibold">
                      {c.kind === "contract" ? "Review and sign" : "Read and confirm"}
                    </span>
                  ) : (
                    <ContractStatusBadge status={c.status} kind={c.kind} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
