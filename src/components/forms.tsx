"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2Icon, CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import type { FormState } from "@/lib/forms";

/** Submit button with a pending state; disabled while submitting (no double submit). */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      variant={variant}
    >
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {pending ? (pendingLabel ?? "Please wait…") : children}
    </Button>
  );
}

/** Form-level message (error or success) announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message || state.status === "idle") return null;
  const isError = state.status === "error";
  return (
    <Alert variant={isError ? "destructive" : "success"} className="flex items-start gap-2">
      {isError ? (
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <span>{state.message}</span>
    </Alert>
  );
}

/** Show a toast when an action succeeds (for forms that stay on the page). */
export function useSuccessToast(state: FormState) {
  const last = useRef<FormState | null>(null);
  useEffect(() => {
    if (state !== last.current && state.status === "success" && state.message) {
      toast.success(state.message);
    }
    last.current = state;
  }, [state]);
}

/** aria props wiring an input to its error message (see Field in form-controls). */
export function errorProps(state: FormState, name: string) {
  const error = state.fieldErrors?.[name];
  return error
    ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
    : { "aria-invalid": false as const };
}
