import type { Metadata } from "next";
import Link from "next/link";
import { FileTextIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Alert, Badge } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/entitlements";
import { featurePrompt } from "@/lib/upgrade";
import { formatDate } from "@/lib/dates";
import { NAV } from "@/lib/copy/navigation";
import { CONTRACT_KIND } from "@/lib/copy/documents";
import { STARTER_NOTE, STARTER_TEMPLATES } from "@/lib/contracts/starters";
import { listTemplates } from "@/modules/documents/server/queries";
import { setTemplateArchived } from "@/modules/documents/server/actions";
import { DocumentsNav } from "@/modules/documents/components/shared";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage(props: PageProps<"/w/[slug]/documents/templates">) {
  return (
    <TenantPage params={props.params} anyOf={["contracts.manage"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const slug = ctx.company.slug;
        const base = `/w/${slug}/documents/templates`;
        const showArchived = sp.archived === "1";
        const templates = await listTemplates(ctx, true);
        const active = templates.filter((t) => !t.archived_at);
        const archived = templates.filter((t) => t.archived_at);
        const featureOn = hasFeature(ctx, "digital_contracts");
        const used = new Set(templates.map((t) => t.starter_key).filter(Boolean));
        return (
          <>
            <PageHeader
              title={NAV.documents.title}
              description={NAV.documents.description}
              actions={
                featureOn ? (
                  <Button asChild>
                    <Link href={`${base}/new`}>
                      <PlusIcon /> New template
                    </Link>
                  </Button>
                ) : null
              }
            />
            <DocumentsNav
              slug={slug}
              current="templates"
              show={{
                contracts: true,
                jobDescriptions: can(ctx, "job_descriptions.manage"),
                templates: true,
              }}
            />
            <div className="grid gap-8">
              {sp.saved === "1" ? <Alert variant="success">Template saved.</Alert> : null}
              {!featureOn ? (
                <UpgradePrompt
                  prompt={featurePrompt(slug, ctx.plan.code, "digital_contracts")}
                  canManage={can(ctx, "subscription.manage")}
                />
              ) : null}

              <section aria-labelledby="yours" className="grid gap-3">
                <h2 id="yours" className="font-heading text-walnut text-lg font-bold">
                  Your templates
                </h2>
                {active.length === 0 ? (
                  <p className="bg-surface text-muted-foreground rounded-xl border px-5 py-6 text-sm">
                    No templates yet. Start from one of the starter templates below, or write your
                    own.
                  </p>
                ) : (
                  <ul className="bg-surface divide-y rounded-xl border">
                    {active.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <Link
                          href={`${base}/${t.id}`}
                          className="flex min-w-0 items-center gap-3 hover:underline"
                        >
                          <FileTextIcon className="text-walnut size-4 shrink-0" aria-hidden />
                          <span className="truncate font-semibold">{t.name}</span>
                        </Link>
                        <span className="flex items-center gap-3">
                          <Badge variant="neutral">{CONTRACT_KIND[t.kind].label}</Badge>
                          <span className="text-muted-foreground text-xs">
                            Updated {formatDate(t.updated_at.slice(0, 10))}
                          </span>
                          <ActionButton
                            action={setTemplateArchived}
                            hidden={{ slug, id: t.id, archived: "true" }}
                            variant="ghost"
                          >
                            Archive
                          </ActionButton>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {archived.length ? (
                  showArchived ? (
                    <ul className="bg-surface divide-y rounded-xl border opacity-80">
                      {archived.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <span className="text-muted-foreground truncate">{t.name}</span>
                          <ActionButton
                            action={setTemplateArchived}
                            hidden={{ slug, id: t.id, archived: "false" }}
                            variant="ghost"
                          >
                            Restore
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link
                      href={`${base}?archived=1`}
                      className="text-muted-foreground w-fit text-sm hover:underline"
                    >
                      Show {archived.length} archived
                    </Link>
                  )
                ) : null}
              </section>

              <section aria-labelledby="starters" className="grid gap-3">
                <div>
                  <h2 id="starters" className="font-heading text-walnut text-lg font-bold">
                    Starter templates
                  </h2>
                  <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{STARTER_NOTE}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {STARTER_TEMPLATES.map((s) => (
                    <li key={s.key} className="bg-surface flex flex-col rounded-xl border p-5">
                      <div className="flex items-start justify-between gap-3">
                        <SparklesIcon className="text-primary size-5" aria-hidden />
                        <Badge variant="neutral">{CONTRACT_KIND[s.kind].label}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{s.name}</h3>
                      <p className="text-muted-foreground mt-1 flex-1 text-sm">{s.summary}</p>
                      {featureOn ? (
                        <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                          <Link href={`${base}/new?starter=${s.key}`}>
                            {used.has(s.key) ? "Use again" : "Use this template"}
                          </Link>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        );
      }}
    </TenantPage>
  );
}
