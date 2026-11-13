import type { Metadata } from "next";
import { NetworkIcon } from "lucide-react";
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
import { listDepartments } from "@/modules/workspace/server/queries";
import { limitOf } from "@/lib/entitlements";
import { can } from "@/lib/permissions";
import { limitPrompt } from "@/lib/upgrade";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { DepartmentDialog } from "@/modules/workspace/components/settings-forms";
import { setDepartmentArchived } from "@/modules/workspace/server/actions";

export const metadata: Metadata = { title: "Departments" };

export default function DepartmentsPage(props: PageProps<"/w/[slug]/settings/departments">) {
  return (
    <TenantPage params={props.params} anyOf={["departments.manage"]}>
      {async (ctx) => {
        const all = await listDepartments(ctx);
        const active = all.filter((d) => !d.archived_at);
        const byId = new Map(all.map((d) => [d.id, d.name]));
        const limit = limitOf(ctx, "departments");
        const atLimit = limit !== null && active.length >= limit;
        const slug = ctx.company.slug;
        return (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Departments group your people. Archived departments are kept for history.
                {limit !== null
                  ? ` ${active.length} of ${limit} on the ${ctx.plan.name} plan.`
                  : ""}
              </p>
              <DepartmentDialog
                slug={slug}
                departments={active}
                disabledReason={
                  atLimit ? "You've reached your plan's department limit." : undefined
                }
              />
            </div>
            {atLimit && limit !== null ? (
              <UpgradePrompt
                prompt={limitPrompt(slug, ctx.plan.code, "departments", limit)}
                canManage={can(ctx, "subscription.manage")}
              />
            ) : null}
            {all.length === 0 ? (
              <EmptyState
                icon={<NetworkIcon />}
                title="No departments yet"
                description="Add departments such as Operations, Sales or Finance."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Part of</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((d) => (
                    <TableRow key={d.id} className={d.archived_at ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">
                        {d.name} {d.archived_at ? <Badge variant="neutral">Archived</Badge> : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {d.parent_id ? byId.get(d.parent_id) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
                        {d.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {!d.archived_at ? (
                          <DepartmentDialog slug={slug} department={d} departments={active} />
                        ) : null}
                        <ActionButton
                          action={setDepartmentArchived}
                          hidden={{ slug, id: d.id, archive: d.archived_at ? "false" : "true" }}
                          variant="ghost"
                          confirm={d.archived_at ? undefined : "Archive?"}
                        >
                          {d.archived_at ? "Restore" : "Archive"}
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
