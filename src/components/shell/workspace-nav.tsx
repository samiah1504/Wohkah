"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ClipboardCheckIcon,
  HomeIcon,
  LayoutGridIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { activeSection, bottomBarFor, type NavSection, type SectionKey } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { NotificationBell, type BellNotification } from "./notification-bell";
import { UserMenu } from "./user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";

const ICONS: Record<SectionKey, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  people: UsersIcon,
  salaries: WalletIcon,
  settings: SettingsIcon,
  work: ClipboardCheckIcon,
  attendance: CalendarCheckIcon,
  more: LayoutGridIcon,
};

const SIDEBAR_COOKIE = "wk_sidebar";

/**
 * Desktop and tablet sidebar: six sections with their sub-pages, collapsible
 * to icons. The open/closed choice is remembered in a cookie.
 */
export function Sidebar({
  sections,
  initialCollapsed,
  current,
  workspaces,
  user,
  notifications,
}: {
  sections: NavSection[];
  initialCollapsed: boolean;
  current: { slug: string; name: string };
  workspaces: { slug: string; name: string; roleNames: string[] }[];
  user: { name: string; email: string };
  notifications: BellNotification[];
}) {
  const pathname = usePathname();
  const active = activeSection(sections, pathname);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [open, setOpen] = useState<SectionKey | null>(active);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <aside
      className={cn(
        "bg-sidebar sticky top-0 hidden h-screen shrink-0 flex-col gap-4 overflow-y-auto py-4 transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px] px-2" : "w-64 px-3",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 pt-1",
          collapsed ? "flex-col" : "justify-between pl-2",
        )}
      >
        {collapsed ? (
          <span
            className="bg-primary font-heading text-walnut flex size-9 items-center justify-center rounded-lg text-base font-extrabold"
            aria-label="WOHKAH"
          >
            W
          </span>
        ) : (
          <Logo tone="light" />
        )}
        <NotificationBell slug={current.slug} notifications={notifications} tone="dark" />
      </div>
      <WorkspaceSwitcher current={current} workspaces={workspaces} compact={collapsed} />
      <nav aria-label="Business" className="grid gap-0.5">
        {sections.map((section) => {
          const Icon = ICONS[section.key];
          const isActive = active === section.key;
          const links = section.children.filter((c) => c.href);
          const expanded = !collapsed && open === section.key && links.length > 0;
          return (
            <div key={section.key}>
              <div className="flex items-center">
                <Link
                  href={section.href}
                  aria-current={isActive && pathname === section.href ? "page" : undefined}
                  title={collapsed ? section.label : undefined}
                  onClick={() => setOpen(section.key)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", isActive && "text-primary")} />
                  {collapsed ? <span className="sr-only">{section.label}</span> : section.label}
                </Link>
                {!collapsed && links.length ? (
                  <button
                    type="button"
                    onClick={() => setOpen((o) => (o === section.key ? null : section.key))}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Hide" : "Show"} ${section.label} pages`}
                    className="text-sidebar-muted hover:text-sidebar-foreground ml-1 rounded-md p-1.5"
                  >
                    <ChevronDownIcon
                      className={cn("size-4 transition-transform", expanded && "rotate-180")}
                    />
                  </button>
                ) : null}
              </div>
              {expanded ? (
                <ul className="border-sidebar-active my-1 ml-5 grid gap-0.5 border-l pl-3">
                  {links.map((c) => {
                    const here = isCurrent(pathname, c.href!);
                    return (
                      <li key={c.key}>
                        <Link
                          href={c.href!}
                          aria-current={here ? "page" : undefined}
                          className={cn(
                            "block truncate rounded-md px-2 py-1.5 text-[13px] transition-colors",
                            here
                              ? "text-primary font-semibold"
                              : "text-sidebar-muted hover:text-sidebar-foreground",
                          )}
                        >
                          {c.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
          className={cn(
            "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-active/60 flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-[18px]" />
          ) : (
            <PanelLeftCloseIcon className="size-[18px]" />
          )}
          {collapsed ? null : "Collapse menu"}
        </button>
        <UserMenu
          name={user.name}
          email={user.email}
          tone="dark"
          align="start"
          compact={collapsed}
        />
      </div>
    </aside>
  );
}

/** A sub-page link is current when the path (and tab, if any) matches. */
function isCurrent(pathname: string, href: string) {
  const [path] = href.split("?");
  return pathname === path;
}

/** Mobile bottom bar: five sections at most, large touch targets, safe-area aware. */
export function BottomNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const items = bottomBarFor(sections);
  const active = activeSection(sections, pathname);
  return (
    <nav
      aria-label="Business"
      className="bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((s) => {
          const Icon = ICONS[s.key];
          const isActive = active === s.key || (s.key === "more" && active === "settings");
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  isActive ? "text-walnut" : "text-muted-foreground",
                )}
              >
                {isActive ? (
                  <span className="bg-primary absolute top-0 h-0.5 w-8 rounded-full" aria-hidden />
                ) : null}
                <Icon className={cn("size-5", isActive && "text-primary")} />
                <span className="max-w-full truncate px-1">{s.shortLabel}</span>
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
  compact = false,
}: {
  current: { slug: string; name: string };
  workspaces: { slug: string; name: string; roleNames: string[] }[];
  tone?: "dark" | "light";
  /** Icon only (collapsed sidebar). */
  compact?: boolean;
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
        {compact ? (
          <span className="sr-only">{current.name}: switch business</span>
        ) : (
          <>
            <span className="font-heading min-w-0 flex-1 truncate text-sm font-bold">
              {current.name}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch business</DropdownMenuLabel>
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
            <PlusIcon /> Add another business
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
