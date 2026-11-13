"use client";

import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { ActionDialog } from "@/components/action-forms";
import { FormMessage, SubmitButton, errorProps, useSuccessToast } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/forms";
import { addStaff, reactivateStaff, selectActiveStaff } from "../server/actions";

export function AddStaffDialog({
  slug,
  disabledReason,
}: {
  slug: string;
  disabledReason?: string;
}) {
  return (
    <ActionDialog
      title="Add a staff member"
      description="They count as active staff on your subscription."
      action={addStaff}
      hidden={{ slug }}
      submitLabel="Add staff"
      trigger={
        <Button disabled={Boolean(disabledReason)} title={disabledReason}>
          <PlusIcon /> Add staff
        </Button>
      }
    >
      {(state) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="staff-name"
            error={state.fieldErrors?.fullName}
            className="sm:col-span-2"
          >
            <Input
              id="staff-name"
              name="fullName"
              defaultValue={state.values?.fullName ?? ""}
              autoFocus
              {...errorProps(state, "fullName")}
            />
          </Field>
          <Field
            label="Job title"
            htmlFor="staff-title"
            hint="Optional"
            error={state.fieldErrors?.jobTitle}
          >
            <Input id="staff-title" name="jobTitle" defaultValue={state.values?.jobTitle ?? ""} />
          </Field>
          <Field
            label="Phone"
            htmlFor="staff-phone"
            hint="Optional"
            error={state.fieldErrors?.phone}
          >
            <Input
              id="staff-phone"
              name="phone"
              type="tel"
              defaultValue={state.values?.phone ?? ""}
            />
          </Field>
          <Field
            label="Email"
            htmlFor="staff-email"
            hint="Optional"
            error={state.fieldErrors?.email}
            className="sm:col-span-2"
          >
            <Input
              id="staff-email"
              name="email"
              type="email"
              defaultValue={state.values?.email ?? ""}
              {...errorProps(state, "email")}
            />
          </Field>
        </div>
      )}
    </ActionDialog>
  );
}

type Person = { id: string; full_name: string; job_title: string | null };

/**
 * The owner chooses who stays active when there are more active staff than
 * the plan covers. Everyone else is paused (records kept, reactivatable).
 */
export function SelectActiveStaffForm({
  slug,
  people,
  allowance,
  forPlan,
  forPlanName,
}: {
  slug: string;
  people: Person[];
  allowance: number;
  forPlan?: string;
  forPlanName?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(selectActiveStaff, initialFormState);
  useSuccessToast(state);
  const [keep, setKeep] = useState<Set<string>>(
    () => new Set(people.slice(0, allowance).map((p) => p.id)),
  );
  const over = keep.size > allowance;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="forPlan" value={forPlan ?? ""} />
      <p className="text-sm">
        Choose up to <strong>{allowance}</strong> staff to keep active
        {forPlanName ? ` on the ${forPlanName} plan` : ""}. The others will be paused: they
        can&apos;t clock in, use the staff portal or receive assignments, but their records stay and
        you can reactivate them after upgrading or adding staff places.
      </p>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Staff to keep active</legend>
        {people.map((p) => (
          <label
            key={p.id}
            className="bg-surface flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <input
              type="checkbox"
              name="keep"
              value={p.id}
              checked={keep.has(p.id)}
              onChange={(e) =>
                setKeep((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(p.id);
                  else next.delete(p.id);
                  return next;
                })
              }
              className="accent-[var(--brand-yellow)]"
            />
            <span>
              <span className="font-medium">{p.full_name}</span>
              {p.job_title ? (
                <span className="text-muted-foreground block text-xs">{p.job_title}</span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>
      <p
        className={over ? "text-destructive text-sm font-medium" : "text-muted-foreground text-sm"}
        aria-live="polite"
      >
        {keep.size} of {allowance} selected. {people.length - keep.size} will be paused.
      </p>
      <FormMessage state={state} />
      <div>
        <SubmitButton disabled={over} pendingLabel="Saving…">
          Keep selected staff active
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReactivateStaffForm({
  slug,
  people,
  capacity,
}: {
  slug: string;
  people: Person[];
  capacity: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(reactivateStaff, initialFormState);
  useSuccessToast(state);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const over = chosen.size > capacity;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <ul className="grid gap-2">
        {people.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="ids"
                value={p.id}
                checked={chosen.has(p.id)}
                disabled={capacity === 0}
                onChange={(e) =>
                  setChosen((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(p.id);
                    else next.delete(p.id);
                    return next;
                  })
                }
                className="accent-[var(--brand-yellow)]"
              />
              <span className="font-medium">{p.full_name}</span>
              {p.job_title ? (
                <span className="text-muted-foreground text-xs">{p.job_title}</span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {capacity === 0
          ? "There are no free staff places on your subscription. Upgrade or add staff places to reactivate."
          : `You can reactivate up to ${capacity}.`}
      </p>
      <FormMessage state={state} />
      {capacity > 0 ? (
        <div>
          <SubmitButton
            disabled={over || chosen.size === 0}
            variant="outline"
            pendingLabel="Reactivating…"
          >
            Reactivate selected
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
