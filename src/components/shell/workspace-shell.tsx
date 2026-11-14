import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/display";
import { canAny, can } from "@/lib/permissions";
import { NAV } from "@/lib/copy/navigation";
import { listMyWorkspaces, requireTenant, type TenantContext } from "@/lib/tenancy";
import { getProfileName } from "./user-shell";
import { SubscriptionBanner } from "./subscription-banner";
import { UserMenu } from "./user-menu";
import { BottomNav, SidebarNav, WorkspaceSwitcher, type NavItem } from "./workspace-nav";

/**
 * Navigation is built from the user's permissions. Modules that don't exist
 * yet (attendance, leave, payroll…) are not shown at all, rather than as
 * dead links. Hiding is cosmetic; the server and database enforce access.
 */
export function navItemsFor(ctx: TenantContext): NavItem[] {
  const base = `/w/${ctx.company.slug}`;
  const items: NavItem[] = [{ key: "home", label: NAV.home.label, href: base }];
  if (can(ctx, "staff.view"))
    items.push({ key: "staff", label: NAV.staff.label, href: `${base}/staff` });
  else items.push({ key: "me", label: NAV.me.label, href: `${base}/me` });
  if (can(ctx, "members.view"))
    items.push({ key: "members", label: NAV.access.label, href: `${base}/members` });
  if (can(ctx, "roles.view"))
    items.push({ key: "roles", label: NAV.roles.label, href: `${base}/roles` });
  if (
    canAny(ctx, [
      "company.settings.manage",
      "branches.manage",
      "holidays.manage",
      "work_locations.manage",
      "subscription.view",
      "audit.view",
    ])
  ) {
    items.push({ key: "settings", label: NAV.settings.label, href: `${base}/settings` });
  }
  items.push({ key: "profile", label: NAV.profile.label, href: "/account" });
  return items;
}

export async function WorkspaceShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const ctx = await requireTenant(slug);
  const [workspaces, name] = await Promise.all([listMyWorkspaces(), getProfileName(ctx.user.id)]);
  const items = navItemsFor(ctx);
  const current = { slug: ctx.company.slug, name: ctx.company.name };

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 p-4 lg:flex">
        <div className="px-2 pt-1">
          <Logo tone="light" />
        </div>
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
        <SidebarNav items={items} />
        <div className="mt-auto">
          <UserMenu name={name} email={ctx.user.email} tone="dark" align="start" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher current={current} workspaces={workspaces} tone="light" />
          </div>
          <UserMenu name={name} email={ctx.user.email} />
        </header>
        {ctx.company.status !== "active" ? (
          <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
            This business account is {ctx.company.status}. Contact WOHKAH support for help.
          </Alert>
        ) : null}
        <SubscriptionBanner ctx={ctx} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
