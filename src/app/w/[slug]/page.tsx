import Link from "next/link";
import { Suspense } from "react";
import {
  BellIcon,
  Building2Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
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
import { ActionButton } from "@/components/action-forms";
import { getPlan } from "@/lib/plans/catalog";
import { PRIMARY_FEATURES } from "@/lib/copy/features";
import { getSubscriptionOverview, listMyNotifications } from "@/modules/billing/server/queries";
import { markNotificationRead } from "@/modules/billing/server/actions";
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
  const isAdmin = ctx.permissions.size > 0;
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
          Your business account is ready.{" "}
          {sp.trial === "started"
            ? "Your 7-day free trial has started. No card needed. "
            : sp.trial === "unavailable"
              ? "A free trial isn't available for this account (one trial per owner every 12 months), so you're on the Free plan. "
              : ""}
          Start by adding your branches, then invite your team.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {summary ? <SetupChecklist ctx={ctx} summary={summary} /> : <StaffWelcome />}

        <div className="grid content-start gap-6">
          <NotificationsCard ctx={ctx} />
          {can(ctx, "subscription.view") ? <PlanCard ctx={ctx} /> : null}
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
      label: "Create your business account",
      detail: `${ctx.company.name} is set up.`,
      icon: CheckCircle2Icon,
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
        <CardTitle>Get your business ready</CardTitle>
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

function StaffWelcome() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Your staff portal</CardTitle>
        <CardDescription>
          This is your home for work at this company: your attendance, leave, salary slips and
          tasks.
          {PRIMARY_FEATURES.some((f) => !f.available)
            ? " Some of these are coming soon and appear here as soon as they're ready."
            : ""}
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

async function PlanCard({ ctx }: { ctx: TenantContext }) {
  const o = await getSubscriptionOverview(ctx);
  const plan = getPlan(o.plan_code);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          Subscription
          <Badge>
            {plan?.name ?? o.plan_code}
            {o.status === "trialing" ? " trial" : ""}
          </Badge>
        </CardTitle>
        <CardDescription>
          {o.usage.active_staff} of {o.allowances.staff} active staff places in use.{" "}
          {o.allowances.work_locations === null
            ? "Unlimited work locations."
            : `${o.usage.work_locations} of ${o.allowances.work_locations} work locations.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${ctx.company.slug}/settings/subscription`}>View subscription</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function NotificationsCard({ ctx }: { ctx: TenantContext }) {
  const items = (await listMyNotifications(ctx)).filter((n) => !n.read_at);
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellIcon className="text-primary size-4" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 text-sm">
          {items.map((n) => (
            <li key={n.id} className="grid gap-1 border-b pb-3 last:border-0 last:pb-0">
              <p className="font-medium">{n.title}</p>
              {n.body ? <p className="text-muted-foreground text-xs">{n.body}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                {n.link?.startsWith("/") ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={n.link}>Open</Link>
                  </Button>
                ) : null}
                <ActionButton
                  action={markNotificationRead}
                  hidden={{ slug: ctx.company.slug, id: String(n.id) }}
                  variant="ghost"
                >
                  Dismiss
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
