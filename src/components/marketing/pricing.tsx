"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEATURE_INFO, PLANS, entitlement, naira } from "@/lib/plans/catalog";
import { quote } from "@/lib/plans/quote";

const HIGHLIGHT = "growth";

/** Public pricing cards. Every number comes from the central plan catalogue. */
export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const starter = PLANS.find((p) => p.code === "starter")!;
  const example = quote("starter", "monthly", 5, 0);

  return (
    <div>
      <p className="text-walnut text-center font-semibold">
        Start with a 7-day free trial. No card required.
      </p>
      <div className="mt-4 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="bg-surface inline-flex rounded-full border p-1 text-sm font-semibold"
        >
          {[
            { value: false, label: "Monthly" },
            { value: true, label: "Yearly" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={annual === o.value}
              onClick={() => setAnnual(o.value)}
              className={cn(
                "rounded-full px-4 py-1.5 transition-colors",
                annual === o.value
                  ? "bg-walnut text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-sm">
        {annual
          ? "Yearly plans cost the same as 10 months: you get 12 months for the price of 10."
          : "Pay month by month. Switch to yearly and pay for 10 months instead of 12."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const featured = p.code === HIGHLIGHT;
          const free = p.monthlyMinor === 0;
          const price = free
            ? "₦0"
            : annual && p.annualMinor
              ? naira(p.annualMinor)
              : naira(p.monthlyMinor);
          const period = free ? "per month, forever" : annual ? "per year" : "per month";
          const locations = entitlement(p.code, "work_locations").limit;
          return (
            <section
              key={p.code}
              aria-label={`${p.name} plan`}
              className={cn(
                "bg-surface relative flex flex-col rounded-2xl border p-5",
                featured && "border-primary ring-primary shadow-lg ring-1",
              )}
            >
              {featured ? (
                <span className="bg-primary text-walnut absolute -top-3 left-5 rounded-full px-3 py-0.5 text-xs font-bold">
                  Recommended
                </span>
              ) : null}
              <h3 className="font-heading text-walnut text-lg font-extrabold">{p.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-snug lg:min-h-[4rem]">
                {p.forWho}
              </p>
              <p className="mt-4">
                <span className="font-heading text-walnut block text-3xl font-extrabold">
                  {price}
                </span>
                <span className="text-muted-foreground text-sm">{period}</span>
              </p>
              <ul className="mt-4 grid gap-2 text-sm">
                <li className="flex gap-2">
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <strong>{p.includedStaff} active staff</strong> included
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    {locations} approved work location{locations === 1 ? "" : "s"}
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    {p.extraStaff.allowed
                      ? `Extra staff: ${naira(annual ? p.extraStaff.annualMinor : p.extraStaff.monthlyMinor)} each per ${annual ? "year" : "month"}`
                      : "Upgrade to add more staff"}
                  </span>
                </li>
                {p.highlights.map((k) => (
                  <li key={k} className="flex gap-2">
                    <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {FEATURE_INFO[k].label}
                      {!FEATURE_INFO[k].available ? (
                        <span className="text-muted-foreground"> (coming soon)</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button asChild variant={featured ? "default" : "outline"} className="w-full">
                  <Link href={free ? "/register" : `/register?plan=${p.code}`}>
                    {free ? "Start free" : "Start free trial"}
                  </Link>
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="bg-sand/60 mx-auto mt-8 grid max-w-5xl gap-4 rounded-2xl p-5 text-sm sm:grid-cols-3 sm:p-6">
        <div>
          <h3 className="text-walnut font-bold">Extra staff</h3>
          <p className="text-muted-foreground mt-1">
            On paid plans, each extra <strong>active</strong> staff member costs{" "}
            {naira(starter.extraStaff.monthlyMinor)} a month or{" "}
            {naira(starter.extraStaff.annualMinor)} a year. Staff who have left or been archived
            don&apos;t count. The Free plan covers 3 active staff; to manage more, upgrade.
          </p>
        </div>
        <div>
          <h3 className="text-walnut font-bold">Extra work locations</h3>
          <p className="text-muted-foreground mt-1">
            Need more approved work locations than your plan includes? Each extra location costs{" "}
            {naira(starter.extraWorkLocation.monthlyMinor)} a month or{" "}
            {naira(starter.extraWorkLocation.annualMinor)} a year.
          </p>
        </div>
        <div>
          <h3 className="text-walnut font-bold">Example</h3>
          <p className="text-muted-foreground mt-1">
            Starter includes {starter.includedStaff} staff. With 15 active staff you pay{" "}
            {naira(starter.monthlyMinor)} + 5 × {naira(starter.extraStaff.monthlyMinor)} ={" "}
            <strong className="text-walnut">{naira(example.totalMinor)}</strong> a month.
          </p>
        </div>
      </div>
      <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-xs">
        Try Starter, Growth or Business free for 7 days. When the trial ends, your workspace moves
        to the Free plan unless you subscribe, and nothing is deleted. You&apos;ll always see the
        price before you pay.
      </p>
    </div>
  );
}
