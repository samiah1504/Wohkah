import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display";
import { entitlement, getPlan, type BillingInterval } from "@/lib/plans/catalog";
import { extraLocationsNeeded, extraStaffNeeded } from "@/lib/plans/quote";
import { isPaystackConfigured } from "@/lib/payments";
import { getSubscriptionOverview } from "@/modules/billing/server/queries";
import { CheckoutForm } from "@/modules/billing/components/checkout-form";

export const metadata: Metadata = { title: "Subscribe" };

function num(v: string | string[] | undefined): number | null {
  if (typeof v !== "string" || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : null;
}

export default function CheckoutPage(props: PageProps<"/w/[slug]/settings/subscription/checkout">) {
  return (
    <TenantPage params={props.params} anyOf={["subscription.manage"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const o = await getSubscriptionOverview(ctx);
        const plan =
          getPlan(typeof sp.plan === "string" ? sp.plan : o.plan_code) ?? getPlan("starter")!;
        const samePlan = plan.code === o.plan_code && o.status !== "trialing";
        const interval: BillingInterval =
          sp.interval === "annual" ||
          (sp.interval === undefined && samePlan && o.billing_interval === "annual")
            ? "annual"
            : "monthly";

        // Start from what's already paid for, plus anything the customer asked
        // to add, and never below what their current usage needs.
        const baseStaff = samePlan ? o.allowances.extra_staff : 0;
        const baseLocations = samePlan ? o.allowances.extra_work_locations : 0;
        const staff = plan.extraStaff.allowed
          ? (num(sp.staff) ??
            Math.max(
              baseStaff + (num(sp.addStaff) ?? 0),
              extraStaffNeeded(plan, o.usage.active_staff),
            ))
          : 0;
        const locations =
          num(sp.locations) ??
          Math.max(
            baseLocations + (num(sp.addLocations) ?? 0),
            extraLocationsNeeded(
              entitlement(plan.code, "work_locations").limit,
              o.usage.work_locations,
            ),
          );

        return (
          <div className="mx-auto grid max-w-2xl gap-4">
            <Link
              href={`/w/${ctx.company.slug}/settings/subscription`}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Back to subscription
            </Link>
            <Card>
              <CardHeader>
                <CardTitle>
                  {plan.code === "free" ? "Add work locations" : `Subscribe to ${plan.name}`}
                </CardTitle>
                <CardDescription>
                  {plan.code === "free"
                    ? "The Free plan stays free. You pay only for the extra work locations you add."
                    : `${plan.includedStaff} active staff included. Choose how you'd like to pay and any extra places you need.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CheckoutForm
                  slug={ctx.company.slug}
                  planCode={plan.code}
                  defaultInterval={interval}
                  defaultStaff={staff}
                  defaultLocations={locations}
                  paymentsConnected={isPaystackConfigured()}
                />
              </CardContent>
            </Card>
          </div>
        );
      }}
    </TenantPage>
  );
}
