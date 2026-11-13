import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpgradePromptContent } from "@/lib/upgrade";
import { cn } from "@/lib/utils";

/** Contextual upgrade prompt: what, why, which plan or add-on, price, how. */
export function UpgradePrompt({
  prompt,
  canManage,
  className,
}: {
  prompt: UpgradePromptContent;
  /** People without subscription rights are told who can upgrade instead. */
  canManage: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "border-primary/40 bg-sand/60 flex flex-wrap items-start gap-3 rounded-xl border p-4",
        className,
      )}
    >
      <SparklesIcon className="text-walnut mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-walnut font-semibold">{prompt.title}</p>
        <p className="text-foreground/80 mt-1 text-sm">{prompt.body}</p>
        {!canManage ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Ask the workspace owner to change the subscription.
          </p>
        ) : null}
      </div>
      {canManage ? (
        <Button asChild size="sm">
          <Link href={prompt.href}>{prompt.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
