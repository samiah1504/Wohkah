import type { Metadata } from "next";
import { CheckIcon, LockIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { Badge } from "@/components/ui/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can, isPermission } from "@/lib/permissions";
import { NAV } from "@/lib/copy/navigation";
import { listPermissionCatalog, listRoles } from "@/modules/access/server/queries";
import { RoleDialog, RolePermissionsDialog } from "@/modules/access/components/access-forms";
import { deleteRole } from "@/modules/access/server/actions";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage(props: PageProps<"/w/[slug]/roles">) {
  return (
    <TenantPage params={props.params} anyOf={["roles.view"]}>
      {async (ctx) => {
        const slug = ctx.company.slug;
        const [roles, catalog] = await Promise.all([listRoles(ctx), listPermissionCatalog()]);
        const canManage = can(ctx, "roles.manage");
        const options = catalog.map((p) => ({
          key: p.key,
          module: p.module,
          description: p.description,
          isSensitive: p.is_sensitive,
          heldByMe: isPermission(p.key) && ctx.permissions.has(p.key),
        }));

        return (
          <>
            <PageHeader
              title={NAV.roles.title}
              description={NAV.roles.description}
              actions={canManage ? <RoleDialog slug={slug} /> : null}
            />
            {roles.length <= 1 ? (
              <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
                Create the roles your business uses, such as Manager, Cashier or Supervisor, and
                choose what each one can see and do. People without a role can still sign in to
                their own staff portal.
              </p>
            ) : null}

            <div className="mb-8 grid gap-3 md:grid-cols-2">
              {roles.map((r) => (
                <div key={r.id} className="bg-surface rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-heading flex items-center gap-2 font-bold">
                        {r.name}
                        {r.is_locked ? (
                          <LockIcon
                            className="text-muted-foreground size-3.5"
                            aria-label="Locked"
                          />
                        ) : null}
                      </p>
                      {r.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">{r.description}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline">
                      {r.memberCount} {r.memberCount === 1 ? "person" : "people"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {r.permissions.length === 0
                      ? "No access beyond their own staff portal"
                      : `${r.permissions.length} type${r.permissions.length === 1 ? "" : "s"} of access`}
                  </p>
                  {canManage && !r.is_locked ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <RolePermissionsDialog
                        slug={slug}
                        roleId={r.id}
                        roleName={r.name}
                        catalog={options}
                        granted={r.permissions}
                      />
                      <RoleDialog slug={slug} role={r} />
                      <ActionButton
                        action={deleteRole}
                        hidden={{ slug, roleId: r.id }}
                        variant="ghost"
                        confirm="Delete role?"
                      >
                        Delete
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <h2 className="font-heading mb-3 text-lg font-bold">Who can do what</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Access</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className="text-center">
                      {r.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell>
                      {p.description}
                      {p.is_sensitive ? (
                        <span className="text-warning ml-1 text-xs font-semibold">Sensitive</span>
                      ) : null}
                    </TableCell>
                    {roles.map((r) => (
                      <TableCell key={r.id} className="text-center">
                        {r.permissions.includes(p.key) ? (
                          <CheckIcon className="text-success inline size-4" aria-label="Granted" />
                        ) : (
                          <span className="text-muted-foreground" aria-label="Not granted">
                            ·
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        );
      }}
    </TenantPage>
  );
}
