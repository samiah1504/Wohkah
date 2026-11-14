import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { listBranches } from "@/modules/workspace/server/queries";
import { jobTitleSuggestions, managerOptions } from "@/modules/staff/server/queries";
import { StaffForm } from "@/modules/staff/components/staff-form";

export const metadata: Metadata = { title: "Add staff" };

export default function NewStaffPage(props: PageProps<"/w/[slug]/staff/new">) {
  return (
    <TenantPage params={props.params} anyOf={["staff.manage"]}>
      {async (ctx) => {
        const slug = ctx.company.slug;
        const [branches, managers, titles] = await Promise.all([
          listBranches(ctx),
          managerOptions(ctx),
          jobTitleSuggestions(ctx),
        ]);
        return (
          <div className="mx-auto grid max-w-4xl gap-6">
            <Link
              href={`/w/${slug}/staff`}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> All staff
            </Link>
            <div>
              <h1 className="font-heading text-walnut text-2xl font-extrabold">
                Add a staff member
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Add their private details and documents after saving.
              </p>
            </div>
            <div className="bg-surface rounded-xl border p-5 sm:p-8">
              <StaffForm
                slug={slug}
                branches={branches
                  .filter((b) => !b.archived_at)
                  .map((b) => ({ id: b.id, name: b.name }))}
                managers={managers}
                jobTitles={titles}
                cancelHref={`/w/${slug}/staff`}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
