import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignatureIcon, PenLineIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/entitlements";
import { featurePrompt } from "@/lib/upgrade";
import { formatDate } from "@/lib/dates";
import { NAV } from "@/lib/copy/navigation";
import { CONTRACT_FILTERS, CONTRACT_KIND } from "@/lib/copy/documents";
import { cn } from "@/lib/utils";
import {
  contractCounts,
  contractsAwaitingBusiness,
  listContracts,
  parseContractFilter,
} from "@/modules/documents/server/queries";
import {
  ContractStatusBadge,
  DocumentsNav,
  SignatureProgress,
} from "@/modules/documents/components/shared";

export const metadata: Metadata = { title: NAV.documents.title };

export default function DocumentsPage(props: PageProps<"/w/[slug]/documents">) {
  return (
    <TenantPage
      params={props.params}
      anyOf={["contracts.manage", "contracts.sign", "job_descriptions.manage"]}
    >
      {async (ctx) => {
        const sp = await props.searchParams;
        const slug = ctx.company.slug;
        const base = `/w/${slug}/documents`;
        const manage = can(ctx, "contracts.manage");
        const signer = can(ctx, "contracts.sign");
        const show = {
          contracts: manage || signer,
          jobDescriptions: can(ctx, "job_descriptions.manage"),
          templates: manage,
        };
        if (!show.contracts) redirect(`${base}/job-descriptions`);
        const filter = parseContractFilter(sp.status);
        const [rows, counts, waitingForMe] = await Promise.all([
          listContracts(ctx, filter),
          contractCounts(ctx),
          signer ? contractsAwaitingBusiness(ctx) : Promise.resolve([]),
        ]);
        const featureOn = hasFeature(ctx, "digital_contracts");
        const total = Object.values(counts).reduce((a, b) => a + b, 0);

        return (
          <>
            <PageHeader
              title={NAV.documents.title}
              description={NAV.documents.description}
              actions={
                manage && featureOn ? (
                  <Button asChild>
                    <Link href={`${base}/contracts/new`}>
                      <PlusIcon /> New contract
                    </Link>
                  </Button>
                ) : null
              }
            />
            <DocumentsNav slug={slug} current="contracts" show={show} />
            <div className="grid gap-6">
              {!featureOn ? (
                <UpgradePrompt
                  prompt={featurePrompt(slug, ctx.plan.code, "digital_contracts")}
                  canManage={can(ctx, "subscription.manage")}
                />
              ) : null}

              {waitingForMe.length ? (
                <section
                  aria-labelledby="sign-heading"
                  className="border-primary/40 bg-sand/50 rounded-xl border p-4 sm:p-5"
                >
                  <h2
                    id="sign-heading"
                    className="text-walnut flex items-center gap-2 font-semibold"
                  >
                    <PenLineIcon className="size-4" aria-hidden /> Waiting for you to sign for the
                    business ({waitingForMe.length})
                  </h2>
                  <ul className="mt-3 divide-y">
                    {waitingForMe.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{c.title}</span>
                          <span className="text-muted-foreground block text-xs">
                            {c.employee?.full_name}
                          </span>
                        </span>
                        <Button asChild size="sm">
                          <Link href={`/w/${slug}/sign/${c.id}`}>Review and sign</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <nav
                aria-label="Filter by status"
                className="bg-subtle inline-flex w-fit flex-wrap rounded-lg p-1"
              >
                {CONTRACT_FILTERS.map(([key, label, statuses]) => {
                  const n = statuses.reduce((a, s) => a + (counts[s] ?? 0), 0);
                  return (
                    <Link
                      key={key}
                      href={key === "waiting" ? base : `${base}?status=${key}`}
                      aria-current={filter === key ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-semibold",
                        filter === key
                          ? "bg-surface text-walnut shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                      <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                        {n}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {total === 0 ? (
                <EmptyState
                  icon={<FileSignatureIcon />}
                  title="No contracts yet"
                  description="Prepare a contract from a template, fill in the details and send it. Your staff sign on their phone, and you get a signed copy with a signing certificate."
                  action={
                    manage && featureOn ? (
                      <Button asChild>
                        <Link href={`${base}/contracts/new`}>
                          <PlusIcon /> Prepare your first contract
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : rows.length === 0 ? (
                <p className="bg-surface text-muted-foreground rounded-xl border px-6 py-10 text-center text-sm">
                  Nothing here.
                </p>
              ) : (
                <ul className="bg-surface divide-y overflow-hidden rounded-xl border">
                  {rows.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`${base}/contracts/${c.id}`}
                        className="hover:bg-subtle/60 grid gap-2 px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{c.title}</span>
                          <span className="text-muted-foreground block truncate text-sm">
                            {c.employee?.full_name}
                            {c.employee?.job_title ? ` · ${c.employee.job_title}` : ""} ·{" "}
                            {CONTRACT_KIND[c.kind].label}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
                          {c.status === "awaiting_signatures" ? (
                            <SignatureProgress kind={c.kind} signed={c.signatures} />
                          ) : null}
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatDate((c.completed_at ?? c.sent_at ?? c.created_at).slice(0, 10))}
                          </span>
                          <ContractStatusBadge status={c.status} kind={c.kind} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        );
      }}
    </TenantPage>
  );
}
