import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { can } from "@/lib/permissions";
import {
  getStaffMember,
  getStaffPrivate,
  listStaffDocuments,
  listStaffHistory,
} from "@/modules/staff/server/queries";
import {
  DocumentsTab,
  HistoryTab,
  OverviewTab,
  PrivateTab,
  ProfileHeader,
  ProfileTabs,
  type ProfileTab,
} from "@/modules/staff/components/profile-view";
import {
  ChangeStatus,
  InviteToPortal,
  UploadDocument,
} from "@/modules/staff/components/profile-actions";

export const metadata: Metadata = { title: "Staff record" };

export default function StaffProfilePage(props: PageProps<"/w/[slug]/staff/[id]">) {
  return (
    <TenantPage params={props.params} anyOf={["staff.view"]}>
      {async (ctx) => {
        const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
        const staff = await getStaffMember(ctx, id);
        if (!staff) notFound();
        const slug = ctx.company.slug;
        const base = `/w/${slug}/staff/${staff.id}`;
        const canPrivate = can(ctx, "staff.sensitive");
        const canManage = can(ctx, "staff.manage");
        const requested = typeof sp.tab === "string" ? sp.tab : "overview";
        const tab: ProfileTab =
          requested === "history" ||
          (canPrivate && (requested === "private" || requested === "documents"))
            ? requested
            : "overview";

        const notice =
          sp.added === "1"
            ? `${staff.full_name} has been added.`
            : sp.saved === "1"
              ? "Changes saved."
              : null;

        return (
          <div className="grid gap-6">
            <Link
              href={`/w/${slug}/staff`}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> All staff
            </Link>
            {notice ? <Alert variant="success">{notice}</Alert> : null}
            <ProfileHeader
              staff={staff}
              actions={
                canManage ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${base}/edit`}>
                        <PencilIcon /> Edit
                      </Link>
                    </Button>
                    <ChangeStatus
                      slug={slug}
                      id={staff.id}
                      name={staff.first_name ?? staff.full_name}
                      status={staff.status}
                    />
                    {!staff.member_id && can(ctx, "members.invite") ? (
                      <InviteToPortal slug={slug} id={staff.id} email={staff.email} />
                    ) : null}
                  </>
                ) : null
              }
            />
            <ProfileTabs base={base} current={tab} showPrivate={canPrivate} />
            {tab === "overview" ? <OverviewTab staff={staff} base={base} /> : null}
            {tab === "private" ? (
              <PrivateTab
                data={await getStaffPrivate(ctx, staff.id)}
                editHref={`${base}/private`}
              />
            ) : null}
            {tab === "documents" ? (
              <DocumentsTab
                slug={slug}
                base={base}
                docs={await listStaffDocuments(ctx, staff.id)}
                canManage={canManage}
                upload={
                  canManage ? <UploadDocument slug={slug} employeeId={staff.id} /> : undefined
                }
              />
            ) : null}
            {tab === "history" ? (
              <HistoryTab
                items={await listStaffHistory(ctx, staff.id)}
                timezone={ctx.company.timezone}
              />
            ) : null}
          </div>
        );
      }}
    </TenantPage>
  );
}
