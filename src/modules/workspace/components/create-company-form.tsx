"use client";

import { useActionState, useState } from "react";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton, errorProps } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { COUNTRIES, CURRENCIES, INDUSTRIES, SIZE_BANDS, TIMEZONES } from "../constants";
import { createCompany } from "../server/actions";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function CreateCompanyForm({ rootDomain }: { rootDomain: string }) {
  const [state, action] = useActionState(createCompany, initialFormState);
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(state.values?.slug));
  const [country, setCountry] = useState(state.values?.countryCode ?? "NG");
  const preset = COUNTRIES.find((c) => c.code === country);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Company name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          {...errorProps(state, "name")}
        />
      </Field>
      <Field
        label="Workspace address"
        htmlFor="slug"
        hint={`Your workspace link: ${rootDomain}/w/${slug || "your-company"}`}
        error={state.fieldErrors?.slug}
      >
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase());
          }}
          {...errorProps(state, "slug")}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country" htmlFor="countryCode" error={state.fieldErrors?.countryCode}>
          <NativeSelect
            id="countryCode"
            name="countryCode"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Currency" htmlFor="currency" error={state.fieldErrors?.currency}>
          <NativeSelect
            id="currency"
            name="currency"
            key={`cur-${country}`}
            defaultValue={state.values?.currency ?? preset?.currency ?? "NGN"}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Time zone" htmlFor="timezone" error={state.fieldErrors?.timezone}>
          <NativeSelect
            id="timezone"
            name="timezone"
            key={`tz-${country}`}
            defaultValue={state.values?.timezone ?? preset?.timezone ?? "Africa/Lagos"}
          >
            {TIMEZONES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Company size" htmlFor="sizeBand" error={state.fieldErrors?.sizeBand}>
          <NativeSelect id="sizeBand" name="sizeBand" defaultValue={state.values?.sizeBand ?? ""}>
            <option value="">Choose…</option>
            {SIZE_BANDS.map((s) => (
              <option key={s} value={s}>
                {s} staff
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Industry"
          htmlFor="industry"
          error={state.fieldErrors?.industry}
          className="sm:col-span-2"
        >
          <NativeSelect id="industry" name="industry" defaultValue={state.values?.industry ?? ""}>
            <option value="">Choose…</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <SubmitButton pendingLabel="Creating workspace…">Create workspace</SubmitButton>
    </form>
  );
}
