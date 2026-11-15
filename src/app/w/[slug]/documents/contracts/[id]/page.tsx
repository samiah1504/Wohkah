import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, PenLineIcon, SendIcon, XIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton, ActionDialog } from "@/components/action-forms";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { Field, Textarea } from "@/components/ui/form-controls";
import { can } from "@/lib/permissions";
import { CONTRACT_KIND } from "@/lib/copy/documents";
import { findBlanks } from "@/lib/contracts/document";
import { getContract, signingPartyFor } from "@/modules/documents/server/queries";
import {
  cancelContract,
  createContract,
  retrySignedCopy,
  sendContract,
} from "@/modules/documents/server/actions";
import { DocumentView } from "@/modules/documents/components/document-view";
import { DraftForm } from "@/modules/documents/components/forms";
import { ContractStatusBadge } from "@/modules/documents/components/shared";
import {
  ContractHistory,
  FingerprintPanel,
  SignaturesPanel,
} from "@/modules/documents/components/contract-panels";

export const metadata: Metadata = { title: "Contract" };

export default function ContractPage(props: PageProps<"/w/[slug]/documents/contracts/[id]">) {
  return (
    <TenantPage params={props.params} anyOf={["contracts.manage", "contracts.sign"]}>
      {async (ctx) => {
        const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
        const c = await getContract(ctx, id);
        if (!c) notFound();
        const slug = ctx.company.slug;
        const base = `/w/${slug}/documents`;
        const manage = can(ctx, "contracts.manage");
        const { canSign } = signingPartyFor(ctx, c);
        const blanks = findBlanks(`${c.title}\n${c.body}`);
        const staffName = c.employee?.full_name ?? "the staff member";
        const notice =
          sp.sent === "1"
            ? c.employee?.member_id
              ? `Sent. ${staffName} can now ${c.kind === "contract" ? "sign it" : "read and confirm it"} in their staff portal.`
              : "Sent. It's waiting for signatures."
            : null;

        return (
          <div className="grid gap-6">
            <Link
              href={base}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Contracts
            </Link>
            {notice ? <Alert variant="success">{notice}</Alert> : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-walnut text-2xl font-extrabold">{c.title}</h1>
                  <ContractStatusBadge status={c.status} kind={c.kind} />
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {CONTRACT_KIND[c.kind].label} for{" "}
                  {c.employee ? (
                    <Link
                      className="text-walnut font-medium hover:underline"
                      href={`/w/${slug}/staff/${c.employee.id}`}
                    >
                      {c.employee.full_name}
                    </Link>
                  ) : (
                    staffName
                  )}
                  {c.amends_id ? (
                    <>
                      {" · "}
                      <Link className="hover:underline" href={`${base}/contracts/${c.amends_id}`}>
                        updates an earlier signed version
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canSign ? (
                  <Button asChild size="sm">
                    <Link href={`/w/${slug}/sign/${c.id}`}>
                      <PenLineIcon /> Review and sign
                    </Link>
                  </Button>
                ) : null}
                {c.final_pdf_path ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={`${base}/contracts/${c.id}/download`}>
                      <DownloadIcon /> Signed copy (PDF)
                    </a>
                  </Button>
                ) : null}
                {manage && c.status === "completed" && !c.final_pdf_path ? (
                  <ActionButton action={retrySignedCopy} hidden={{ slug, id: c.id }}>
                    Save signed copy
                  </ActionButton>
                ) : null}
                {manage && c.status === "completed" && c.employee ? (
                  <ActionButton
                    action={createContract}
                    hidden={{ slug, employeeId: c.employee.id, amendsId: c.id, kind: c.kind }}
                  >
                    Prepare an updated version
                  </ActionButton>
                ) : null}
                {manage && (c.status === "draft" || c.status === "awaiting_signatures") ? (
                  <ActionDialog
                    title="Cancel this document?"
                    description={
                      c.status === "draft"
                        ? "The draft is kept in the history but can't be sent."
                        : "Nobody can sign it after this. Signatures already given stay in its history."
                    }
                    action={cancelContract}
                    hidden={{ slug, id: c.id }}
                    submitLabel="Cancel document"
                    trigger={
                      <Button variant="ghost" size="sm">
                        <XIcon /> Cancel
                      </Button>
                    }
                  >
                    {() => (
                      <Field label="Reason (optional)" htmlFor="reason">
                        <Textarea id="reason" name="reason" rows={2} maxLength={300} />
                      </Field>
                    )}
                  </ActionDialog>
                ) : null}
              </div>
            </div>

            {c.status === "draft" && manage ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
                <div className="bg-surface rounded-xl border p-5 sm:p-6">
                  <DraftForm slug={slug} contract={{ id: c.id, title: c.title, body: c.body }} />
                </div>
                <aside className="grid h-fit gap-4">
                  <section className="bg-surface rounded-xl border p-5">
                    <h2 className="text-walnut font-semibold">Ready to send?</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Once sent, the text is locked and can&apos;t be changed.{" "}
                      {c.kind === "contract"
                        ? `${staffName} and someone who signs for the business both sign it.`
                        : `${staffName} confirms they have read it.`}
                    </p>
                    {!c.employee?.member_id ? (
                      <p className="bg-sand/60 text-walnut mt-3 rounded-lg px-3 py-2 text-xs">
                        {staffName} doesn&apos;t have a staff portal sign-in yet. Invite them from
                        their{" "}
                        <Link
                          className="font-semibold underline"
                          href={`/w/${slug}/staff/${c.employee?.id}`}
                        >
                          staff record
                        </Link>{" "}
                        so they can sign.
                      </p>
                    ) : null}
                    <div className="mt-4">
                      {blanks.length ? (
                        <p className="text-destructive text-sm font-medium">
                          Fill in {blanks.length === 1 ? "1 blank" : `${blanks.length} blanks`} and
                          save the draft first.
                        </p>
                      ) : (
                        <ActionButton
                          action={sendContract}
                          hidden={{ slug, id: c.id }}
                          variant="default"
                          size="default"
                          confirm={`Send “${c.title}” to ${staffName}? The text can't be changed after this.`}
                        >
                          <SendIcon /> Send for signing
                        </ActionButton>
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <DocumentView body={c.body} />
                <aside className="grid h-fit gap-4">
                  {c.status === "cancelled" ? (
                    <Alert>Cancelled{c.cancel_reason ? `: ${c.cancel_reason}` : "."}</Alert>
                  ) : null}
                  {c.status !== "draft" ? (
                    <SignaturesPanel
                      contract={c}
                      businessName={ctx.company.name}
                      timezone={ctx.company.timezone}
                    />
                  ) : null}
                  <FingerprintPanel contract={c} />
                  <ContractHistory contract={c} timezone={ctx.company.timezone} />
                </aside>
              </div>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
