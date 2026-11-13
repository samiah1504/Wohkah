import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { ComparisonTable } from "@/components/plans/comparison-table";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { daysUntil, formatDate, formatDateTime } from "@/lib/dates";
import {
  FEATURE_INFO,
  FEATURE_KEYS,
  PLANS,
  entitlement,
  formatStorage,
  getPlan,
  naira,
  type Plan,
} from "@/lib/plans/catalog";
import { quote } from "@/lib/plans/quote";
import {
  getSubscriptionOverview,
  getTrialEligibility,
  listInvoices,
  listSubscriptionEvents,
  type SubscriptionOverview,
} from "@/modules/billing/server/queries";
import {
  cancelScheduledChange,
  changeToLowerPlan,
  startTrial,
} from "@/modules/billing/server/actions";

export const metadata: Metadata = { title: "Subscription" };

const EVENT_LABELS: Record<string, string> = {
  trial_started: "Free trial started",
  trial_expired: "Free trial ended (moved to Free)",
  trial_cancelled: "Free trial ended early",
  plan_changed: "Plan changed",
  downgrade_scheduled: "Plan change scheduled",
  downgrade_cancelled: "Scheduled plan change cancelled",
  addons_changed: "Extra places changed",
  staff_paused: "Staff paused to fit the plan",
  staff_reactivated: "Staff reactivated",
  checkout_started: "Payment started",
  payment_succeeded: "Payment received",
  payment_failed: "Payment failed",
};

const STATUS_LABELS: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment overdue",
  grace: "Grace period",
  canceled: "Cancelled",
  expired: "Expired",
};

function gains(from: Plan, to: Plan): string[] {
  return FEATURE_KEYS.filter((k) => {
    const a = entitlement(from.code, k);
    const b = entitlement(to.code, k);
    if (FEATURE_INFO[k].hidden) return false;
    if (b.enabled && !a.enabled) return true;
    return a.enabled && b.enabled && a.limit !== null && (b.limit === null || b.limit > a.limit);
  }).map((k) => {
    const e = entitlement(to.code, k);
    const info = FEATURE_INFO[k];
    if (e.limit === null && ["admins", "branches", "departments", "work_locations"].includes(k)) {
      return `Unlimited ${info.label.toLowerCase()}`;
    }
    if (e.limit !== null) {
      return `${info.label}: ${k === "storage_mb" ? formatStorage(e.limit) : e.limit}`;
    }
    return info.label;
  });
}

export default function SubscriptionPage(props: PageProps<"/w/[slug]/settings/subscription">) {
  return (
    <TenantPage params={props.params} anyOf={["subscription.view"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const [o, eligibility, events, invoices] = await Promise.all([
          getSubscriptionOverview(ctx),
          getTrialEligibility(ctx),
          listSubscriptionEvents(ctx),
          listInvoices(ctx),
        ]);
        const plan = getPlan(o.plan_code) ?? PLANS[0]!;
        const canManage = can(ctx, "subscription.manage");
        const slug = ctx.company.slug;
        const highlight = typeof sp.plan === "string" ? sp.plan : null;

        return (
          <div className="grid gap-6">
            {sp.payment === "paid" ? (
              <Alert variant="success">
                Payment confirmed. Your subscription has been updated.
              </Alert>
            ) : sp.payment === "pending" ? (
              <Alert variant="info">
                We haven&apos;t been able to confirm your payment yet. If you paid, it will show
                here shortly. You won&apos;t be charged twice.
              </Alert>
            ) : null}
            {sp.done === "trial" ? (
              <Alert variant="success">Your 7-day free trial has started. No card needed.</Alert>
            ) : sp.done === "applied" ? (
              <Alert variant="success">Your plan has been changed.</Alert>
            ) : sp.done === "scheduled" ? (
              <Alert variant="success">
                Your plan will change at the end of the period you&apos;ve paid for.
              </Alert>
            ) : null}

            {o.staff_selection_required ? (
              <Alert variant="destructive" className="flex flex-wrap items-center gap-3">
                <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">
                  You have {o.usage.active_staff} active staff but your plan covers{" "}
                  {o.allowances.staff}. Choose which staff stay active, or add staff places. No
                  records are deleted.
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/w/${slug}/staff`}>Choose staff</Link>
                </Button>
              </Alert>
            ) : null}

            <CurrentPlan
              o={o}
              plan={plan}
              slug={slug}
              canManage={canManage}
              timezone={ctx.company.timezone}
            />

            <Usage o={o} />

            <section aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="font-heading text-walnut mb-3 text-lg font-bold">
                Change plan
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {PLANS.map((p) => (
                  <PlanOption
                    key={p.code}
                    target={p}
                    current={plan}
                    o={o}
                    slug={slug}
                    canManage={canManage}
                    trialEligible={eligibility.eligible}
                    highlighted={highlight === p.code}
                  />
                ))}
              </div>
              {!eligibility.eligible &&
              eligibility.reason === "owner_trial_used" &&
              plan.code === "free" ? (
                <p className="text-muted-foreground mt-3 text-xs">
                  The free trial is available once per workspace and once per owner every 12 months.
                </p>
              ) : null}
            </section>

            <section aria-labelledby="compare-heading">
              <h2 id="compare-heading" className="font-heading text-walnut mb-3 text-lg font-bold">
                Compare plans
              </h2>
              <ComparisonTable current={plan.code} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subscription history</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length ? (
                    <ul className="grid gap-2 text-sm">
                      {events.map((e) => (
                        <li key={e.id} className="flex justify-between gap-3">
                          <span>
                            {EVENT_LABELS[e.event] ?? e.event}
                            {e.to_plan?.name && e.event !== "checkout_started"
                              ? `: ${e.to_plan.name}`
                              : ""}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatDateTime(e.created_at, ctx.company.timezone)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No changes yet.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment history</CardTitle>
                  <CardDescription>
                    Receipts appear here once payments are confirmed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoices.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-xs">
                              {inv.reference}
                              <span className="text-muted-foreground block">
                                {inv.plan?.name} ·{" "}
                                {inv.billing_interval === "annual" ? "yearly" : "monthly"}
                              </span>
                            </TableCell>
                            <TableCell>{naira(Number(inv.total_minor))}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  inv.status === "paid"
                                    ? "success"
                                    : inv.status === "open"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {inv.status === "open"
                                  ? "Awaiting payment"
                                  : inv.status === "void"
                                    ? "Replaced"
                                    : inv.status === "paid"
                                      ? "Paid"
                                      : "Failed"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No payments yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}

function CurrentPlan({
  o,
  plan,
  slug,
  canManage,
  timezone,
}: {
  o: SubscriptionOverview;
  plan: Plan;
  slug: string;
  canManage: boolean;
  timezone: string;
}) {
  const trial = o.status === "trialing" ? o.trial : null;
  const interval = o.billing_interval ?? "monthly";
  const paidExtras = {
    staff: o.allowances.extra_staff,
    locations: o.allowances.extra_work_locations,
  };
  const cost =
    plan.code === "free" && paidExtras.locations === 0
      ? null
      : quote(
          plan.code,
          plan.annualMinor === null ? "monthly" : interval,
          paidExtras.staff,
          paidExtras.locations,
        );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>{plan.name} plan</span>
          <Badge variant={o.status === "trialing" ? "default" : "success"}>
            {STATUS_LABELS[o.status] ?? o.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          {plan.monthlyMinor === 0
            ? "Free forever."
            : `${naira(plan.monthlyMinor)} a month, or ${naira(plan.annualMinor!)} a year.`}{" "}
          {plan.includedStaff} active staff included.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {trial ? (
          <div className="border-primary/40 bg-sand/60 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-walnut flex items-center gap-2 font-semibold">
                <ClockIcon className="size-4" aria-hidden /> {daysUntil(trial.ends_at)} day
                {daysUntil(trial.ends_at) === 1 ? "" : "s"} left in your free trial
              </p>
              <p className="text-foreground/80 mt-1 text-sm">
                Started {formatDate(trial.started_at.slice(0, 10))}. Ends{" "}
                {formatDateTime(trial.ends_at, timezone)}. When it ends without a subscription your
                workspace moves to the Free plan. Nothing is deleted.
              </p>
            </div>
            {canManage ? (
              <Button asChild>
                <Link href={`/w/${slug}/settings/subscription/checkout?plan=${plan.code}`}>
                  Subscribe Now
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Billing</dt>
            <dd className="font-medium">
              {trial
                ? "Free trial (no card)"
                : plan.code === "free" && !cost
                  ? "Free"
                  : interval === "annual"
                    ? "Yearly"
                    : "Monthly"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Next billing date</dt>
            <dd className="font-medium">
              {!trial && o.current_period_end ? formatDate(o.current_period_end.slice(0, 10)) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current price</dt>
            <dd className="font-medium">
              {trial
                ? "₦0 during the trial"
                : cost
                  ? `${naira(cost.totalMinor)} per ${interval === "annual" ? "year" : "month"}`
                  : "₦0"}
            </dd>
          </div>
        </dl>

        {cost && (paidExtras.staff > 0 || paidExtras.locations > 0) ? (
          <p className="text-muted-foreground text-xs">
            Includes {paidExtras.staff} extra staff place{paidExtras.staff === 1 ? "" : "s"} and{" "}
            {paidExtras.locations} extra work location{paidExtras.locations === 1 ? "" : "s"}.
          </p>
        ) : null}

        {o.pending_plan_code && o.pending_change_at ? (
          <Alert variant="info" className="flex flex-wrap items-center gap-3">
            <span className="flex-1">
              Your plan will change to {getPlan(o.pending_plan_code)?.name ?? o.pending_plan_code}{" "}
              on {formatDate(o.pending_change_at.slice(0, 10))}. If you have more active staff than
              that plan covers, you&apos;ll be asked to choose who stays active.
            </span>
            {canManage ? (
              <ActionButton action={cancelScheduledChange} hidden={{ slug }} variant="outline">
                Keep my current plan
              </ActionButton>
            ) : null}
          </Alert>
        ) : null}

        {canManage && plan.code !== "free" && !trial ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/w/${slug}/settings/subscription/checkout?plan=${plan.code}&interval=${interval}&staff=${paidExtras.staff}&locations=${paidExtras.locations}`}
              >
                Renew or change extra places
              </Link>
            </Button>
          </div>
        ) : null}
        {canManage && plan.code === "free" ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/w/${slug}/settings/subscription/checkout?plan=free&addLocations=1`}>
                Add a work location ({naira(plan.extraWorkLocation.monthlyMinor)}/month)
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Meter({
  label,
  used,
  limit,
  note,
}: {
  label: string;
  used: number;
  limit: number | null;
  note?: string;
}) {
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="bg-surface rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="font-heading text-walnut mt-1 text-xl font-extrabold">
        {used}
        <span className="text-muted-foreground text-sm font-medium">
          {limit === null ? " · unlimited" : ` of ${limit}`}
        </span>
      </p>
      {limit !== null ? (
        <div className="bg-subtle mt-2 h-1.5 overflow-hidden rounded-full" aria-hidden>
          <div
            className={pct >= 100 ? "bg-warning h-full" : "bg-primary h-full"}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {note ? <p className="text-muted-foreground mt-2 text-xs">{note}</p> : null}
    </div>
  );
}

function Usage({ o }: { o: SubscriptionOverview }) {
  const a = o.allowances;
  return (
    <section aria-labelledby="usage-heading">
      <h2 id="usage-heading" className="font-heading text-walnut mb-3 text-lg font-bold">
        What you&apos;re using
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meter
          label="Active staff"
          used={o.usage.active_staff}
          limit={a.staff}
          note={
            `${a.extra_staff ? `Includes ${a.extra_staff} extra place${a.extra_staff === 1 ? "" : "s"}. ` : ""}${o.usage.paused_staff ? `${o.usage.paused_staff} paused by the plan limit.` : ""}`.trim() ||
            undefined
          }
        />
        <Meter
          label="Work locations"
          used={o.usage.work_locations}
          limit={a.work_locations}
          note={
            a.extra_work_locations
              ? `Includes ${a.extra_work_locations} extra location${a.extra_work_locations === 1 ? "" : "s"}.`
              : undefined
          }
        />
        <Meter label="Administrators" used={o.usage.admins} limit={a.admins} />
        <Meter label="Branches" used={o.usage.branches} limit={a.branches} />
        <Meter label="Departments" used={o.usage.departments} limit={a.departments} />
        <div className="bg-surface rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-medium">File storage</p>
          <p className="font-heading text-walnut mt-1 text-xl font-extrabold">
            {o.usage.storage_mb} MB
            <span className="text-muted-foreground text-sm font-medium">
              {a.storage_mb === null ? "" : ` of ${formatStorage(a.storage_mb)}`}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanOption({
  target,
  current,
  o,
  slug,
  canManage,
  trialEligible,
  highlighted,
}: {
  target: Plan;
  current: Plan;
  o: SubscriptionOverview;
  slug: string;
  canManage: boolean;
  trialEligible: boolean;
  highlighted: boolean;
}) {
  const isCurrent = target.code === current.code;
  const diff = target.monthlyMinor - current.monthlyMinor;
  const higher = diff > 0;
  const gained = higher ? gains(current, target) : [];
  const lost = !higher && !isCurrent ? gains(target, current) : [];
  const overStaff = !higher && !isCurrent && o.usage.active_staff > target.includedStaff;

  return (
    <div
      className={
        "bg-surface flex flex-col rounded-2xl border p-5 " +
        (isCurrent ? "border-primary ring-primary ring-1 " : "") +
        (highlighted && !isCurrent ? "border-walnut" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-walnut text-lg font-extrabold">{target.name}</h3>
        {isCurrent ? <Badge>Your plan</Badge> : null}
      </div>
      <p className="mt-1 text-sm">
        <strong>{target.monthlyMinor === 0 ? "₦0" : naira(target.monthlyMinor)}</strong>/month ·{" "}
        {target.includedStaff} staff
      </p>
      {!isCurrent ? (
        <p
          className={
            "mt-1 flex items-center gap-1 text-xs font-semibold " +
            (higher ? "text-walnut" : "text-muted-foreground")
          }
        >
          {higher ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
          {higher ? "+" : "−"}
          {naira(Math.abs(diff))} a month compared with {current.name}
        </p>
      ) : null}

      {gained.length ? (
        <ul className="mt-3 grid gap-1.5 text-sm">
          {gained.slice(0, 5).map((g) => (
            <li key={g} className="flex gap-2">
              <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden /> {g}
            </li>
          ))}
          {gained.length > 5 ? (
            <li className="text-muted-foreground text-xs">
              and {gained.length - 5} more (see the comparison below)
            </li>
          ) : null}
        </ul>
      ) : null}
      {lost.length ? (
        <p className="text-muted-foreground mt-3 text-xs">
          You&apos;d lose: {lost.slice(0, 4).join(", ")}
          {lost.length > 4 ? ` and ${lost.length - 4} more` : ""}.
        </p>
      ) : null}
      {overStaff ? (
        <p className="text-warning mt-2 text-xs font-medium">
          You have {o.usage.active_staff} active staff; {target.name} includes{" "}
          {target.includedStaff}. You&apos;ll choose who stays active first. No records are deleted.
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 pt-4">
        {!canManage ? null : isCurrent ? (
          o.status === "trialing" ? (
            <Button asChild>
              <Link href={`/w/${slug}/settings/subscription/checkout?plan=${target.code}`}>
                Subscribe Now
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Current plan
            </Button>
          )
        ) : higher ? (
          <>
            {trialEligible && target.trialDays > 0 && current.code === "free" ? (
              <ActionButton
                action={startTrial}
                hidden={{ slug, plan: target.code }}
                variant="default"
                size="default"
              >
                Start {target.trialDays}-day free trial
              </ActionButton>
            ) : null}
            <Button
              asChild
              variant={trialEligible && current.code === "free" ? "outline" : "default"}
            >
              <Link href={`/w/${slug}/settings/subscription/checkout?plan=${target.code}`}>
                {current.code === "free" && o.status !== "trialing"
                  ? "Subscribe Now"
                  : "Upgrade Plan"}
              </Link>
            </Button>
          </>
        ) : overStaff && o.status !== "trialing" && o.current_period_end === null ? (
          <Button asChild variant="outline">
            <Link href={`/w/${slug}/staff?for=${target.code}`}>Choose staff, then switch</Link>
          </Button>
        ) : (
          <ActionButton
            action={changeToLowerPlan}
            hidden={{ slug, plan: target.code }}
            variant="outline"
            size="default"
            confirm={`Switch to ${target.name}?`}
          >
            Switch to {target.name}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
