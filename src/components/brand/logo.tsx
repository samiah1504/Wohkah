import { cn } from "@/lib/utils";

/**
 * WOHKAH wordmark: bold geometric type with a Deep Yellow mark.
 * `tone` picks the text colour for light or dark surfaces.
 */
export function Logo({
  className,
  tone = "dark",
  withTagline = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  withTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
          <rect width="32" height="32" rx="8" fill="#D69E00" />
          <path
            d="M7 10l3.2 12h2.4L16 13.2 19.4 22h2.4L25 10h-3l-1.9 7.8L17.2 10h-2.4l-2.9 7.8L10 10H7z"
            fill="#2B1D18"
          />
        </svg>
        <span
          className={cn(
            "font-heading text-xl font-extrabold tracking-tight",
            tone === "dark" ? "text-walnut" : "text-white",
          )}
        >
          WOHKAH
        </span>
      </span>
      {withTagline ? (
        <span
          className={cn(
            "mt-1 text-xs font-medium",
            tone === "dark" ? "text-muted-foreground" : "text-sidebar-muted",
          )}
        >
          Your staff, well managed.
        </span>
      ) : null}
    </span>
  );
}

export function CriftAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-xs", className)}>A product of Crift Concepts</p>
  );
}
