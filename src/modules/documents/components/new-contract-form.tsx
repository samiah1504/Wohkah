"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FileTextIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { CONTRACT_KIND, type ContractKind } from "@/lib/copy/documents";
import { cn } from "@/lib/utils";
import { createContract } from "../server/actions";

type Choice = {
  value: string;
  name: string;
  summary: string;
  kind: ContractKind;
  starter: boolean;
};

export function NewContractForm({
  slug,
  staff,
  defaultStaff,
  templates,
  starters,
  cancelHref,
}: {
  slug: string;
  staff: { id: string; full_name: string; job_title: string | null }[];
  defaultStaff?: string;
  templates: { id: string; name: string; kind: ContractKind }[];
  starters: { key: string; name: string; summary: string; kind: ContractKind }[];
  cancelHref: string;
}) {
  const [state, action] = useActionState(createContract, initialFormState);
  const choices: Choice[] = [
    ...templates.map((t) => ({
      value: `t:${t.id}`,
      name: t.name,
      summary: CONTRACT_KIND[t.kind].label,
      kind: t.kind,
      starter: false,
    })),
    ...starters.map((s) => ({
      value: `s:${s.key}`,
      name: s.name,
      summary: s.summary,
      kind: s.kind,
      starter: true,
    })),
  ];
  const [choice, setChoice] = useState(choices[0]?.value ?? "");
  const selected = choices.find((c) => c.value === choice);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <input
        type="hidden"
        name="templateId"
        value={choice.startsWith("t:") ? choice.slice(2) : ""}
      />
      <input type="hidden" name="starter" value={choice.startsWith("s:") ? choice.slice(2) : ""} />
      <input type="hidden" name="kind" value={selected?.kind ?? "contract"} />
      <FormMessage state={state} />
      <Field label="Staff member" htmlFor="employeeId">
        <NativeSelect id="employeeId" name="employeeId" defaultValue={defaultStaff ?? ""} required>
          <option value="" disabled>
            Choose a staff member
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.job_title ? ` · ${s.job_title}` : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Start from</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((c) => (
            <label
              key={c.value}
              className={cn(
                "bg-surface flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
                choice === c.value
                  ? "border-primary ring-primary/30 ring-2"
                  : "hover:border-taupe/50",
              )}
            >
              <input
                type="radio"
                name="choice"
                value={c.value}
                checked={choice === c.value}
                onChange={() => setChoice(c.value)}
                className="sr-only"
              />
              {c.starter ? (
                <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <FileTextIcon className="text-walnut mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block font-semibold">{c.name}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                  {c.starter ? `Starter template · ${c.summary}` : `Your template · ${c.summary}`}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-muted-foreground text-sm">
        The staff member&apos;s details are filled in for you. You can review and edit everything
        before sending.
      </p>
      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Preparing…">Prepare document</SubmitButton>
      </div>
    </form>
  );
}
