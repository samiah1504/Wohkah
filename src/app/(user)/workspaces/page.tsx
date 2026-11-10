import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Alert, Card, Skeleton } from "@/components/ui/display";
import { listMyWorkspaces } from "@/lib/tenancy";

export const metadata: Metadata = { title: "Your workspaces" };

const NOTICES: Record<string, string> = {
  "password-updated": "Your password has been updated.",
  "invitation-accepted": "Invitation accepted. Welcome aboard!",
};

export default function WorkspacesPage(props: PageProps<"/workspaces">) {
  return (
    <>
      <PageHeader
        title="Your workspaces"
        description="Each workspace belongs to one company. Your login works across all of them."
        actions={
          <Button asChild>
            <Link href="/onboarding">
              <PlusIcon /> Create a workspace
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-40" />}>
        <WorkspaceList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function WorkspaceList({
  searchParams,
}: {
  searchParams: PageProps<"/workspaces">["searchParams"];
}) {
  const sp = await searchParams;
  const workspaces = await listMyWorkspaces();
  const notice = typeof sp.notice === "string" ? NOTICES[sp.notice] : undefined;

  if (!notice && sp.all !== "1") {
    if (workspaces.length === 0) redirect("/onboarding");
    if (workspaces.length === 1) redirect(`/w/${workspaces[0]!.slug}`);
  }

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {workspaces.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          You&apos;re not a member of any workspace yet. Create one, or ask your employer to invite
          you.
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {workspaces.map((w) => (
            <li key={w.slug}>
              <Link
                href={`/w/${w.slug}`}
                className="group flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors hover:border-primary"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-lg font-extrabold text-walnut">
                  {w.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading font-bold">{w.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {w.roleNames.join(", ") || "Member"}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
