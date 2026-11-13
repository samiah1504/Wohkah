"use client";

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlays";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A dialog containing a Server Action form. Closes and toasts on success;
 * keeps the dialog open with field errors on failure.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  action,
  hidden,
  submitLabel = "Save",
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: Action;
  hidden: Record<string, string>;
  submitLabel?: string;
  children: (state: FormState) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormKey((k) => k + 1); // fresh form state each time it opens
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogForm
          key={formKey}
          action={action}
          hidden={hidden}
          submitLabel={submitLabel}
          onSuccess={() => setOpen(false)}
        >
          {children}
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}

function DialogForm({
  action,
  hidden,
  submitLabel,
  onSuccess,
  children,
}: {
  action: Action;
  hidden: Record<string, string>;
  submitLabel: string;
  onSuccess: () => void;
  children: (state: FormState) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  // Handle each result exactly once, even if onSuccess changes identity.
  const handled = useRef<FormState | null>(null);
  const succeed = useEffectEvent(() => onSuccess());
  useEffect(() => {
    if (state.status === "success" && handled.current !== state) {
      handled.current = state;
      if (state.message) toast.success(state.message);
      succeed();
    }
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" ? <FormMessage state={state} /> : null}
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children(state)}
      <div className="flex justify-end gap-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

/**
 * One-click action (archive, remove, revoke…). Optional confirmation step.
 * Errors and successes are reported with a toast.
 */
export function ActionButton({
  action,
  hidden,
  children,
  confirm,
  variant = "outline",
  size = "sm",
}: {
  action: Action;
  hidden: Record<string, string>;
  children: React.ReactNode;
  confirm?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  // Toast as soon as the action returns, not after re-render: the button is
  // often removed by its own action (deleting a role, archiving a row), and
  // an effect in an unmounted component never runs.
  const [, formAction, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await action(prev, data);
    if (result.status === "success" && result.message) toast.success(result.message);
    if (result.status === "error" && result.message) toast.error(result.message);
    return result;
  }, initialFormState);
  const [asking, setAsking] = useState(false);

  if (confirm && !asking) {
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {confirm ? <span className="text-muted-foreground text-xs">{confirm}</span> : null}
      <Button
        type="submit"
        variant={confirm ? "destructive" : variant}
        size={size}
        disabled={pending}
        aria-busy={pending}
      >
        {confirm ? "Confirm" : children}
      </Button>
      {confirm ? (
        <Button type="button" variant="ghost" size={size} onClick={() => setAsking(false)}>
          Cancel
        </Button>
      ) : null}
    </form>
  );
}
