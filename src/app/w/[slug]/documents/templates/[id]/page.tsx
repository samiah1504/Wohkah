import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { getTemplate } from "@/modules/documents/server/queries";
import { TemplateForm } from "@/modules/documents/components/forms";

export const metadata: Metadata = { title: "Edit template" };

export default function EditTemplatePage(props: PageProps<"/w/[slug]/documents/templates/[id]">) {
  return (
    <TenantPage params={props.params} anyOf={["contracts.manage"]}>
      {async (ctx) => {
        const { id } = await props.params;
        const t = await getTemplate(ctx, id);
        if (!t) notFound();
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
              <h1 className="font-heading text-walnut text-2xl font-extrabold">{t.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Changes apply to documents you prepare from now on. Documents already sent stay as
                they were.
              </p>
            </div>
            <div className="bg-surface rounded-xl border p-5 sm:p-6">
              <TemplateForm
                slug={ctx.company.slug}
                cancelHref={back}
                template={{ id: t.id, name: t.name, kind: t.kind, body: t.body }}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
