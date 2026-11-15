"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MailIcon, PenLineIcon, RotateCcwIcon, TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { requestSigningCode, signContract } from "../server/actions";

/** Draw-with-finger signature box. Produces a PNG data URL. */
function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2B1D18";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvas}
        aria-label="Draw your signature here"
        role="img"
        className="h-36 w-full touch-none rounded-lg border border-dashed bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          setEmpty(false);
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {empty ? "Use your finger or mouse to sign." : "Signature drawn."}
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold"
          onClick={() => {
            const c = canvas.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setEmpty(true);
            onChange("");
          }}
        >
          <RotateCcwIcon className="size-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}

export function SignForm({
  slug,
  id,
  defaultName,
  consent,
  kind,
}: {
  slug: string;
  id: string;
  defaultName: string;
  consent: string;
  kind: "contract" | "policy";
}) {
  const [state, action] = useActionState(signContract, initialFormState);
  const v = state.values ?? {};
  const [markType, setMarkType] = useState<"typed" | "drawn">((v.markType as "typed") ?? "typed");
  const [name, setName] = useState(v.signerName ?? defaultName);
  const [drawn, setDrawn] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const e = state.fieldErrors ?? {};
  const ready = agreed && name.trim().length >= 2 && (markType === "typed" || drawn);

  async function sendCode() {
    setSending(true);
    setCodeError(null);
    try {
      const out = await requestSigningCode({ slug, id });
      if (out.ok) setCodeSentTo(out.email);
      else setCodeError(out.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form action={action} noValidate className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="markType" value={markType} />
      <input type="hidden" name="drawn" value={drawn} />
      {state.status === "error" && !e.code ? <FormMessage state={state} /> : null}

      <section className="grid gap-4">
        <h2 className="text-walnut font-semibold">1. Your signature</h2>
        <Field label="Your full name" htmlFor="signerName" error={e.signerName}>
          <Input
            id="signerName"
            name="signerName"
            autoComplete="name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            {...errorProps(state, "signerName")}
          />
        </Field>
        {kind === "contract" ? (
          <>
            <div
              className="bg-subtle inline-flex w-fit rounded-lg p-1"
              role="radiogroup"
              aria-label="How to sign"
            >
              {(
                [
                  ["typed", "Type", TypeIcon],
                  ["drawn", "Draw", PenLineIcon],
                ] as const
              ).map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={markType === k}
                  onClick={() => setMarkType(k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold",
                    markType === k ? "bg-surface text-walnut shadow-xs" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
            {markType === "typed" ? (
              <div className="rounded-lg border bg-white px-5 py-6">
                <p className="text-muted-foreground mb-1 text-xs">Your signature</p>
                <p className="font-heading text-walnut truncate text-3xl italic">{name || " "}</p>
              </div>
            ) : (
              <SignaturePad onChange={setDrawn} />
            )}
            {e.drawn ? <p className="text-destructive text-sm font-medium">{e.drawn}</p> : null}
          </>
        ) : null}
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="consent"
            checked={agreed}
            onChange={(ev) => setAgreed(ev.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand-yellow)]"
          />
          <span>{consent}</span>
        </label>
        {e.consent ? <p className="text-destructive text-sm font-medium">{e.consent}</p> : null}
      </section>

      <section className="grid gap-4">
        <h2 className="text-walnut font-semibold">2. Confirm with a code</h2>
        <p className="text-muted-foreground text-sm">
          We email you a 6-digit code to confirm it&apos;s really you.
        </p>
        {codeError ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {codeError}
          </p>
        ) : null}
        {codeSentTo ? (
          <>
            <p className="bg-subtle rounded-lg px-3 py-2 text-sm" role="status">
              Code sent to <strong>{codeSentTo}</strong>. It works for 10 minutes.{" "}
              <button
                type="button"
                className="text-walnut font-semibold underline"
                onClick={sendCode}
                disabled={sending}
              >
                Send a new code
              </button>
            </p>
            <Field label="6-digit code" htmlFor="code" error={e.code}>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="max-w-40 text-lg tracking-[0.3em]"
                {...errorProps(state, "code")}
              />
            </Field>
            <SubmitButton
              disabled={!ready}
              pendingLabel="Signing…"
              className="h-11 w-full text-base sm:w-fit"
            >
              {kind === "contract" ? "Sign document" : "Confirm I have read it"}
            </SubmitButton>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={sendCode}
            disabled={!ready || sending}
            className="w-fit"
          >
            <MailIcon /> {sending ? "Sending…" : "Email me a code"}
          </Button>
        )}
        {!ready && !codeSentTo ? (
          <p className="text-muted-foreground text-xs">
            {kind === "contract"
              ? "Add your name and signature, and tick the box, to continue."
              : "Add your name and tick the box to continue."}
          </p>
        ) : null}
      </section>
    </form>
  );
}
