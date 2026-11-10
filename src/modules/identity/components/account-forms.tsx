"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { Field, Input } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps, useSuccessToast } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import {
  confirmMfaEnrollment,
  disableMfa,
  resetPassword,
  startMfaEnrollment,
  updateProfile,
  type EnrollState,
} from "../server/actions";

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string | null;
  email: string;
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  useSuccessToast(state);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <Field label="Email" htmlFor="email" hint="Your sign-in email. Contact support to change it.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Field label="Full name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={state.values?.fullName ?? fullName}
          {...errorProps(state, "fullName")}
        />
      </Field>
      <Field label="Phone" htmlFor="phone" error={state.fieldErrors?.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={state.values?.phone ?? phone ?? ""}
          {...errorProps(state, "phone")}
        />
      </Field>
      <div>
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(resetPassword, initialFormState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 10 characters, with upper and lowercase letters and a number."
        error={state.fieldErrors?.password}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" {...errorProps(state, "password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...errorProps(state, "confirmPassword")}
        />
      </Field>
      <div>
        <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
      </div>
    </form>
  );
}

export function MfaSettings({
  verifiedFactorId,
  sessionAal,
}: {
  verifiedFactorId: string | null;
  sessionAal: "aal1" | "aal2";
}) {
  const [enrollment, setEnrollment] = useState<EnrollState | null>(null);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirmAction] = useActionState(confirmMfaEnrollment, initialFormState);
  const [disableState, disableAction] = useActionState(disableMfa, initialFormState);
  useSuccessToast(confirmState);
  useSuccessToast(disableState);

  if (verifiedFactorId && disableState.status !== "success") {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-5 text-success" aria-hidden />
          <span className="font-medium">Two-step verification is on.</span>
          <Badge variant="success">Protected</Badge>
        </div>
        <FormMessage state={disableState} />
        {sessionAal === "aal2" ? (
          <form action={disableAction}>
            <input type="hidden" name="factorId" value={verifiedFactorId} />
            <SubmitButton variant="outline" pendingLabel="Turning off…">
              <ShieldOffIcon /> Turn off two-step verification
            </SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            To turn it off, sign out and sign in again with your authenticator code.
          </p>
        )}
      </div>
    );
  }

  if (confirmState.status === "success") {
    return (
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-5 text-success" aria-hidden />
        <span className="font-medium">Two-step verification is on.</span>
      </div>
    );
  }

  const e = enrollment?.enrollment;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Add a second step at sign-in using an authenticator app such as Google Authenticator,
        Microsoft Authenticator or 1Password. Strongly recommended for owners and administrators.
      </p>
      {enrollment?.status === "error" ? <FormMessage state={enrollment} /> : null}
      {!e ? (
        <div>
          <Button
            type="button"
            disabled={starting}
            onClick={() => startTransition(async () => setEnrollment(await startMfaEnrollment()))}
          >
            <ShieldCheckIcon /> {starting ? "Preparing…" : "Set up two-step verification"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 rounded-lg border bg-subtle/40 p-4 sm:grid-cols-[180px_1fr]">
          {/* Supabase returns the QR code as an SVG data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.qrCode} alt="QR code for your authenticator app" className="size-44 rounded bg-white p-2" />
          <div className="grid content-start gap-3">
            <p className="text-sm">
              1. Scan the QR code with your authenticator app, or enter this key:{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs break-all">{e.secret}</code>
            </p>
            <p className="text-sm">2. Enter the 6-digit code it shows.</p>
            <form action={confirmAction} className="grid gap-3" noValidate>
              <FormMessage state={confirmState} />
              <input type="hidden" name="factorId" value={e.factorId} />
              <Field label="Code" htmlFor="code" error={confirmState.fieldErrors?.code}>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="max-w-40 tracking-[0.3em]"
                  {...errorProps(confirmState, "code")}
                />
              </Field>
              <div>
                <SubmitButton pendingLabel="Verifying…">Turn on</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
