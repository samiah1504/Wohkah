"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { getPlan, naira, type BillingInterval, type PlanCode } from "@/lib/plans/catalog";
import { quote } from "@/lib/plans/quote";
import { proceedToPayment, type CheckoutState } from "../server/actions";

/**
 * Choose billing period and add-ons. The total shown here is a preview; the
 * server prices the invoice again from the database before payment.
 */
export function CheckoutForm({
  slug,
  planCode,
  defaultInterval,
  defaultStaff,
  defaultLocations,
  paymentsConnected,
}: {
  slug: string;
  planCode: PlanCode;
  defaultInterval: BillingInterval;
  defaultStaff: number;
  defaultLocations: number;
  paymentsConnected: boolean;
}) {
  const plan = getPlan(planCode)!;
  const [state, action] = useActionState<CheckoutState, FormData>(
    proceedToPayment,
    initialFormState,
  );
  const [interval, setInterval] = useState<BillingInterval>(
    plan.annualMinor === null ? "monthly" : defaultInterval,
  );
  const [staff, setStaff] = useState(plan.extraStaff.allowed ? defaultStaff : 0);
  const [locations, setLocations] = useState(defaultLocations);
  const q = quote(plan.code, interval, staff, locations);
  const per = interval === "annual" ? "year" : "month";

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="plan" value={plan.code} />
      <input type="hidden" name="interval" value={interval} />

      {plan.annualMinor !== null ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Billing period</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["monthly", "annual"] as const).map((i) => (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3",
                  interval === i && "border-primary bg-primary/5",
                )}
              >
                <span>
                  <span className="block font-semibold">
                    {i === "monthly" ? "Monthly" : "Yearly"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {i === "monthly"
                      ? `${naira(plan.monthlyMinor)} a month`
                      : `${naira(plan.annualMinor!)} a year (12 months for the price of 10)`}
                  </span>
                </span>
                <input
                  type="radio"
                  name="intervalChoice"
                  checked={interval === i}
                  onChange={() => setInterval(i)}
                  className="accent-[var(--brand-yellow)]"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Extra active staff"
          htmlFor="extraStaff"
          hint={
            plan.extraStaff.allowed
              ? `Beyond the ${plan.includedStaff} included. ${naira(interval === "annual" ? plan.extraStaff.annualMinor : plan.extraStaff.monthlyMinor)} per ${per} each.`
              : "Extra staff places are available on paid plans."
          }
        >
          <Input
            id="extraStaff"
            name="extraStaff"
            type="number"
            min={0}
            max={10000}
            value={staff}
            disabled={!plan.extraStaff.allowed}
            onChange={(e) => setStaff(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <Field
          label="Extra work locations"
          htmlFor="extraLocations"
          hint={`Beyond those included. ${naira(interval === "annual" ? plan.extraWorkLocation.annualMinor : plan.extraWorkLocation.monthlyMinor)} per ${per} each.`}
        >
          <Input
            id="extraLocations"
            name="extraLocations"
            type="number"
            min={0}
            max={1000}
            value={locations}
            onChange={(e) => setLocations(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
      </div>
      {!plan.extraStaff.allowed ? <input type="hidden" name="extraStaff" value="0" /> : null}

      <div className="bg-subtle/50 rounded-xl border p-4">
        <dl className="grid gap-2 text-sm">
          {q.lines
            .filter((l) => l.item === "plan" || l.quantity > 0)
            .map((l) => (
              <div key={l.item} className="flex justify-between gap-4">
                <dt>
                  {l.item === "plan"
                    ? `${plan.name} plan (${interval === "annual" ? "yearly" : "monthly"})`
                    : `${l.quantity} extra ${l.item === "extra_staff" ? "staff" : "work location"}${l.quantity === 1 ? "" : "s"} × ${naira(l.unitMinor)}`}
                </dt>
                <dd className="font-medium">{naira(l.amountMinor)}</dd>
              </div>
            ))}
          <div className="text-walnut flex justify-between gap-4 border-t pt-2 text-base font-bold">
            <dt>Total per {per}</dt>
            <dd>{naira(q.totalMinor)}</dd>
          </div>
        </dl>
      </div>

      <FormMessage state={state} />
      {!paymentsConnected ? (
        <p className="text-muted-foreground text-xs">
          Online payment (Paystack) isn&apos;t connected in this environment yet. Nothing will be
          charged.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          You&apos;ll pay securely with Paystack. Your plan changes only after the payment is
          confirmed.
        </p>
      )}
      <div>
        <SubmitButton pendingLabel="Preparing payment…" className="w-full sm:w-auto">
          Proceed to Payment ({naira(q.totalMinor)})
        </SubmitButton>
      </div>
    </form>
  );
}
