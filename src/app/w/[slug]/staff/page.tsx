import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PlusIcon, UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TenantPage } from "@/components/shell/tenant-page";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Avatar,
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
import { EMPLOYMENT_TYPES, staffNo, type StatusGroup } from "@/lib/copy/staff";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { getPlan } from "@/lib/plans/catalog";
import { staffPrompt } from "@/lib/upgrade";
import { getWorkspaceAllowances } from "@/modules/billing/server/queries";
import { listBranches } from "@/modules/workspace/server/queries";
import {
  ACTIVE_STATUSES,
  PAGE_SIZE,
  listStaff,
  listStaffPage,
  parseFilters,
} from "@/modules/staff/server/queries";
import { ReactivateStaffForm, SelectActiveStaffForm } from "@/modules/staff/components/staff-forms";
import { StaffToolbar } from "@/modules/staff/components/staff-toolbar";
import { StatusBadge } from "@/modules/staff/components/profile-view";

export const metadata: Metadata = { title: NAV.staff.title };

const GROUPS: [StatusGroup, string][] = [
  ["current", "Current"],
  ["left", "Left"],
  ["archived", "Archived"],
  ["all", "All"],
];

const isActive = (s: string) => (ACTIVE_STATUSES as readonly string[]).includes(s);

export default function StaffPage(props: PageProps<"/w/[slug]/staff">) {
  return (
    <>
      <PageHeader title={NAV.staff.title} description={NAV.staff.description} className="mb-6" />
      <TenantPage params={props.params} anyOf={["staff.view"]}>
        {async (ctx) => {
          const sp = await props.searchParams;
          const f = parseFilters(sp);
          const [staff, a, page, branches] = await Promise.all([
            listStaff(ctx),
            getWorkspaceAllowances(ctx),
            listStaffPage(ctx, f),
            listBranches(ctx),
          ]);
          const slug = ctx.company.slug;
          const base = `/w/${slug}/staff`;
          const href = (over: Partial<{ status: string; page: number }>) => {
            const p = new URLSearchParams();
            if (f.q) p.set("q", f.q);
            const status = over.status ?? f.group;
            if (status !== "current") p.set("status", status);
            if (f.branch) p.set("branch", f.branch);
            const n = over.page ?? 1;
            if (n > 1) p.set("page", String(n));
            const qs = p.toString();
            return qs ? `${base}?${qs}` : base;
          };
          const pages = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
          const first = page.total ? (f.page - 1) * PAGE_SIZE + 1 : 0;
          const last = Math.min(page.total, f.page * PAGE_SIZE);
          const filtered = Boolean(f.q || f.branch || f.group !== "current");
          const hasAnyone = staff.some((s) => s.status !== "plan_suspended");
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

              <section aria-labelledby="list-heading" className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="list-heading" className="sr-only">
                    Staff list
                  </h2>
                  <nav
                    aria-label="Filter by status"
                    className="bg-subtle inline-flex rounded-lg p-1"
                  >
                    {GROUPS.map(([key, label]) => (
                      <Link
                        key={key}
                        href={href({ status: key })}
                        aria-current={f.group === key ? "page" : undefined}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                          f.group === key
                            ? "bg-surface text-walnut shadow-xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                  <div className="flex flex-wrap gap-2">
                    {can(ctx, "staff.export") && hasAnyone ? (
                      <Button asChild variant="outline">
                        <a href={`${base}/export${href({}).slice(base.length)}`} download>
                          <DownloadIcon /> Download list
                        </a>
                      </Button>
                    ) : null}
                    {manage ? (
                      atLimit ? (
                        <Button
                          disabled
                          title="All active staff places on your subscription are in use."
                        >
                          <PlusIcon /> Add staff
                        </Button>
                      ) : (
                        <Button asChild>
                          <Link href={`${base}/new`}>
                            <PlusIcon /> Add staff
                          </Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>

                {hasAnyone ? (
                  <StaffToolbar
                    action={base}
                    q={f.q}
                    status={f.group}
                    branch={f.branch}
                    branches={branches
                      .filter((b) => !b.archived_at)
                      .map((b) => ({ id: b.id, name: b.name }))}
                  />
                ) : null}

                {!hasAnyone ? (
                  <EmptyState
                    icon={<UsersIcon />}
                    title="No staff yet"
                    description="Add the people who work for your business: their job, branch, contact details, documents and history in one record."
                    action={
                      manage && !atLimit ? (
                        <Button asChild>
                          <Link href={`${base}/new`}>
                            <PlusIcon /> Add your first staff member
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                ) : page.rows.length === 0 ? (
                  <div className="bg-surface text-muted-foreground rounded-xl border px-6 py-12 text-center text-sm">
                    <p className="text-foreground font-medium">No staff match these filters.</p>
                    {filtered ? (
                      <Link
                        href={base}
                        className="text-walnut mt-2 inline-block font-semibold underline"
                      >
                        Clear filters
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-surface overflow-hidden rounded-xl border">
                    {/* Phones: a stacked list */}
                    <ul className="divide-y md:hidden">
                      {page.rows.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`${base}/${s.id}`}
                            className="hover:bg-subtle/60 flex items-center gap-3 px-4 py-3"
                          >
                            <Avatar
                              name={s.full_name}
                              className="bg-sand text-walnut size-9 text-xs font-bold"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {s.full_name}
                              </span>
                              <span className="text-muted-foreground block truncate text-xs">
                                {[s.job_title, s.branch?.name].filter(Boolean).join(" · ") ||
                                  "No job title"}
                              </span>
                            </span>
                            <StatusBadge status={s.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {/* Larger screens: a table */}
                    <Table className="hidden md:table">
                      <TableHeader>
                        <TableRow className="bg-subtle/50 hover:bg-subtle/50">
                          <TableHead className="w-20">No.</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Job title</TableHead>
                          <TableHead className="hidden lg:table-cell">Branch</TableHead>
                          <TableHead className="hidden xl:table-cell">Type</TableHead>
                          <TableHead className="hidden lg:table-cell">Started</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {page.rows.map((s) => (
                          <TableRow key={s.id} className="relative">
                            <TableCell className="text-muted-foreground tabular-nums">
                              {staffNo(s.staff_number)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar
                                  name={s.full_name}
                                  className="bg-sand text-walnut size-8 text-xs font-bold"
                                />
                                <div className="min-w-0">
                                  <Link
                                    href={`${base}/${s.id}`}
                                    className="block truncate font-semibold after:absolute after:inset-0 hover:underline"
                                  >
                                    {s.full_name}
                                  </Link>
                                  {s.email ? (
                                    <span className="text-muted-foreground block truncate text-xs">
                                      {s.email}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {s.job_title ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {s.branch?.name ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {EMPLOYMENT_TYPES[s.employment_type]}
                            </TableCell>
                            <TableCell className="hidden tabular-nums lg:table-cell">
                              {s.start_date ? (
                                formatDate(s.start_date)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={s.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                      <span className="tabular-nums" aria-live="polite">
                        {first}–{last} of {page.total}
                      </span>
                      {pages > 1 ? (
                        <div className="flex gap-1">
                          <Button
                            asChild={f.page > 1}
                            variant="outline"
                            size="sm"
                            disabled={f.page <= 1}
                          >
                            {f.page > 1 ? (
                              <Link href={href({ page: f.page - 1 })} aria-label="Previous page">
                                <ChevronLeftIcon />
                              </Link>
                            ) : (
                              <span aria-label="Previous page">
                                <ChevronLeftIcon />
                              </span>
                            )}
                          </Button>
                          <Button
                            asChild={f.page < pages}
                            variant="outline"
                            size="sm"
                            disabled={f.page >= pages}
                          >
                            {f.page < pages ? (
                              <Link href={href({ page: f.page + 1 })} aria-label="Next page">
                                <ChevronRightIcon />
                              </Link>
                            ) : (
                              <span aria-label="Next page">
                                <ChevronRightIcon />
                              </span>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
