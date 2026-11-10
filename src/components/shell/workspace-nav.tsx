"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";

export type NavKey = "home" | "members" | "roles" | "settings" | "profile";
export type NavItem = { key: NavKey; label: string; href: string };

const ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  members: UsersIcon,
  roles: ShieldIcon,
  settings: SettingsIcon,
  profile: UserIcon,
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.key === "home") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Desktop sidebar links. */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="grid gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.key];
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-active text-white"
                : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom navigation (employee portal is mobile-first). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workspace"
      className="bg-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const active = isActive(pathname, item);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  active ? "text-walnut" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "text-primary")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function WorkspaceSwitcher({
  current,
  workspaces,
  tone = "dark",
}: {
  current: { slug: string; name: string };
  workspaces: { slug: string; name: string; roleNames: string[] }[];
  tone?: "dark" | "light";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "focus-visible:ring-ring flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2",
          tone === "dark" ? "hover:bg-sidebar-active text-white" : "text-walnut hover:bg-subtle",
        )}
      >
        <span className="bg-primary font-heading text-walnut flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-extrabold">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="font-heading min-w-0 flex-1 truncate text-sm font-bold">
          {current.name}
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.slug} asChild>
            <Link href={`/w/${w.slug}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {w.roleNames.join(", ")}
                </span>
              </span>
              {w.slug === current.slug ? <CheckIcon className="text-primary" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <PlusIcon /> Create a workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
