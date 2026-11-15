"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps, useSuccessToast } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { findBlanks, isAutoField } from "@/lib/contracts/document";
import { CONTRACT_KIND } from "@/lib/copy/documents";
import {
  assignJobDescription,
  saveDraft,
  saveJobDescription,
  saveTemplate,
} from "../server/actions";
import { DocumentEditor } from "./document-editor";

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------
export function TemplateForm({
  slug,
  template,
  cancelHref,
}: {
  slug: string;
  template: {
    id?: string;
    name: string;
    kind: "contract" | "policy";
    body: string;
    starterKey?: string | null;
  };
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveTemplate, initialFormState);
  const v = state.values ?? {};
  const [kind, setKind] = useState(v.kind ?? template.kind);
  return (
    <form action={action} noValidate className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={template.id ?? ""} />
      <input type="hidden" name="starterKey" value={template.starterKey ?? ""} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Template name" htmlFor="name" error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={v.name ?? template.name}
            {...errorProps(state, "name")}
          />
        </Field>
        {template.id ? (
          <input type="hidden" name="kind" value={template.kind} />
        ) : (
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Type</legend>
            <div className="bg-subtle inline-flex rounded-lg p-1">
              {(["contract", "policy"] as const).map((k) => (
                <label
                  key={k}
                  className="has-[:checked]:bg-surface has-[:checked]:text-walnut text-muted-foreground cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold has-[:checked]:shadow-xs"
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="sr-only"
                  />
                  {CONTRACT_KIND[k].label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <p className="text-muted-foreground -mt-3 text-sm">
        {CONTRACT_KIND[kind as "contract" | "policy"].help}
      </p>
      <DocumentEditor
        name="body"
        label="Template text"
        defaultValue={v.body ?? template.body}
        invalid={Boolean(state.fieldErrors?.body)}
      />
      {state.fieldErrors?.body ? (
        <p className="text-destructive -mt-4 text-sm font-medium">{state.fieldErrors.body}</p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">Save template</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Draft contract
// ---------------------------------------------------------------------------
export function DraftForm({
  slug,
  contract,
}: {
  slug: string;
  contract: { id: string; title: string; body: string };
}) {
  const [state, action] = useActionState(saveDraft, initialFormState);
  useSuccessToast(state);
  const blanks = useMemo(
    () => findBlanks(`${contract.title}\n${contract.body}`),
    [contract.title, contract.body],
  );
  return (
    <form action={action} noValidate className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={contract.id} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      {blanks.length ? (
        <section
          className="border-primary/40 bg-sand/50 rounded-xl border p-4 sm:p-5"
          aria-labelledby="blanks-heading"
        >
          <h2 id="blanks-heading" className="text-walnut font-semibold">
            Fill in the blanks ({blanks.length})
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            These are highlighted in the document. Fill them in here, or edit the text directly.
            Everything must be filled in before you send it.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {blanks.map((b) => (
              <Field
                key={b}
                label={b}
                htmlFor={`blank-${b}`}
                hint={isAutoField(b) ? "Not on the staff record yet." : undefined}
              >
                <Input id={`blank-${b}`} name={`blank:${b}`} autoComplete="off" />
              </Field>
            ))}
          </div>
        </section>
      ) : null}
      <Field label="Title" htmlFor="title" error={state.fieldErrors?.title}>
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title ?? contract.title}
          {...errorProps(state, "title")}
        />
      </Field>
      <DocumentEditor
        name="body"
        label="Document"
        defaultValue={state.values?.body ?? contract.body}
      />
      <div className="flex justify-end border-t pt-5">
        <SubmitButton variant="outline" pendingLabel="Saving…">
          Save draft
        </SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Job description
// ---------------------------------------------------------------------------
export function JobDescriptionForm({
  slug,
  jd,
  cancelHref,
}: {
  slug: string;
  jd: { id?: string; title: string; body: string; staffCount?: number };
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveJobDescription, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={jd.id ?? ""} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <Field
        label="Job title"
        htmlFor="title"
        hint="For example Cashier, Head Chef or Driver."
        error={state.fieldErrors?.title}
      >
        <Input
          id="title"
          name="title"
          defaultValue={v.title ?? jd.title}
          {...errorProps(state, "title")}
        />
      </Field>
      <DocumentEditor
        name="body"
        label="Job description"
        defaultValue={v.body ?? jd.body}
        fields={false}
        minRows={18}
        invalid={Boolean(state.fieldErrors?.body)}
      />
      {state.fieldErrors?.body ? (
        <p className="text-destructive -mt-4 text-sm font-medium">{state.fieldErrors.body}</p>
      ) : null}
      {jd.id ? (
        <Field
          label="What changed? (optional)"
          htmlFor="changeNote"
          hint={
            jd.staffCount
              ? `Saving a change publishes a new version. The ${jd.staffCount === 1 ? "staff member" : `${jd.staffCount} staff`} with this job description are asked to read and confirm it.`
              : "Saving a change publishes a new version."
          }
        >
          <Textarea
            id="changeNote"
            name="changeNote"
            rows={2}
            maxLength={300}
            defaultValue={v.changeNote}
          />
        </Field>
      ) : null}
      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {jd.id ? "Save and publish" : "Save job description"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AssignStaffForm({
  slug,
  id,
  staff,
}: {
  slug: string;
  id: string;
  staff: {
    id: string;
    full_name: string;
    job_title: string | null;
    job_description_id: string | null;
  }[];
}) {
  const [state, action] = useActionState(assignJobDescription, initialFormState);
  useSuccessToast(state);
  const [q, setQ] = useState("");
  const shown = staff.filter((s) =>
    `${s.full_name} ${s.job_title ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      {staff.length > 8 ? (
        <div className="relative">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find staff"
            aria-label="Find staff"
            className="pl-9"
          />
        </div>
      ) : null}
      <fieldset className="max-h-80 overflow-y-auto rounded-lg border">
        <legend className="sr-only">Staff with this job description</legend>
        {staff.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">No staff yet.</p>
        ) : null}
        <ul className="divide-y">
          {staff.map((s) => (
            <li key={s.id} className={shown.includes(s) ? undefined : "hidden"}>
              <label className="hover:bg-subtle/60 flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  name="staff"
                  value={s.id}
                  defaultChecked={s.job_description_id === id}
                  className="size-4 accent-[var(--brand-yellow)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.full_name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {s.job_title ?? "No job title"}
                    {s.job_description_id && s.job_description_id !== id
                      ? " · has another job description"
                      : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <SubmitButton variant="outline" pendingLabel="Saving…">
          Save staff
        </SubmitButton>
      </div>
    </form>
  );
}
