"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { BellIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { cn } from "@/lib/utils";
import { markNotificationRead } from "@/modules/billing/server/actions";

export type BellNotification = {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const when = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};

/** Notification centre: unread count, latest notifications, mark as read. */
export function NotificationBell({
  slug,
  notifications,
  tone = "light",
}: {
  slug: string;
  notifications: BellNotification[];
  tone?: "light" | "dark";
}) {
  const [items, markRead] = useOptimistic(notifications, (list, id: number) =>
    list.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
  );
  const [, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  const read = (id: number) =>
    startTransition(async () => {
      markRead(id);
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("id", String(id));
      await markNotificationRead({ status: "idle" }, fd);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "focus-visible:ring-ring relative inline-flex size-9 items-center justify-center rounded-lg outline-none focus-visible:ring-2",
          tone === "dark"
            ? "text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground"
            : "text-walnut hover:bg-subtle",
        )}
      >
        <BellIcon className="size-[18px]" />
        {unread ? (
          <span className="bg-primary text-walnut absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((n) => (
              <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read_at && "bg-sand/40")}>
                <div className="flex items-start gap-2">
                  {!n.read_at ? (
                    <span
                      className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                      aria-label="Unread"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{when(n.created_at)}</span>
                      {n.link?.startsWith("/") ? (
                        <Link
                          href={n.link}
                          className="text-walnut font-semibold hover:underline"
                          onClick={() => !n.read_at && read(n.id)}
                        >
                          Open
                        </Link>
                      ) : null}
                      {!n.read_at ? (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => read(n.id)}
                        >
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
