"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/phone-input";
import { initialFormState } from "@/lib/forms";
import { EMPLOYMENT_TYPES } from "@/lib/copy/staff";
import { saveStaff } from "../server/actions";
import { FormSection } from "./form-section";

export type StaffFormValues = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  employmentType: string;
  startDate: string | null;
  branchId: string | null;
  reportsTo: string | null;
};

export function StaffForm({
  slug,
  staff,
  branches,
  managers,
  jobTitles,
  cancelHref,
}: {
  slug: string;
  staff?: StaffFormValues;
  branches: { id: string; name: string }[];
  managers: { id: string; full_name: string; job_title: string | null }[];
  jobTitles: string[];
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveStaff, initialFormState);
  const v = state.values ?? {};
  const val = (k: string, fallback: string | null | undefined) => v[k] ?? fallback ?? "";
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-0">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={staff?.id ?? ""} />
      {state.status === "error" ? (
        <div className="mb-6">
          <FormMessage state={state} />
        </div>
      ) : null}

      <FormSection
        title="Name and contact"
        description="How they appear across WOHKAH, and how to reach them."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" error={e.firstName}>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="off"
              defaultValue={val("firstName", staff?.firstName)}
              {...errorProps(state, "firstName")}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={e.lastName}>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="off"
              defaultValue={val("lastName", staff?.lastName)}
              {...errorProps(state, "lastName")}
            />
          </Field>
          <Field
            label="Email address"
            htmlFor="email"
            hint="Optional. Needed to invite them to the staff portal."
            error={e.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              defaultValue={val("email", staff?.email)}
              {...errorProps(state, "email")}
            />
          </Field>
          <Field label="Phone number" htmlFor="phone" hint="Optional." error={e.phone}>
            <PhoneInput
              defaultCountry={v.phoneCountry ?? "NG"}
              defaultValue={val("phone", staff?.phone)}
              invalid={Boolean(e.phone)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Job" description="What they do, where they work and who they report to.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Job title"
            htmlFor="jobTitle"
            hint="For example Cashier, Head Chef or Driver."
            error={e.jobTitle}
          >
            <Input
              id="jobTitle"
              name="jobTitle"
              list="job-title-suggestions"
              autoComplete="off"
              defaultValue={val("jobTitle", staff?.jobTitle)}
              {...errorProps(state, "jobTitle")}
            />
            <datalist id="job-title-suggestions">
              {jobTitles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Employment type" htmlFor="employmentType" error={e.employmentType}>
            <NativeSelect
              id="employmentType"
              name="employmentType"
              defaultValue={val("employmentType", staff?.employmentType ?? "full_time")}
            >
              {Object.entries(EMPLOYMENT_TYPES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Branch"
            htmlFor="branchId"
            hint={branches.length ? undefined : "Add branches in Settings."}
          >
            <NativeSelect
              id="branchId"
              name="branchId"
              defaultValue={val("branchId", staff?.branchId)}
            >
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Reports to" htmlFor="reportsTo" error={e.reportsTo}>
            <NativeSelect
              id="reportsTo"
              name="reportsTo"
              defaultValue={val("reportsTo", staff?.reportsTo)}
            >
              <option value="">No one</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                  {m.job_title ? ` · ${m.job_title}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Start date" htmlFor="startDate" hint="Optional." error={e.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={val("startDate", staff?.startDate)}
              {...errorProps(state, "startDate")}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {staff ? "Save changes" : "Add staff member"}
        </SubmitButton>
      </div>
    </form>
  );
}
