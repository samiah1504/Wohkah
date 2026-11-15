import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { STARTER_NOTE, starterTemplate } from "@/lib/contracts/starters";
import { TemplateForm } from "@/modules/documents/components/forms";

export const metadata: Metadata = { title: "New template" };

const BLANK = `# Document title

This agreement is between **{{Business name}}** and **{{Staff name}}**.

## 1. First section
Write here.
`;

export default function NewTemplatePage(props: PageProps<"/w/[slug]/documents/templates/new">) {
  return (
    <TenantPage params={props.params} anyOf={["contracts.manage"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const starter = typeof sp.starter === "string" ? starterTemplate(sp.starter) : undefined;
        const back = `/w/${ctx.company.slug}/documents/templates`;
        return (
          <div className="grid gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Templates
            </Link>
            <div>
              <h1 className="font-heading text-walnut text-2xl font-extrabold">
                {starter ? `New template: ${starter.name}` : "New template"}
              </h1>
              {starter ? (
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">{STARTER_NOTE}</p>
              ) : null}
            </div>
            <div className="bg-surface rounded-xl border p-5 sm:p-6">
              <TemplateForm
                slug={ctx.company.slug}
                cancelHref={back}
                template={{
                  name: starter?.name ?? "",
                  kind: starter?.kind ?? "contract",
                  body: starter?.body ?? BLANK,
                  starterKey: starter?.key ?? null,
                }}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
