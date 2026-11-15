import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/entitlements";
import { featurePrompt } from "@/lib/upgrade";
import { STARTER_NOTE, STARTER_TEMPLATES } from "@/lib/contracts/starters";
import { assignableStaff, listTemplates } from "@/modules/documents/server/queries";
import { NewContractForm } from "@/modules/documents/components/new-contract-form";

export const metadata: Metadata = { title: "New contract" };

export default function NewContractPage(props: PageProps<"/w/[slug]/documents/contracts/new">) {
  return (
    <TenantPage params={props.params} anyOf={["contracts.manage"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const slug = ctx.company.slug;
        const back = `/w/${slug}/documents`;
        const [staff, templates] = await Promise.all([assignableStaff(ctx), listTemplates(ctx)]);
        return (
          <div className="mx-auto grid max-w-3xl gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Contracts
            </Link>
            <div>
              <h1 className="font-heading text-walnut text-2xl font-extrabold">
                Prepare a contract
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose who it&apos;s for and what to start from.
              </p>
            </div>
            {!hasFeature(ctx, "digital_contracts") ? (
              <UpgradePrompt
                prompt={featurePrompt(slug, ctx.plan.code, "digital_contracts")}
                canManage={can(ctx, "subscription.manage")}
              />
            ) : (
              <div className="bg-surface rounded-xl border p-5 sm:p-8">
                <NewContractForm
                  slug={slug}
                  staff={staff}
                  defaultStaff={typeof sp.staff === "string" ? sp.staff : undefined}
                  templates={templates}
                  starters={STARTER_TEMPLATES.map(({ key, name, summary, kind }) => ({
                    key,
                    name,
                    summary,
                    kind,
                  }))}
                  cancelHref={back}
                />
                <p className="text-muted-foreground mt-5 text-xs leading-relaxed">{STARTER_NOTE}</p>
              </div>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
