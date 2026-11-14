import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { listBranches } from "@/modules/workspace/server/queries";
import {
  getStaffMember,
  jobTitleSuggestions,
  managerOptions,
} from "@/modules/staff/server/queries";
import { StaffForm } from "@/modules/staff/components/staff-form";

export const metadata: Metadata = { title: "Edit staff" };

export default function EditStaffPage(props: PageProps<"/w/[slug]/staff/[id]/edit">) {
  return (
    <TenantPage params={props.params} anyOf={["staff.manage"]}>
      {async (ctx) => {
        const { id } = await props.params;
        const staff = await getStaffMember(ctx, id);
        if (!staff) notFound();
        const slug = ctx.company.slug;
        const back = `/w/${slug}/staff/${staff.id}`;
        const [branches, managers, titles] = await Promise.all([
          listBranches(ctx),
          managerOptions(ctx, staff.id),
          jobTitleSuggestions(ctx),
        ]);
        return (
          <div className="mx-auto grid max-w-4xl gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> {staff.full_name}
            </Link>
            <h1 className="font-heading text-walnut text-2xl font-extrabold">
              Edit {staff.full_name}
            </h1>
            <div className="bg-surface rounded-xl border p-5 sm:p-8">
              <StaffForm
                slug={slug}
                staff={{
                  id: staff.id,
                  firstName: staff.first_name ?? staff.full_name.split(" ")[0] ?? "",
                  lastName: staff.last_name ?? staff.full_name.split(" ").slice(1).join(" "),
                  email: staff.email,
                  phone: staff.phone,
                  jobTitle: staff.job_title,
                  employmentType: staff.employment_type,
                  startDate: staff.start_date,
                  branchId: staff.branch?.id ?? null,
                  reportsTo: staff.reports_to,
                }}
                branches={branches
                  .filter((b) => !b.archived_at || b.id === staff.branch?.id)
                  .map((b) => ({ id: b.id, name: b.name }))}
                managers={managers}
                jobTitles={titles}
                cancelHref={back}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
