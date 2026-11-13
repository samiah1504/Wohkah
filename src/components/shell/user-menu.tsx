"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LogOutIcon, UserIcon, LayoutGridIcon } from "lucide-react";
import { Avatar } from "@/components/ui/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { signOut } from "@/modules/identity/server/actions";

export function UserMenu({
  name,
  email,
  align = "end",
  tone = "light",
}: {
  name: string;
  email: string;
  align?: "start" | "end";
  tone?: "light" | "dark";
}) {
  const [signingOut, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          tone === "dark"
            ? "text-sidebar-foreground hover:bg-sidebar-active focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none focus-visible:ring-2"
            : "focus-visible:ring-ring flex items-center gap-2 rounded-full outline-none focus-visible:ring-2"
        }
        aria-label="Account menu"
      >
        <Avatar name={name || email} className="size-8" />
        {tone === "dark" ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name || "Your account"}</span>
            <span className="text-sidebar-muted block truncate text-xs">{email}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel>
          <span className="text-foreground block truncate">{name || "Your account"}</span>
          <span className="block truncate font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon /> Account and security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/workspaces?all=1">
            <LayoutGridIcon /> All your businesses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Call the action directly: the menu unmounts on select, before a
            nested form could submit. */}
        <DropdownMenuItem disabled={signingOut} onSelect={() => startTransition(() => signOut())}>
          <LogOutIcon /> {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
