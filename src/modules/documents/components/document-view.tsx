import { Fragment } from "react";
import { parseDocument, type Span } from "@/lib/contracts/document";
import { cn } from "@/lib/utils";

/** Text with {{blanks}} shown as highlighted chips. */
function Inline({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        const parts = s.text.split(/(\{\{[^{}]{1,60}\}\})/g);
        const content = parts.map((p, j) =>
          /^\{\{[^{}]+\}\}$/.test(p) ? (
            <mark
              key={j}
              className="bg-primary/20 text-walnut rounded px-1 py-0.5 text-[0.92em] font-semibold"
              title="Filled in before sending"
            >
              {p.slice(2, -2).trim()}
            </mark>
          ) : (
            <Fragment key={j}>{p}</Fragment>
          ),
        );
        return s.bold ? (
          <strong key={i} className="font-semibold">
            {content}
          </strong>
        ) : (
          <Fragment key={i}>{content}</Fragment>
        );
      })}
    </>
  );
}

/** A document rendered like a sheet of paper. */
export function DocumentView({
  body,
  className,
  compact = false,
}: {
  body: string;
  className?: string;
  compact?: boolean;
}) {
  const blocks = parseDocument(body);
  return (
    <article
      className={cn(
        "text-foreground mx-auto w-full max-w-[720px] rounded-lg border bg-white text-[15px] leading-7 shadow-xs",
        compact ? "px-5 py-6" : "px-6 py-8 sm:px-12 sm:py-12",
        className,
      )}
    >
      {blocks.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing written yet.</p>
      ) : null}
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <h2
                key={i}
                className="font-heading text-walnut mb-5 text-2xl leading-tight font-extrabold"
              >
                <Inline spans={b.spans} />
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="font-heading text-walnut mt-6 mb-2 text-base font-bold">
                <Inline spans={b.spans} />
              </h3>
            );
          case "p":
            return (
              <p key={i} className="mb-3">
                <Inline spans={b.spans} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = b.type === "ul" ? "ul" : "ol";
            return (
              <List
                key={i}
                className={cn(
                  "mb-3 grid gap-1 pl-6",
                  b.type === "ul" ? "list-disc" : "list-decimal",
                )}
              >
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline spans={item} />
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </article>
  );
}
