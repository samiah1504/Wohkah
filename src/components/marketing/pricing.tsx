"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, monthlyEstimateMinor, naira } from "@/lib/plans";

const HIGHLIGHT = "growth";

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const starter = PLANS.find((p) => p.code === "starter")!;

  return (
    <div>
      <div className="flex justify-center">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((p) => {
          const featured = p.code === HIGHLIGHT;
          const price =
            p.monthlyMinor === 0
              ? "₦0"
              : annual && p.annualMinor
                ? naira(p.annualMinor)
                : naira(p.monthlyMinor);
          const period = p.monthlyMinor === 0 ? "/month" : annual ? "/year" : "/month";
          return (
            <div
              key={p.code}
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
              <p className="text-muted-foreground mt-1 text-sm leading-snug lg:min-h-[5.25rem]">
                {p.forWho}
              </p>
              <p className="mt-4">
                <span className="font-heading text-walnut block text-3xl font-extrabold lg:text-[1.65rem] xl:text-3xl">
                  {price}
                </span>
                <span className="text-muted-foreground text-sm">{period.replace("/", "per ")}</span>
              </p>
              <ul className="mt-4 grid gap-2 text-sm">
                <li className="flex gap-2">
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong>{p.includedStaff} staff</strong> included
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" />
                  <span>+{naira(p.extraStaffMinor)}/month per extra staff member</span>
                </li>
              </ul>
              <Button asChild variant={featured ? "default" : "outline"} className="mt-6 w-full">
                <Link href={p.code === "free" ? "/register" : `/register?plan=${p.code}`}>
                  {p.code === "free" ? "Start free" : `Choose ${p.name}`}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-sand/60 mx-auto mt-8 grid max-w-4xl gap-4 rounded-2xl p-5 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <h3 className="text-walnut font-bold">How extra staff are charged</h3>
          <p className="text-muted-foreground mt-1">
            Every plan includes a number of staff. Each extra <strong>active</strong> staff member
            costs {naira(starter.extraStaffMinor)} a month. Staff who haven&apos;t accepted their
            invitation, have left, or have been archived are not counted.
          </p>
        </div>
        <div>
          <h3 className="text-walnut font-bold">Example</h3>
          <p className="text-muted-foreground mt-1">
            Starter includes {starter.includedStaff} staff. With 15 active staff you pay{" "}
            {naira(starter.monthlyMinor)} + 5 × {naira(starter.extraStaffMinor)} ={" "}
            <strong className="text-walnut">{naira(monthlyEstimateMinor(starter, 15))}</strong> a
            month.
          </p>
        </div>
      </div>
      <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-xs">
        Every workspace starts on the Free plan. Online payment for paid plans is being set up;
        until then, contact us to upgrade. You&apos;ll always be told what you&apos;ll pay before
        you are charged.
      </p>
    </div>
  );
}
