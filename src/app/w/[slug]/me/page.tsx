import type { Metadata } from "next";
import { ContactIcon, LockIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { EmptyState } from "@/components/ui/display";
import { NAV } from "@/lib/copy/navigation";
import {
  getMyStaffRecordId,
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

export const metadata: Metadata = { title: NAV.me.title };

/** The staff portal view of a person's own record. Read only: changes go through a manager. */
export default function MyRecordPage(props: PageProps<"/w/[slug]/me">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const id = await getMyStaffRecordId(ctx);
        const staff = id ? await getStaffMember(ctx, id) : null;
        if (!staff) {
          return (
            <EmptyState
              icon={<ContactIcon />}
              title="No staff record linked to your sign-in"
              description="When the business links your staff record to your sign-in, you'll see it here."
            />
          );
        }
        const base = `/w/${ctx.company.slug}/me`;
        const requested = typeof sp.tab === "string" ? sp.tab : "overview";
        const tab: ProfileTab = (["private", "documents", "history"] as const).includes(
          requested as "private",
        )
          ? (requested as ProfileTab)
          : "overview";
        // Document links go to the staff document route, which checks access itself.
        const docBase = `/w/${ctx.company.slug}/staff/${staff.id}`;

        return (
          <div className="grid gap-6">
            <ProfileHeader staff={staff} />
            <p className="text-muted-foreground bg-subtle flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
              <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {NAV.me.description}
            </p>
            <ProfileTabs base={base} current={tab} showPrivate />
            {tab === "overview" ? <OverviewTab staff={staff} base={base} self /> : null}
            {tab === "private" ? <PrivateTab data={await getStaffPrivate(ctx, staff.id)} /> : null}
            {tab === "documents" ? (
              <DocumentsTab
                slug={ctx.company.slug}
                base={docBase}
                docs={(await listStaffDocuments(ctx, staff.id)).filter((d) => !d.archived_at)}
                canManage={false}
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
