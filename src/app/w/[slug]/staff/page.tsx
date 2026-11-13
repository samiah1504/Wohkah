import type { Metadata } from "next";
import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
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
import { NAV } from "@/lib/copy/navigation";
import { can } from "@/lib/permissions";
import { getPlan } from "@/lib/plans/catalog";
import { staffPrompt } from "@/lib/upgrade";
import { getWorkspaceAllowances } from "@/modules/billing/server/queries";
import { ACTIVE_STATUSES, listStaff } from "@/modules/staff/server/queries";
import { setStaffStatus } from "@/modules/staff/server/actions";
import {
  AddStaffDialog,
  ReactivateStaffForm,
  SelectActiveStaffForm,
} from "@/modules/staff/components/staff-forms";

export const metadata: Metadata = { title: NAV.staff.title };

const STATUS: Record<
  string,
  { label: string; variant: "success" | "neutral" | "warning" | "default" }
> = {
  invited: { label: "Invited", variant: "default" },
  onboarding: { label: "Onboarding", variant: "default" },
  active: { label: "Active", variant: "success" },
  on_leave: { label: "On leave", variant: "default" },
  suspended: { label: "Suspended", variant: "warning" },
  plan_suspended: { label: "Paused (plan limit)", variant: "warning" },
  resigned: { label: "Left", variant: "neutral" },
  terminated: { label: "Left", variant: "neutral" },
  archived: { label: "Archived", variant: "neutral" },
};

const isActive = (s: string) => (ACTIVE_STATUSES as readonly string[]).includes(s);

export default function StaffPage(props: PageProps<"/w/[slug]/staff">) {
  return (
    <>
      <PageHeader title={NAV.staff.title} description={NAV.staff.description} className="mb-6" />
      <TenantPage params={props.params} anyOf={["staff.view"]}>
        {async (ctx) => {
          const sp = await props.searchParams;
          const [staff, a] = await Promise.all([listStaff(ctx), getWorkspaceAllowances(ctx)]);
          const slug = ctx.company.slug;
          const manage = can(ctx, "staff.manage");
          const canSubscribe = can(ctx, "subscription.manage");
          const active = staff.filter((s) => isActive(s.status));
          const paused = staff.filter((s) => s.status === "plan_suspended");
          const forPlan = typeof sp.for === "string" ? getPlan(sp.for) : undefined;
          const atLimit = a.active_staff >= a.staff;
          const capacity = Math.max(0, a.staff - a.active_staff);
          const selecting =
            manage &&
            (a.staff_selection_required || (forPlan && active.length > forPlan.includedStaff));
          const selectionAllowance = forPlan ? forPlan.includedStaff : a.staff;

          return (
            <div className="grid gap-6">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">
                  {a.active_staff} of {a.staff} active staff places in use.
                </span>{" "}
                Staff who have left or are archived don&apos;t count.
              </p>

              {typeof sp.paused === "string" ? (
                <Alert variant="success">
                  {sp.paused === "0"
                    ? "No changes were needed."
                    : `${sp.paused} staff member${sp.paused === "1" ? " is" : "s are"} now paused. Their records are kept and they can be reactivated after upgrading or adding staff places.`}
                </Alert>
              ) : typeof sp.reactivated === "string" ? (
                <Alert variant="success">
                  {sp.reactivated} staff member{sp.reactivated === "1" ? "" : "s"} reactivated.
                </Alert>
              ) : null}

              {selecting ? (
                <Card className="border-destructive/40">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {forPlan
                        ? `Choose staff for the ${forPlan.name} plan`
                        : "Choose who stays active"}
                    </CardTitle>
                    <CardDescription>
                      You have {active.length} active staff and{" "}
                      {forPlan ? `${forPlan.name} includes` : "your plan covers"}{" "}
                      {selectionAllowance}. Nothing is deleted.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <SelectActiveStaffForm
                      slug={slug}
                      people={active}
                      allowance={selectionAllowance}
                      forPlan={forPlan?.code}
                      forPlanName={forPlan?.name}
                    />
                    {canSubscribe ? (
                      <p className="text-muted-foreground text-xs">
                        Prefer to keep everyone?{" "}
                        <Link className="underline" href={`/w/${slug}/settings/subscription`}>
                          Upgrade or add staff places
                        </Link>{" "}
                        instead.
                        {forPlan ? (
                          <>
                            {" "}
                            After choosing, return to{" "}
                            <Link className="underline" href={`/w/${slug}/settings/subscription`}>
                              Subscription
                            </Link>{" "}
                            to switch to {forPlan.name}.
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : a.staff_selection_required ? (
                <Alert variant="destructive">
                  There are more active staff than your plan covers. Ask someone who manages staff
                  or the subscription to choose who stays active.
                </Alert>
              ) : null}

              {manage && atLimit && !selecting ? (
                <UpgradePrompt
                  prompt={staffPrompt(slug, a.plan_code, a.active_staff, a.staff)}
                  canManage={canSubscribe}
                />
              ) : null}

              <section aria-labelledby="active-heading" className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="active-heading" className="font-heading text-walnut text-lg font-bold">
                    Staff
                  </h2>
                  {manage ? (
                    <AddStaffDialog
                      slug={slug}
                      disabledReason={
                        atLimit
                          ? "All active staff places on your subscription are in use."
                          : undefined
                      }
                    />
                  ) : null}
                </div>
                {staff.filter((s) => s.status !== "plan_suspended").length === 0 ? (
                  <EmptyState
                    icon={<UsersIcon />}
                    title="No staff yet"
                    description="Add the people who work for your business. Full staff profiles arrive in the next release."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Job title</TableHead>
                        <TableHead>Status</TableHead>
                        {manage ? <TableHead className="text-right">Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff
                        .filter((s) => s.status !== "plan_suspended")
                        .map((s) => {
                          const st = STATUS[s.status] ?? {
                            label: s.status,
                            variant: "neutral" as const,
                          };
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                {s.full_name}
                                {s.email ? (
                                  <span className="text-muted-foreground block text-xs">
                                    {s.email}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {s.job_title ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={st.variant}>{st.label}</Badge>
                              </TableCell>
                              {manage ? (
                                <TableCell className="text-right whitespace-nowrap">
                                  {isActive(s.status) ? (
                                    <ActionButton
                                      action={setStaffStatus}
                                      hidden={{ slug, id: s.id, status: "resigned" }}
                                      variant="ghost"
                                      confirm={`Mark ${s.full_name} as left?`}
                                    >
                                      Mark as left
                                    </ActionButton>
                                  ) : s.status === "resigned" ? (
                                    <ActionButton
                                      action={setStaffStatus}
                                      hidden={{ slug, id: s.id, status: "archived" }}
                                      variant="ghost"
                                    >
                                      Archive
                                    </ActionButton>
                                  ) : null}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </section>

              {paused.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Paused because of the plan limit ({paused.length})
                    </CardTitle>
                    <CardDescription>
                      Paused staff can&apos;t clock in, use the staff portal or receive assignments.
                      Their records are kept.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {manage ? (
                      <ReactivateStaffForm slug={slug} people={paused} capacity={capacity} />
                    ) : (
                      <ul className="grid gap-1 text-sm">
                        {paused.map((p) => (
                          <li key={p.id}>{p.full_name}</li>
                        ))}
                      </ul>
                    )}
                    {capacity === 0 && canSubscribe ? (
                      <Button asChild size="sm" variant="outline" className="w-fit">
                        <Link href={`/w/${slug}/settings/subscription`}>
                          Upgrade or add staff places
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          );
        }}
      </TenantPage>
    </>
  );
}
