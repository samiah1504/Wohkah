import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, LockIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { Alert, Badge } from "@/components/ui/display";
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
import { hasFeature } from "@/lib/entitlements";
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
        const customAllowed = hasFeature(ctx, "custom_roles");
        const canManage = can(ctx, "roles.manage") && customAllowed;
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
            {!customAllowed && can(ctx, "roles.manage") ? (
              <Alert variant="info" className="mb-6">
                Custom roles and editing role permissions are available on the Growth plan and
                above.{" "}
                {can(ctx, "subscription.view") ? (
                  <Link href={`/w/${slug}/settings/plan`} className="font-semibold underline">
                    See plans
                  </Link>
                ) : null}
              </Alert>
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
                        {!r.system_key ? <Badge variant="neutral">Custom</Badge> : null}
                      </p>
                      {r.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">{r.description}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline">
                      {r.memberCount} member{r.memberCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {r.permissions.length} permission{r.permissions.length === 1 ? "" : "s"}
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
                      {!r.system_key ? (
                        <>
                          <RoleDialog slug={slug} role={r} />
                          <ActionButton
                            action={deleteRole}
                            hidden={{ slug, roleId: r.id }}
                            variant="ghost"
                            confirm="Delete role?"
                          >
                            Delete
                          </ActionButton>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <h2 className="font-heading mb-3 text-lg font-bold">Permission matrix</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Permission</TableHead>
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
