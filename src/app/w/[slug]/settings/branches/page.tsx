import type { Metadata } from "next";
import { Building2Icon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { Badge, EmptyState } from "@/components/ui/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { limitOf } from "@/lib/entitlements";
import { can } from "@/lib/permissions";
import { limitPrompt } from "@/lib/upgrade";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { asAddress, listBranches } from "@/modules/workspace/server/queries";
import { BranchDialog } from "@/modules/workspace/components/settings-forms";
import { setBranchArchived } from "@/modules/workspace/server/actions";

export const metadata: Metadata = { title: "Branches" };

export default function BranchesPage(props: PageProps<"/w/[slug]/settings/branches">) {
  return (
    <TenantPage params={props.params} anyOf={["branches.manage"]}>
      {async (ctx) => {
        const all = await listBranches(ctx);
        const activeCount = all.filter((b) => !b.archived_at).length;
        const limit = limitOf(ctx, "branches");
        const atLimit = limit !== null && activeCount >= limit;
        const slug = ctx.company.slug;
        return (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {activeCount} active
                {limit !== null ? ` of ${limit} allowed on the ${ctx.plan.name} plan` : ""}.
              </p>
              <BranchDialog
                slug={slug}
                disabledReason={atLimit ? "You've reached your plan's branch limit." : undefined}
              />
            </div>
            {atLimit && limit !== null ? (
              <UpgradePrompt
                prompt={limitPrompt(slug, ctx.plan.code, "branches", limit)}
                canManage={can(ctx, "subscription.manage")}
              />
            ) : null}
            {all.length === 0 ? (
              <EmptyState
                icon={<Building2Icon />}
                title="No branches yet"
                description="Add your head office and any other locations where your team works."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((b) => {
                    const address = asAddress(b.address);
                    return (
                      <TableRow key={b.id} className={b.archived_at ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">
                          {b.name} {b.is_headquarters ? <Badge>Head office</Badge> : null}{" "}
                          {b.archived_at ? <Badge variant="neutral">Archived</Badge> : null}
                          {b.code ? (
                            <span className="text-muted-foreground ml-1 text-xs">{b.code}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {address.city ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{b.phone ?? "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {!b.archived_at ? (
                            <BranchDialog slug={slug} branch={{ ...b, address }} />
                          ) : null}
                          <ActionButton
                            action={setBranchArchived}
                            hidden={{ slug, id: b.id, archive: b.archived_at ? "false" : "true" }}
                            variant="ghost"
                            confirm={b.archived_at ? undefined : "Archive?"}
                          >
                            {b.archived_at ? "Restore" : "Archive"}
                          </ActionButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
