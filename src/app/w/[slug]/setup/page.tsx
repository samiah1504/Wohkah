import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { Button } from "@/components/ui/button";
import { isManager } from "@/lib/navigation";
import { setupSteps } from "@/modules/workspace/server/dashboard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Setup guide" };

/** The steps to get a business ready. Always reachable from Settings. */
export default function SetupPage(props: PageProps<"/w/[slug]/setup">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        if (
          !isManager({
            slug: ctx.company.slug,
            permissions: ctx.permissions,
            hasStaffRecord: false,
          })
        )
          return <NoAccess />;
        const steps = await setupSteps(ctx);
        const done = steps.filter((s) => s.done).length;
        return (
          <div className="mx-auto grid max-w-3xl gap-6">
            <PageHeader
              title="Setup guide"
              description="The few things that get your business ready in WOHKAH. Do them in any order."
              className="mb-0"
            />
            <div className="bg-surface rounded-xl border p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-walnut font-semibold">
                  {done === steps.length
                    ? "All done. Your business is set up."
                    : `${done} of ${steps.length} steps done`}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round((done / steps.length) * 100)}%
                </span>
              </div>
              <div className="bg-subtle mt-3 h-2 overflow-hidden rounded-full" aria-hidden>
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${(done / steps.length) * 100}%` }}
                />
              </div>
            </div>
            <ol className="bg-surface divide-y rounded-xl border">
              {steps.map((s, i) => (
                <li key={s.key} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  {s.done ? (
                    <CheckCircle2Icon className="text-success size-6 shrink-0" aria-label="Done" />
                  ) : (
                    <span className="relative flex size-6 shrink-0 items-center justify-center">
                      <CircleIcon className="text-taupe/60 size-6" aria-hidden />
                      <span className="text-muted-foreground absolute text-[11px] font-bold">
                        {i + 1}
                      </span>
                      <span className="sr-only">To do</span>
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold", s.done && "text-foreground/70")}>{s.label}</p>
                    <p className="text-muted-foreground text-sm">{s.detail}</p>
                  </div>
                  {s.allowed ? (
                    <Button asChild size="sm" variant={s.done ? "ghost" : "default"}>
                      <Link href={s.href}>{s.done ? "Review" : "Start"}</Link>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Ask the business owner</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      }}
    </TenantPage>
  );
}
