import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

/** Shown for unknown workspaces AND ones the user isn't a member of (no existence leak). */
export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="font-heading text-2xl font-extrabold text-walnut">Workspace not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This workspace doesn&apos;t exist, or you don&apos;t have access to it. If you were invited,
        open the invitation link from your email.
      </p>
      <Button asChild>
        <Link href="/workspaces?all=1">Go to your workspaces</Link>
      </Button>
    </div>
  );
}
