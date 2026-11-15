import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Badge, EmptyState } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/entitlements";
import { featurePrompt } from "@/lib/upgrade";
import { formatDate } from "@/lib/dates";
import { NAV } from "@/lib/copy/navigation";
import { listJobDescriptions } from "@/modules/documents/server/queries";
import { DocumentsNav } from "@/modules/documents/components/shared";

export const metadata: Metadata = { title: "Job descriptions" };

export default function JobDescriptionsPage(
  props: PageProps<"/w/[slug]/documents/job-descriptions">,
) {
  return (
    <TenantPage params={props.params} anyOf={["job_descriptions.manage"]}>
      {async (ctx) => {
        const slug = ctx.company.slug;
        const base = `/w/${slug}/documents/job-descriptions`;
        const rows = await listJobDescriptions(ctx);
        const featureOn = hasFeature(ctx, "job_descriptions");
        const contracts = can(ctx, "contracts.manage") || can(ctx, "contracts.sign");
        return (
          <>
            <PageHeader
              title={NAV.documents.title}
              description={NAV.documents.description}
              actions={
                featureOn ? (
                  <Button asChild>
                    <Link href={`${base}/new`}>
                      <PlusIcon /> New job description
                    </Link>
                  </Button>
                ) : null
              }
            />
            <DocumentsNav
              slug={slug}
              current="job-descriptions"
              show={{ contracts, jobDescriptions: true, templates: can(ctx, "contracts.manage") }}
            />
            <div className="grid gap-6">
              {!featureOn ? (
                <UpgradePrompt
                  prompt={featurePrompt(slug, ctx.plan.code, "job_descriptions")}
                  canManage={can(ctx, "subscription.manage")}
                />
              ) : null}
              {rows.length === 0 ? (
                <EmptyState
                  icon={<ClipboardListIcon />}
                  title="No job descriptions yet"
                  description="Write down what each job involves. Staff read it in their staff portal and confirm they understand it, and you see who has."
                  action={
                    featureOn ? (
                      <Button asChild>
                        <Link href={`${base}/new`}>
                          <PlusIcon /> Write your first job description
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="bg-surface divide-y overflow-hidden rounded-xl border">
                  {rows.map((jd) => (
                    <li key={jd.id}>
                      <Link
                        href={`${base}/${jd.id}`}
                        className="hover:bg-subtle/60 grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{jd.title}</span>
                          <span className="text-muted-foreground block text-sm">
                            Version {jd.version} · updated {formatDate(jd.updated_at.slice(0, 10))}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm">
                            {jd.staffCount === 0
                              ? "No staff yet"
                              : `${jd.acknowledged} of ${jd.staffCount} confirmed`}
                          </span>
                          {jd.staffCount > 0 && jd.acknowledged < jd.staffCount ? (
                            <Badge variant="warning">Waiting</Badge>
                          ) : jd.staffCount > 0 ? (
                            <Badge variant="success">All confirmed</Badge>
                          ) : null}
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
