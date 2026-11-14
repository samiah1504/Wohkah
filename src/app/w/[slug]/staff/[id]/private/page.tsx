import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { getStaffMember, getStaffPrivate } from "@/modules/staff/server/queries";
import { PrivateDetailsForm } from "@/modules/staff/components/private-form";

export const metadata: Metadata = { title: "Private details" };

export default function PrivateDetailsPage(props: PageProps<"/w/[slug]/staff/[id]/private">) {
  return (
    <TenantPage params={props.params} anyOf={["staff.sensitive"]}>
      {async (ctx) => {
        const { id } = await props.params;
        const staff = await getStaffMember(ctx, id);
        if (!staff) notFound();
        const p = await getStaffPrivate(ctx, staff.id);
        const addr = (p?.home_address ?? {}) as Record<string, string | undefined>;
        const back = `/w/${ctx.company.slug}/staff/${staff.id}?tab=private`;
        return (
          <div className="mx-auto grid max-w-4xl gap-6">
            <Link
              href={back}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> {staff.full_name}
            </Link>
            <h1 className="font-heading text-walnut text-2xl font-extrabold">
              Private details for {staff.full_name}
            </h1>
            <div className="bg-surface rounded-xl border p-5 sm:p-8">
              <PrivateDetailsForm
                slug={ctx.company.slug}
                employeeId={staff.id}
                cancelHref={back}
                values={{
                  dateOfBirth: p?.date_of_birth ?? null,
                  gender: p?.gender ?? null,
                  addressLine1: addr.line1 ?? null,
                  addressLine2: addr.line2 ?? null,
                  city: addr.city ?? null,
                  state: addr.state ?? null,
                  emergencyName: p?.emergency_name ?? null,
                  emergencyPhone: p?.emergency_phone ?? null,
                  emergencyRelationship: p?.emergency_relationship ?? null,
                  kinName: p?.kin_name ?? null,
                  kinPhone: p?.kin_phone ?? null,
                  kinRelationship: p?.kin_relationship ?? null,
                  bankName: p?.bank_name ?? null,
                  bankAccountNumber: p?.bank_account_number ?? null,
                  bankAccountName: p?.bank_account_name ?? null,
                  tin: p?.tin ?? null,
                  pensionPin: p?.pension_pin ?? null,
                  pfaName: p?.pfa_name ?? null,
                }}
              />
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
