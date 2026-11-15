"use client";

import { useRef, useState } from "react";
import {
  BoldIcon,
  BracesIcon,
  EyeIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
  PencilIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { AUTO_FIELDS, SUGGESTED_BLANKS } from "@/lib/contracts/document";
import { cn } from "@/lib/utils";
import { DocumentView } from "./document-view";

/**
 * Plain-text editor with a formatting toolbar, a field picker and a live
 * preview. The text is submitted as `name` with the surrounding form.
 */
export function DocumentEditor({
  name,
  defaultValue,
  label,
  invalid,
  fields = true,
  minRows = 22,
}: {
  name: string;
  defaultValue: string;
  label: string;
  invalid?: boolean;
  /** Offer staff and business fields (contracts); job descriptions don't need them. */
  fields?: boolean;
  minRows?: number;
}) {
  const [text, setText] = useState(defaultValue);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (fn: (value: string, start: number, end: number) => [string, number, number]) => {
    const el = ref.current;
    if (!el) return;
    const [next, s, e] = fn(el.value, el.selectionStart, el.selectionEnd);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s, e);
    });
  };

  /** Toggle a prefix on every selected line. */
  const linePrefix = (prefix: string | ((i: number) => string)) =>
    apply((v, start, end) => {
      const lineStart = v.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = v.indexOf("\n", end) === -1 ? v.length : v.indexOf("\n", end);
      const lines = v.slice(lineStart, lineEnd).split("\n");
      const strip = (l: string) => l.replace(/^(#{1,2}\s+|[-*]\s+|\d+[.)]\s+)/, "");
      const already = lines.every((l, i) =>
        l.startsWith(typeof prefix === "string" ? prefix : prefix(i)),
      );
      const out = lines
        .map((l, i) =>
          already ? strip(l) : (typeof prefix === "string" ? prefix : prefix(i)) + strip(l),
        )
        .join("\n");
      return [v.slice(0, lineStart) + out + v.slice(lineEnd), lineStart, lineStart + out.length];
    });

  const wrapBold = () =>
    apply((v, s, e) => {
      const sel = v.slice(s, e) || "bold text";
      const out = `**${sel}**`;
      return [v.slice(0, s) + out + v.slice(e), s + 2, s + 2 + sel.length];
    });

  const insert = (token: string) =>
    apply((v, s, e) => [v.slice(0, s) + token + v.slice(e), s + token.length, s + token.length]);

  const tool =
    "text-muted-foreground hover:text-foreground hover:bg-subtle inline-flex size-8 items-center justify-center rounded-md";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium" id={`${name}-label`}>
          {label}
        </span>
        <div className="bg-subtle inline-flex rounded-lg p-0.5 lg:hidden" role="tablist">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold",
                mode === m ? "bg-surface text-walnut shadow-xs" : "text-muted-foreground",
              )}
            >
              {m === "write" ? (
                <PencilIcon className="size-3.5" />
              ) : (
                <EyeIcon className="size-3.5" />
              )}
              {m === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn("grid gap-0", mode === "preview" && "hidden lg:grid")}>
          <div
            role="toolbar"
            aria-label="Formatting"
            className="bg-subtle/60 flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 px-1.5 py-1"
          >
            <button
              type="button"
              className={tool}
              onClick={() => linePrefix("# ")}
              title="Title"
              aria-label="Title"
            >
              <Heading1Icon className="size-4" />
            </button>
            <button
              type="button"
              className={tool}
              onClick={() => linePrefix("## ")}
              title="Section heading"
              aria-label="Section heading"
            >
              <Heading2Icon className="size-4" />
            </button>
            <button
              type="button"
              className={tool}
              onClick={wrapBold}
              title="Bold"
              aria-label="Bold"
            >
              <BoldIcon className="size-4" />
            </button>
            <button
              type="button"
              className={tool}
              onClick={() => linePrefix("- ")}
              title="Bullet list"
              aria-label="Bullet list"
            >
              <ListIcon className="size-4" />
            </button>
            <button
              type="button"
              className={tool}
              onClick={() => linePrefix((i) => `${i + 1}. `)}
              title="Numbered list"
              aria-label="Numbered list"
            >
              <ListOrderedIcon className="size-4" />
            </button>
            {fields ? (
              <>
                <span className="bg-border mx-1 h-5 w-px" aria-hidden />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="text-walnut hover:bg-subtle inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold"
                    >
                      <BracesIcon className="size-4" /> Insert field
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                    <DropdownMenuLabel>Filled in automatically</DropdownMenuLabel>
                    {AUTO_FIELDS.map(([key, l]) => (
                      <DropdownMenuItem key={key} onSelect={() => insert(`{{${l}}}`)}>
                        {l}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filled in for each contract</DropdownMenuLabel>
                    {SUGGESTED_BLANKS.map((l) => (
                      <DropdownMenuItem key={l} onSelect={() => insert(`{{${l}}}`)}>
                        {l}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
          <textarea
            ref={ref}
            id={name}
            name={name}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={minRows}
            spellCheck
            aria-labelledby={`${name}-label`}
            aria-invalid={invalid || undefined}
            className={cn(
              "border-input bg-surface focus-visible:border-ring focus-visible:ring-ring/30 w-full resize-y rounded-b-lg border px-4 py-3 font-mono text-[13px] leading-6 outline-none focus-visible:ring-2",
              invalid && "border-destructive",
            )}
          />
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            # Title · ## Section · **bold** · - bullet · 1. numbered list
            {fields ? " · {{Field}} is filled in for each staff member" : ""}
          </p>
        </div>
        <div
          className={cn(
            "bg-subtle/50 max-h-[760px] overflow-y-auto rounded-lg border p-3 sm:p-4",
            mode === "write" && "hidden lg:block",
          )}
        >
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Preview
          </p>
          <DocumentView body={text} compact />
        </div>
      </div>
    </div>
  );
}
