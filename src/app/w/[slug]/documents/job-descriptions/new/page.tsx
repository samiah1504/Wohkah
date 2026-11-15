import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { JOB_DESCRIPTION_STARTER } from "@/lib/contracts/starters";
import { JobDescriptionForm } from "@/modules/documents/components/forms";

export const metadata: Metadata = { title: "New job description" };

export default function NewJobDescriptionPage(
  props: PageProps<"/w/[slug]/documents/job-descriptions/new">,
) {
  return (
    <TenantPage params={props.params} anyOf={["job_descriptions.manage"]}>
      {(ctx) => {
        const back = `/w/${ctx.company.slug}/documents/job-descriptions`;
        return (
          <div className="grid gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Job descriptions
            </Link>
            <h1 className="font-heading text-walnut text-2xl font-extrabold">
              New job description
            </h1>
            <div className="bg-surface rounded-xl border p-5 sm:p-6">
              <JobDescriptionForm
                slug={ctx.company.slug}
                cancelHref={back}
                jd={{ title: "", body: JOB_DESCRIPTION_STARTER }}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
