import type { Metadata } from "next";
import Link from "next/link";
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
import { listContracts, staffJobDescription } from "@/modules/documents/server/queries";
import { ContractsTab, JobDescriptionTab } from "@/modules/documents/components/staff-tabs";

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
        const [myContracts, myJd] = await Promise.all([
          listContracts(ctx, "all", staff.id),
          staffJobDescription(ctx, staff.id),
        ]);
        const toSign = myContracts.filter(
          (c) =>
            c.status === "awaiting_signatures" && !c.signatures.some((s) => s.party === "staff"),
        );
        const jdToConfirm = myJd && !myJd.acknowledgedAt ? myJd : null;
        const requested = typeof sp.tab === "string" ? sp.tab : "overview";
        const tab: ProfileTab = (
          ["job", "contracts", "private", "documents", "history"] as const
        ).includes(requested as "private")
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
            {toSign.length || jdToConfirm ? (
              <section
                aria-labelledby="todo"
                className="border-primary/40 bg-sand/50 rounded-xl border p-4 sm:p-5"
              >
                <h2 id="todo" className="text-walnut font-semibold">
                  Waiting for you
                </h2>
                <ul className="mt-2 divide-y">
                  {toSign.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <span className="text-sm font-medium">{c.title}</span>
                      <Link
                        href={`/w/${ctx.company.slug}/sign/${c.id}`}
                        className="bg-primary text-walnut rounded-md px-3 py-1.5 text-sm font-semibold"
                      >
                        {c.kind === "contract" ? "Review and sign" : "Read and confirm"}
                      </Link>
                    </li>
                  ))}
                  {jdToConfirm ? (
                    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <span className="text-sm font-medium">
                        Your job description: {jdToConfirm.title}
                      </span>
                      <Link
                        href={`${base}?tab=job`}
                        className="bg-primary text-walnut rounded-md px-3 py-1.5 text-sm font-semibold"
                      >
                        Read and confirm
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}
            <ProfileTabs
              base={base}
              current={tab}
              showPrivate
              extra={[
                ["job", "Job description"],
                ["contracts", "Contracts"],
              ]}
            />
            {tab === "overview" ? <OverviewTab staff={staff} base={base} self /> : null}
            {tab === "job" ? (
              <JobDescriptionTab
                slug={ctx.company.slug}
                jd={myJd}
                self
                timezone={ctx.company.timezone}
              />
            ) : null}
            {tab === "contracts" ? (
              <ContractsTab
                slug={ctx.company.slug}
                rows={myContracts.filter((c) => c.status !== "draft")}
                self
              />
            ) : null}
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
