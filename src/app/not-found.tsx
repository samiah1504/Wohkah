import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

/**
 * Shown for unknown pages, unknown workspaces AND workspaces the user isn't a
 * member of. The wording is deliberately the same in every case so a
 * workspace's existence is never revealed.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="font-heading text-walnut text-2xl font-extrabold">Page not found</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        This page or workspace doesn&apos;t exist, or you don&apos;t have access to it. If you were
        invited to a workspace, open the invitation link from your email.
      </p>
      <Button asChild>
        <Link href="/workspaces?all=1">Go to your workspaces</Link>
      </Button>
    </div>
  );
}
