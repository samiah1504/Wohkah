import Link from "next/link";
import { Suspense } from "react";
import {
  Building2Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  NetworkIcon,
  UserPlusIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { limitOf } from "@/lib/entitlements";
import { requireTenant, type TenantContext } from "@/lib/tenancy";
import { formatDate, todayIn } from "@/lib/dates";
import { getSetupSummary, listHolidays } from "@/modules/workspace/server/queries";

export default function WorkspaceHome(props: PageProps<"/w/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Home {...props} />
    </Suspense>
  );
}

async function Home({ params, searchParams }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenant(slug);
  const isAdmin = ctx.roles.some((r) => r.systemKey !== "employee");
  const today = todayIn(ctx.company.timezone);
  const year = Number(today.slice(0, 4));
  const [summary, holidays] = await Promise.all([
    isAdmin ? getSetupSummary(ctx) : Promise.resolve(null),
    listHolidays(ctx, year),
  ]);
  const upcoming = holidays.filter((h) => h.holiday_date >= today).slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Welcome to ${ctx.company.name}`}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            Your role:
            {ctx.roles.map((r) => (
              <Badge key={r.roleId} variant="neutral">
                {r.name}
              </Badge>
            ))}
          </span>
        }
      />

      {sp.welcome === "1" ? (
        <Alert variant="success" className="mb-6">
          Your workspace is ready. Start by adding your departments and branches, then invite your
          team.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {summary ? <SetupChecklist ctx={ctx} summary={summary} /> : <EmployeeWelcome />}

        <div className="grid content-start gap-6">
          {can(ctx, "subscription.view") ? <PlanCard ctx={ctx} members={summary?.members} /> : null}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDaysIcon className="text-primary size-4" /> Upcoming holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length ? (
                <ul className="grid gap-2 text-sm">
                  {upcoming.map((h) => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span>{h.name}</span>
                      <span className="text-muted-foreground">
                        {formatDate(h.holiday_date, { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming holidays added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function SetupChecklist({
  ctx,
  summary,
}: {
  ctx: TenantContext;
  summary: Awaited<ReturnType<typeof getSetupSummary>>;
}) {
  const base = `/w/${ctx.company.slug}`;
  const steps = [
    {
      done: true,
      label: "Create your workspace",
      detail: `${ctx.company.name} is set up.`,
      icon: CheckCircle2Icon,
    },
    {
      done: summary.departments > 0,
      label: "Add departments",
      detail: `${summary.departments} active`,
      href: `${base}/settings/departments`,
      icon: NetworkIcon,
      allowed: can(ctx, "departments.manage"),
    },
    {
      done: summary.branches > 0,
      label: "Add a branch or office",
      detail: `${summary.branches} active`,
      href: `${base}/settings/branches`,
      icon: Building2Icon,
      allowed: can(ctx, "branches.manage"),
    },
    {
      done: summary.members > 1,
      label: "Invite your team",
      detail: `${summary.members} member${summary.members === 1 ? "" : "s"}${
        summary.pendingInvitations ? `, ${summary.pendingInvitations} invited` : ""
      }`,
      href: `${base}/members`,
      icon: UserPlusIcon,
      allowed: can(ctx, "members.invite"),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Get your workspace ready</CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} steps complete
        </CardDescription>
        <div className="bg-subtle mt-2 h-2 overflow-hidden rounded-full" aria-hidden>
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 rounded-lg border p-3">
              {s.done ? (
                <CheckCircle2Icon className="text-success size-5 shrink-0" aria-label="Done" />
              ) : (
                <CircleIcon className="text-muted-foreground size-5 shrink-0" aria-label="To do" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="text-muted-foreground text-xs">{s.detail}</p>
              </div>
              {s.href && s.allowed ? (
                <Button asChild size="sm" variant={s.done ? "ghost" : "default"}>
                  <Link href={s.href}>{s.done ? "Manage" : "Start"}</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EmployeeWelcome() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Your employee portal</CardTitle>
        <CardDescription>
          This is your home for work at this company. Self-service features appear here as your
          company turns them on.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Keep your profile up to date from{" "}
        <Link href="/account" className="text-walnut font-medium underline">
          Profile
        </Link>
        .
      </CardContent>
    </Card>
  );
}

function PlanCard({ ctx, members }: { ctx: TenantContext; members?: number }) {
  const admins = limitOf(ctx, "admins");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Plan
          <Badge>{ctx.plan.name}</Badge>
        </CardTitle>
        <CardDescription>
          {members !== undefined ? `${members} workspace member${members === 1 ? "" : "s"}. ` : ""}
          {admins === null
            ? "Unlimited administrators."
            : `Up to ${admins} administrator${admins === 1 ? "" : "s"}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${ctx.company.slug}/settings/plan`}>View plan and limits</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
