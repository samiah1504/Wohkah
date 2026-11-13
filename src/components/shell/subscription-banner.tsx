import Link from "next/link";
import { can } from "@/lib/permissions";
import { daysUntil, msUntil } from "@/lib/dates";
import { getPlan } from "@/lib/plans/catalog";
import type { TenantContext } from "@/lib/tenancy";
import { getSubscriptionOverview } from "@/modules/billing/server/queries";

/**
 * Dashboard banner for people who look after the subscription: trial days
 * left, a trial that has ended, or staff to choose after a plan change.
 * Reminders are also stored as in-app notifications (one per milestone).
 */
export async function SubscriptionBanner({ ctx }: { ctx: TenantContext }) {
  if (!can(ctx, "subscription.view")) return null;
  const o = await getSubscriptionOverview(ctx);
  const href = `/w/${ctx.company.slug}/settings/subscription`;
  const manage = can(ctx, "subscription.manage");

  let message: string | null = null;
  let tone = "bg-sand text-walnut";
  if (o.staff_selection_required) {
    message = `You have more active staff (${o.usage.active_staff}) than your plan covers (${o.allowances.staff}). Choose who stays active, or add staff places.`;
    tone = "bg-destructive/10 text-destructive";
  } else if (o.status === "trialing" && o.trial) {
    const days = daysUntil(o.trial.ends_at);
    const plan = getPlan(o.trial.plan_code)?.name ?? "paid";
    if (days <= 3) {
      message =
        days <= 1
          ? `Your ${plan} free trial ends ${sameDay(o.trial.ends_at, ctx.company.timezone) ? "today" : "tomorrow"}. Subscribe to keep ${plan} features; otherwise you'll move to the Free plan.`
          : `${days} days left in your ${plan} free trial.`;
    }
  } else if (o.trial?.outcome === "expired" && o.plan_code === "free") {
    const plan = getPlan(o.trial.plan_code)?.name ?? "paid";
    if (msUntil(o.trial.ends_at) > -14 * 86_400_000) {
      message = `Your ${plan} free trial has ended and your business is on the Free plan. Your records are safe.`;
    }
  }
  if (!message) return null;

  return (
    <div
      role="status"
      className={`${tone} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6`}
    >
      <span className="flex-1">{message}</span>
      <Link href={href} className="font-semibold underline underline-offset-2">
        {o.staff_selection_required ? "Review" : manage ? "View plans" : "View subscription"}
      </Link>
    </div>
  );
}

function sameDay(iso: string, timeZone: string) {
  const day = (d: Date) => d.toLocaleDateString("en-GB", { timeZone });
  return day(new Date(iso)) === day(new Date());
}
