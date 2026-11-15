import { CheckCircle2Icon, CircleIcon, FingerprintIcon } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { CONTRACT_EVENT_LABEL, PARTY_LABEL } from "@/lib/copy/documents";
import type { ContractDetail } from "../server/queries";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-xl border">
      <h2 className="text-walnut border-b px-5 py-3 text-sm font-semibold">{title}</h2>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function SignaturesPanel({
  contract,
  businessName,
  timezone,
}: {
  contract: ContractDetail;
  businessName: string;
  timezone: string;
}) {
  const parties =
    contract.kind === "contract" ? (["business", "staff"] as const) : (["staff"] as const);
  return (
    <Panel title={contract.kind === "contract" ? "Signatures" : "Acknowledgement"}>
      <ul className="grid gap-4">
        {parties.map((p) => {
          const s = contract.signatures.find((x) => x.party === p);
          return (
            <li key={p} className="flex items-start gap-3">
              {s ? (
                <CheckCircle2Icon className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
              ) : (
                <CircleIcon className="text-taupe/60 mt-0.5 size-5 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  {p === "business"
                    ? `For ${businessName}`
                    : (contract.employee?.full_name ?? PARTY_LABEL.staff)}
                </p>
                {s ? (
                  <p className="text-muted-foreground">
                    {s.signer_name} · {formatDateTime(s.signed_at, timezone)}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {contract.status === "awaiting_signatures"
                      ? p === "business"
                        ? "Waiting for someone who signs for the business"
                        : contract.employee?.member_id
                          ? "Waiting for the staff member"
                          : "Needs a staff portal sign-in to sign"
                      : "Not signed"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function FingerprintPanel({ contract }: { contract: ContractDetail }) {
  if (!contract.content_hash) return null;
  return (
    <Panel title="Document fingerprint">
      <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
        <FingerprintIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Fixed when the document was sent. Any change to the text would give a different fingerprint.
      </p>
      <p className="mt-2 font-mono text-[11px] break-all">{contract.content_hash}</p>
      {contract.final_pdf_hash ? (
        <>
          <p className="text-muted-foreground mt-3 text-xs">Signed copy (PDF) fingerprint</p>
          <p className="mt-1 font-mono text-[11px] break-all">{contract.final_pdf_hash}</p>
        </>
      ) : null}
    </Panel>
  );
}

export function ContractHistory({
  contract,
  timezone,
}: {
  contract: ContractDetail;
  timezone: string;
}) {
  return (
    <Panel title="History">
      <ol className="grid gap-3">
        {contract.events.map((e) => (
          <li key={e.id} className="text-sm">
            <p className="font-medium">
              {CONTRACT_EVENT_LABEL[e.event] ?? "Updated"}
              {e.party ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {PARTY_LABEL[e.party as "staff" | "business"]}
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(e.created_at, timezone)}
              {e.actor ? ` · ${e.actor}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
