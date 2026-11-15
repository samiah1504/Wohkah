import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { NavChild, NavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";

/**
 * A section's home page: its pages grouped, as tiles. Pages that exist are
 * links; pages not built yet show the automatic "Coming soon" label and no link.
 */
export function SectionHub({
  section,
  intro,
  children,
  header = true,
}: {
  section: NavSection;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  /** Off when the surrounding layout already shows the page title. */
  header?: boolean;
}) {
  const groups = new Map<string, NavChild[]>();
  for (const c of section.children) {
    const g = c.group ?? "";
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }
  return (
    <>
      {header ? <PageHeader title={section.label} description={section.description} /> : null}
      {intro}
      {children}
      <div className="grid gap-8">
        {[...groups.entries()].map(([group, items]) => (
          <section
            key={group || "main"}
            aria-labelledby={group ? `g-${slugify(group)}` : undefined}
          >
            {group ? (
              <h2
                id={`g-${slugify(group)}`}
                className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase"
              >
                {group}
              </h2>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <li key={c.key}>
                  <HubTile item={c} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function HubTile({ item }: { item: NavChild }) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className={cn("font-semibold", !item.href && "text-foreground/70")}>
          {item.label}
        </span>
        {item.href ? (
          <ArrowRightIcon
            className="text-muted-foreground group-hover:text-walnut mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        ) : (
          <span className="bg-subtle text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Coming soon
          </span>
        )}
      </span>
      <span className="text-muted-foreground mt-1 block text-sm leading-snug">
        {item.description}
      </span>
    </>
  );
  return item.href ? (
    <Link
      href={item.href}
      className="group bg-surface hover:border-primary/60 block h-full rounded-xl border p-4 transition-colors"
    >
      {body}
    </Link>
  ) : (
    <div className="bg-surface/60 block h-full rounded-xl border border-dashed p-4" aria-disabled>
      {body}
    </div>
  );
}
