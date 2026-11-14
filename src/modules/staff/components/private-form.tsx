"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockIcon } from "lucide-react";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/forms";
import { GENDERS } from "@/lib/copy/staff";
import { savePrivateDetails } from "../server/actions";
import { FormSection } from "./form-section";

export type PrivateValues = {
  dateOfBirth: string | null;
  gender: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelationship: string | null;
  kinName: string | null;
  kinPhone: string | null;
  kinRelationship: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  tin: string | null;
  pensionPin: string | null;
  pfaName: string | null;
};

export function PrivateDetailsForm({
  slug,
  employeeId,
  values,
  cancelHref,
}: {
  slug: string;
  employeeId: string;
  values: PrivateValues;
  cancelHref: string;
}) {
  const [state, action] = useActionState(savePrivateDetails, initialFormState);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const text = (
    name: keyof PrivateValues,
    label: string,
    opts: { hint?: string; type?: string; inputMode?: "numeric" | "tel" } = {},
  ) => (
    <Field label={label} htmlFor={name} hint={opts.hint} error={e[name]}>
      <Input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        autoComplete="off"
        defaultValue={v[name] ?? values[name] ?? ""}
        {...errorProps(state, name)}
      />
    </Field>
  );

  return (
    <form action={action} noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={employeeId} />
      <p className="bg-sand/60 text-walnut mb-6 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
        <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Only people you give access to private staff details can see this. Changes are recorded in
        the staff member&apos;s history, without the values.
      </p>
      {state.status === "error" ? (
        <div className="mb-6">
          <FormMessage state={state} />
        </div>
      ) : null}

      <FormSection title="Personal">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("dateOfBirth", "Date of birth", { type: "date" })}
          <Field label="Gender" htmlFor="gender">
            <NativeSelect id="gender" name="gender" defaultValue={v.gender ?? values.gender ?? ""}>
              <option value="">Not recorded</option>
              {Object.entries(GENDERS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Home address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("addressLine1", "Address")}</div>
          <div className="sm:col-span-2">
            {text("addressLine2", "Address line 2", { hint: "Optional." })}
          </div>
          {text("city", "City or town")}
          {text("state", "State")}
        </div>
      </FormSection>

      <FormSection
        title="Emergency contact"
        description="Who to call if something happens at work."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {text("emergencyName", "Name")}
          {text("emergencyPhone", "Phone number", { type: "tel", inputMode: "tel" })}
          {text("emergencyRelationship", "Relationship", { hint: "For example Sister." })}
        </div>
      </FormSection>

      <FormSection title="Next of kin">
        <div className="grid gap-4 sm:grid-cols-3">
          {text("kinName", "Name")}
          {text("kinPhone", "Phone number", { type: "tel", inputMode: "tel" })}
          {text("kinRelationship", "Relationship")}
        </div>
      </FormSection>

      <FormSection
        title="Bank details"
        description="Where their salary goes. Only you and people with access can change this."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {text("bankName", "Bank")}
          {text("bankAccountNumber", "Account number", {
            inputMode: "numeric",
            hint: "10 digits for Nigerian banks.",
          })}
          <div className="sm:col-span-2">{text("bankAccountName", "Account name")}</div>
        </div>
      </FormSection>

      <FormSection title="Tax and pension" description="Optional.">
        <div className="grid gap-4 sm:grid-cols-3">
          {text("tin", "Tax ID (TIN)")}
          {text("pensionPin", "Pension PIN")}
          {text("pfaName", "Pension fund administrator")}
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">Save private details</SubmitButton>
      </div>
    </form>
  );
}
