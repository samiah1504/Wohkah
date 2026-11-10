import type { Metadata } from "next";
import { CheckIcon, MinusIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FEATURES, FEATURE_LABELS, type Feature } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plan" };

const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    kobo / 100,
  );

function display(feature: Feature, state: { enabled: boolean; limit: number | null } | undefined) {
  if (!state || !state.enabled) return <MinusIcon className="inline size-4 text-muted-foreground" aria-label="Not included" />;
  if (state.limit === null) {
    return feature === "custom_domains" || feature === "admins" || feature === "branches" || feature === "work_locations" || feature === "storage_mb"
      ? "Unlimited"
      : <CheckIcon className="inline size-4 text-success" aria-label="Included" />;
  }
  if (feature === "storage_mb") return state.limit >= 1024 ? `${state.limit / 1024} GB` : `${state.limit} MB`;
  return String(state.limit);
}

export default function PlanPage(props: PageProps<"/w/[slug]/settings/plan">) {
  return (
    <TenantPage params={props.params} anyOf={["subscription.view"]}>
      {async (ctx) => {
        const supabase = await createClient();
        const { data: plans, error } = await supabase
          .from("subscription_plans")
          .select("code, name, description, monthly_price_minor, annual_price_minor, included_employees, extra_employee_price_minor")
          .order("sort_order");
        if (error) throw new Error("Could not load plans.");
        const current = plans.find((p) => p.code === ctx.plan.code);

        return (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {ctx.plan.name} plan <Badge variant="success">{ctx.subscriptionStatus ?? "active"}</Badge>
                </CardTitle>
                {current ? (
                  <CardDescription>
                    {current.monthly_price_minor === 0
                      ? "Free forever"
                      : `${naira(current.monthly_price_minor)} per month`}
                    {" · "}
                    {current.included_employees} employees included, then{" "}
                    {naira(current.extra_employee_price_minor)} per additional active employee per month.
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <Alert variant="info">
                  Online upgrades and payments are being set up and aren&apos;t available yet. To change
                  plan now, contact WOHKAH support.
                </Alert>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 font-heading text-lg font-bold">What your plan includes</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">{ctx.plan.name}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEATURES.map((f) => (
                    <TableRow key={f}>
                      <TableCell>{FEATURE_LABELS[f]}</TableCell>
                      <TableCell className="text-right">{display(f, ctx.features[f])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h2 className="mb-3 font-heading text-lg font-bold">All plans</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {plans.map((p) => (
                  <Card key={p.code} className={p.code === ctx.plan.code ? "border-primary ring-1 ring-primary" : undefined}>
                    <CardHeader className="pb-6">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <p className="font-heading text-xl font-extrabold">
                        {p.monthly_price_minor === 0 ? "₦0" : naira(p.monthly_price_minor)}
                        <span className="text-xs font-medium text-muted-foreground"> /month</span>
                      </p>
                      {p.annual_price_minor ? (
                        <p className="text-xs text-muted-foreground">or {naira(p.annual_price_minor)} /year</p>
                      ) : null}
                      <CardDescription>{p.included_employees} employees included</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </TenantPage>
  );
}
