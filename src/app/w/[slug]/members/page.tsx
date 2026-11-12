import type { Metadata } from "next";
import { UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui/display";
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
import { formatDate } from "@/lib/dates";
import {
  getMemberDirectory,
  listPendingInvitations,
  listRoles,
} from "@/modules/access/server/queries";
import {
  InviteDialog,
  MemberRolesDialog,
  type RoleOption,
} from "@/modules/access/components/access-forms";
import { revokeInvitation, setMemberStatus } from "@/modules/access/server/actions";

export const metadata: Metadata = { title: NAV.access.title };

export default function MembersPage(props: PageProps<"/w/[slug]/members">) {
  return (
    <TenantPage params={props.params} anyOf={["members.view"]}>
      {async (ctx) => {
        const slug = ctx.company.slug;
        const isOwner = ctx.roles.some((r) => r.systemKey === "owner");
        const [members, invitations, roles] = await Promise.all([
          getMemberDirectory(ctx),
          can(ctx, "members.invite") ? listPendingInvitations(ctx) : Promise.resolve([]),
          listRoles(ctx),
        ]);
        // Only offer roles the user may grant (the database enforces the same rule).
        const grantable: RoleOption[] = roles
          .filter((r) => r.system_key !== "owner" || isOwner)
          .filter(
            (r) =>
              r.system_key === "owner" ||
              r.permissions.every((p) => isPermission(p) && ctx.permissions.has(p)),
          )
          .map((r) => ({
            id: r.id,
            name: r.name,
            systemKey: r.system_key,
            description: r.description,
          }));
        const roleName = new Map(roles.map((r) => [r.id, r.name]));

        return (
          <>
            <PageHeader
              title={NAV.access.title}
              description={`${NAV.access.description} ${members.filter((m) => m.status === "active").length} active.`}
              actions={
                can(ctx, "members.invite") ? <InviteDialog slug={slug} roles={grantable} /> : null
              }
            />

            {invitations.length > 0 ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Pending invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {invitations.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{i.email}</p>
                          <p className="text-muted-foreground text-xs">
                            {i.role_ids
                              .map((id) => roleName.get(id))
                              .filter(Boolean)
                              .join(", ") || "Staff Member"}{" "}
                            · expires {formatDate(i.expires_at.slice(0, 10))}
                          </p>
                        </div>
                        <ActionButton
                          action={revokeInvitation}
                          hidden={{ slug, invitationId: i.id }}
                          variant="ghost"
                          confirm="Revoke?"
                        >
                          Revoke
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {members.length === 0 ? (
              <EmptyState icon={<UsersIcon />} title="No members yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Roles</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const isSelf = m.user_id === ctx.user.id;
                    const memberIsOwner = m.roles.some((r) => r.system_key === "owner");
                    const canChangeStatus =
                      can(ctx, "members.manage") && !isSelf && (!memberIsOwner || isOwner);
                    return (
                      <TableRow
                        key={m.member_id}
                        className={m.status !== "active" ? "opacity-70" : undefined}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={m.full_name || m.email} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {m.full_name || "—"}{" "}
                                {isSelf ? (
                                  <span className="text-muted-foreground text-xs">(you)</span>
                                ) : null}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">{m.email}</p>
                              {m.status !== "active" ? (
                                <Badge variant="warning" className="mt-1">
                                  Suspended
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {m.roles.map((r) => (
                              <Badge
                                key={r.member_role_id}
                                variant={r.system_key === "owner" ? "default" : "neutral"}
                              >
                                {r.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap lg:table-cell">
                          {formatDate(m.joined_at.slice(0, 10))}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {can(ctx, "roles.assign") && (!memberIsOwner || isOwner) ? (
                            <MemberRolesDialog
                              slug={slug}
                              memberId={m.member_id}
                              memberName={m.full_name || m.email}
                              roles={grantable}
                              currentRoleIds={m.roles.map((r) => r.role_id)}
                            />
                          ) : null}
                          {canChangeStatus ? (
                            m.status === "active" ? (
                              <ActionButton
                                action={setMemberStatus}
                                hidden={{ slug, memberId: m.member_id, status: "suspended" }}
                                variant="ghost"
                                confirm="Suspend?"
                              >
                                Suspend
                              </ActionButton>
                            ) : (
                              <>
                                <ActionButton
                                  action={setMemberStatus}
                                  hidden={{ slug, memberId: m.member_id, status: "active" }}
                                  variant="ghost"
                                >
                                  Reactivate
                                </ActionButton>
                                <ActionButton
                                  action={setMemberStatus}
                                  hidden={{ slug, memberId: m.member_id, status: "removed" }}
                                  variant="ghost"
                                  confirm="Remove?"
                                >
                                  Remove
                                </ActionButton>
                              </>
                            )
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        );
      }}
    </TenantPage>
  );
}
