import { Suspense } from "react";
import { Skeleton } from "@/components/ui/display";
import { WorkspaceShell } from "@/components/shell/workspace-shell";

/**
 * Workspace layout. Tenant resolution reads the session, so it streams behind
 * a Suspense boundary (Cache Components). Pages re-check access themselves;
 * this layout is not the security boundary.
 */
export default function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

async function Shell({
  params,
  children,
}: {
  params: LayoutProps<"/w/[slug]">["params"];
  children: React.ReactNode;
}) {
  const { slug } = await params;
  return <WorkspaceShell slug={slug}>{children}</WorkspaceShell>;
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="bg-sidebar hidden w-64 lg:block" />
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-9 w-64" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
