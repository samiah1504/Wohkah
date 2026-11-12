import { cn } from "@/lib/utils";

/** Simple text page for About, Contact and legal pages. */
export function ProsePage({
  eyebrow,
  title,
  intro,
  notice,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      {eyebrow ? (
        <p className="text-sm font-bold tracking-wide text-[#a77b00] uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="font-heading text-walnut mt-2 text-4xl font-extrabold">{title}</h1>
      {intro ? <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{intro}</p> : null}
      {notice ? (
        <div className="border-primary/40 bg-sand/60 text-walnut mt-6 rounded-xl border p-4 text-sm">
          {notice}
        </div>
      ) : null}
      <div
        className={cn(
          "mt-8 grid gap-6 leading-relaxed",
          "[&_h2]:font-heading [&_h2]:text-walnut [&_h2]:text-xl [&_h2]:font-extrabold",
          "[&_a]:text-walnut [&_a]:font-semibold [&_a]:underline [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5",
        )}
      >
        {children}
      </div>
    </div>
  );
}
