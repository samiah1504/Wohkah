import { cookies } from "next/headers";
import { Alert } from "@/components/ui/display";
import { listMyWorkspaces, requireTenant } from "@/lib/tenancy";
import { navigationFor } from "@/lib/navigation";
import { listMyNotifications } from "@/modules/billing/server/queries";
import { getMyStaffRecordId } from "@/modules/staff/server/queries";
import { getProfileName } from "./user-shell";
import { SubscriptionBanner } from "./subscription-banner";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { BottomNav, Sidebar, WorkspaceSwitcher } from "./workspace-nav";

/**
 * The business shell: a collapsible sidebar on tablets and desktops, a
 * five-item bottom bar on phones. Navigation comes from the person's
 * permissions (src/lib/navigation); pages and the database check access again.
 */
export async function WorkspaceShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const ctx = await requireTenant(slug);
  const [workspaces, name, staffRecordId, notifications, cookieStore] = await Promise.all([
    listMyWorkspaces(),
    getProfileName(ctx.user.id),
    getMyStaffRecordId(ctx),
    listMyNotifications(ctx),
    cookies(),
  ]);
  const sections = navigationFor({
    slug: ctx.company.slug,
    permissions: ctx.permissions,
    hasStaffRecord: Boolean(staffRecordId),
  });
  const current = { slug: ctx.company.slug, name: ctx.company.name };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        sections={sections}
        initialCollapsed={cookieStore.get("wk_sidebar")?.value === "collapsed"}
        current={current}
        workspaces={workspaces}
        user={{ name, email: ctx.user.email }}
        notifications={notifications}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface/95 sticky top-0 z-30 flex h-14 items-center gap-1 border-b px-3 backdrop-blur md:hidden">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher current={current} workspaces={workspaces} tone="light" />
          </div>
          <NotificationBell slug={ctx.company.slug} notifications={notifications} />
          <UserMenu name={name} email={ctx.user.email} />
        </header>
        {ctx.company.status !== "active" ? (
          <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
            This business account is {ctx.company.status}. Contact WOHKAH support for help.
          </Alert>
        ) : null}
        <SubscriptionBanner ctx={ctx} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav sections={sections} />
    </div>
  );
}
