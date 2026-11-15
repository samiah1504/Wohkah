import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, DownloadIcon, LockIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { consentText } from "@/lib/contracts/consent";
import { CONTRACT_KIND } from "@/lib/copy/documents";
import { getContract, signingPartyFor } from "@/modules/documents/server/queries";
import { DocumentView } from "@/modules/documents/components/document-view";
import { SignForm } from "@/modules/documents/components/sign-form";
import { ContractStatusBadge } from "@/modules/documents/components/shared";

export const metadata: Metadata = { title: "Review and sign" };

/** Where staff members and business signers read and sign a document. */
export default function SignPage(props: PageProps<"/w/[slug]/sign/[id]">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
        const c = await getContract(ctx, id);
        if (!c || c.status === "draft") notFound();
        const slug = ctx.company.slug;
        const { party, canSign } = signingPartyFor(ctx, c);
        const back =
          party === "staff"
            ? `/w/${slug}/me?tab=contracts`
            : `/w/${slug}/documents/contracts/${c.id}`;
        if (canSign) {
          // Evidence that the signer opened the document before signing.
          const supabase = await createClient();
          await supabase.rpc("record_contract_view", { p_contract: c.id });
        }
        const mine = c.signatures.find((s) => s.party === party);

        return (
          <div className="mx-auto grid max-w-3xl gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Back
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-walnut text-2xl font-extrabold">{c.title}</h1>
                <ContractStatusBadge status={c.status} kind={c.kind} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                From {ctx.company.name}
                {party === "business" && c.employee ? ` · for ${c.employee.full_name}` : ""} ·{" "}
                {CONTRACT_KIND[c.kind].label}
              </p>
            </div>

            {sp.signed === "1" && mine ? (
              <div
                className="bg-success/10 border-success/30 flex items-start gap-3 rounded-xl border p-4"
                role="status"
              >
                <CheckCircle2Icon className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="text-sm">
                  <p className="font-semibold">
                    {c.kind === "contract"
                      ? "You've signed this document."
                      : "Thank you. Your confirmation is recorded."}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {c.status === "completed"
                      ? "Everyone has signed. A signed copy with a signing certificate is saved."
                      : "We'll keep it here until everyone has signed."}
                  </p>
                </div>
              </div>
            ) : null}

            <DocumentView body={c.body} />

            {canSign ? (
              <section className="bg-surface rounded-xl border p-5 sm:p-8" aria-label="Sign">
                <SignForm
                  slug={slug}
                  id={c.id}
                  kind={c.kind}
                  defaultName={party === "staff" ? (c.employee?.full_name ?? "") : ""}
                  consent={consentText(c.kind)}
                />
                <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
                  <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  The text you read is fixed with a fingerprint. Your name, the time, your device
                  and network address are recorded with your signature, and everyone who signs gets
                  the same signed copy.
                </p>
              </section>
            ) : mine ? (
              <p className="text-muted-foreground text-sm">
                Signed by {mine.signer_name} on{" "}
                {formatDateTime(mine.signed_at, ctx.company.timezone)}.
              </p>
            ) : c.status === "cancelled" ? (
              <EmptyState title="This document was cancelled" description="It can't be signed." />
            ) : null}

            {c.final_pdf_path ? (
              <Button asChild variant="outline" className="w-fit">
                <a href={`/w/${slug}/documents/contracts/${c.id}/download`}>
                  <DownloadIcon /> Download signed copy (PDF)
                </a>
              </Button>
            ) : null}
          </div>
        );
      }}
    </TenantPage>
  );
}
