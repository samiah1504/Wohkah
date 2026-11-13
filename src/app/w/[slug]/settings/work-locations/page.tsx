import type { Metadata } from "next";
import { MapPinIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Badge, EmptyState } from "@/components/ui/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { workLocationPrompt } from "@/lib/upgrade";
import { getWorkspaceAllowances } from "@/modules/billing/server/queries";
import { asAddress, listBranches, listWorkLocations } from "@/modules/workspace/server/queries";
import { WorkLocationDialog } from "@/modules/workspace/components/settings-forms";
import { setWorkLocationArchived } from "@/modules/workspace/server/actions";

export const metadata: Metadata = { title: "Work locations" };

export default function WorkLocationsPage(props: PageProps<"/w/[slug]/settings/work-locations">) {
  return (
    <TenantPage params={props.params} anyOf={["work_locations.manage"]}>
      {async (ctx) => {
        const [all, branches, allowances] = await Promise.all([
          listWorkLocations(ctx),
          listBranches(ctx),
          getWorkspaceAllowances(ctx),
        ]);
        const used = allowances.used_work_locations;
        const limit = allowances.work_locations;
        const atLimit = limit !== null && used >= limit;
        const slug = ctx.company.slug;
        const activeBranches = branches
          .filter((b) => !b.archived_at)
          .map((b) => ({ id: b.id, name: b.name }));
        return (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground max-w-xl text-sm">
                Approved work locations are the places where staff may clock in. A branch is part of
                how your business is organised; one branch can have several work locations.{" "}
                <span className="text-foreground font-medium">
                  {used} in use{limit !== null ? ` of ${limit} on your subscription` : ""}.
                </span>
              </p>
              <WorkLocationDialog
                slug={slug}
                branches={activeBranches}
                disabledReason={
                  atLimit ? "You're using all the work locations on your subscription." : undefined
                }
              />
            </div>
            {atLimit && limit !== null ? (
              <UpgradePrompt
                prompt={workLocationPrompt(slug, allowances.plan_code, used, limit)}
                canManage={can(ctx, "subscription.manage")}
              />
            ) : null}
            {all.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon />}
                title="No work locations yet"
                description="Add the shop, office or site where your staff work. Clock-in by location arrives with attendance."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Branch</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((w) => {
                    const address = asAddress(w.address);
                    const branch = Array.isArray(w.branch) ? w.branch[0] : w.branch;
                    return (
                      <TableRow key={w.id} className={w.archived_at ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">
                          {w.name}{" "}
                          {w.archived_at ? <Badge variant="neutral">Archived</Badge> : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {branch?.name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {address.city ?? "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {!w.archived_at ? (
                            <WorkLocationDialog
                              slug={slug}
                              branches={activeBranches}
                              location={{ id: w.id, name: w.name, branch_id: w.branch_id, address }}
                            />
                          ) : null}
                          {w.archived_at && atLimit ? null : (
                            <ActionButton
                              action={setWorkLocationArchived}
                              hidden={{ slug, id: w.id, archive: w.archived_at ? "false" : "true" }}
                              variant="ghost"
                              confirm={w.archived_at ? undefined : "Archive?"}
                            >
                              {w.archived_at ? "Restore" : "Archive"}
                            </ActionButton>
                          )}
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
