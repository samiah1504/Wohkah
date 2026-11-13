import { Suspense } from "react";
import { LockIcon } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { canAny, type Permission } from "@/lib/permissions";
import { requireTenant, type TenantContext } from "@/lib/tenancy";

/**
 * Wraps a workspace page: resolves the tenant from the URL (inside Suspense,
 * as Cache Components requires for session reads), checks the permission and
 * renders. Every page does this itself; it does not rely on the layout.
 */
export function TenantPage({
  params,
  anyOf,
  children,
}: {
  params: Promise<{ slug: string }>;
  /** At least one of these permissions is required. Omit for any member. */
  anyOf?: Permission[];
  children: (ctx: TenantContext) => Promise<React.ReactNode> | React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Resolve params={params} anyOf={anyOf} render={children} />
    </Suspense>
  );
}

async function Resolve({
  params,
  anyOf,
  render,
}: {
  params: Promise<{ slug: string }>;
  anyOf?: Permission[];
  render: (ctx: TenantContext) => Promise<React.ReactNode> | React.ReactNode;
}) {
  const { slug } = await params;
  const ctx = await requireTenant(slug);
  if (anyOf && !canAny(ctx, anyOf)) return <NoAccess />;
  return <>{await render(ctx)}</>;
}

export function NoAccess() {
  return (
    <EmptyState
      icon={<LockIcon />}
      title="You don't have access to this page"
      description="Ask the business owner if you need it."
    />
  );
}

function PageSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}
