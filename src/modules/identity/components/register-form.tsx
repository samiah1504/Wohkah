"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { PhoneInput } from "@/components/phone-input";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/forms";
import { toE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { register } from "../server/actions";
import { ACQUISITION_SOURCES } from "../schemas";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_RULES = [
  [(p: string) => p.length >= 10, "10+ characters"],
  [(p: string) => /[A-Z]/.test(p), "uppercase letter"],
  [(p: string) => /[a-z]/.test(p), "lowercase letter"],
  [(p: string) => /\d/.test(p), "number"],
  [(p: string) => /[^A-Za-z0-9]/.test(p), "symbol"],
] as const;

type Errors = Record<string, string>;

/** Checked in the browser first so a typo never clears the password. The server checks again. */
function check(form: FormData): Errors {
  const e: Errors = {};
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (!get("firstName")) e.firstName = "Enter your first name.";
  if (!get("lastName")) e.lastName = "Enter your last name.";
  if (!get("email")) e.email = "Enter your email address.";
  else if (!EMAIL.test(get("email"))) e.email = "Enter a valid email address.";
  if (!get("phone")) e.phone = "Enter your phone number.";
  else if (!toE164(get("phoneCountry"), get("phone")))
    e.phone = "Enter a valid phone number for the country you picked.";
  const pw = String(form.get("password") ?? "");
  if (!pw) e.password = "Choose a password.";
  else if (PASSWORD_RULES.some(([ok]) => !ok(pw)))
    e.password = "Your password needs everything listed below.";
  if (form.get("terms") !== "on")
    e.terms = "Please agree to the General Terms of Use and Privacy Policy to continue.";
  return e;
}

export function RegisterForm({ next, defaultEmail }: { next?: string; defaultEmail?: string }) {
  const [state, action] = useActionState<FormState, FormData>(register, initialFormState);
  const [clientErrors, setClientErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [source, setSource] = useState(state.values?.acquisitionSource ?? "");

  const errors: Errors = { ...(state.fieldErrors ?? {}), ...clientErrors };
  const v = state.values ?? {};
  const invalid = (name: string) =>
    errors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : { "aria-invalid": false as const };
  const clear = (name: string) =>
    setClientErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });

  return (
    <form
      action={action}
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        const found = check(new FormData(event.currentTarget));
        setClientErrors(found);
        if (Object.keys(found).length) {
          event.preventDefault();
          const first = event.currentTarget.querySelector<HTMLElement>(
            `[name="${Object.keys(found)[0]}"]`,
          );
          first?.focus();
        }
      }}
    >
      {state.status === "error" && !Object.keys(clientErrors).length ? (
        <FormMessage state={state} />
      ) : null}
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            defaultValue={v.firstName}
            onChange={() => clear("firstName")}
            {...invalid("firstName")}
          />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            defaultValue={v.lastName}
            onChange={() => clear("lastName")}
            {...invalid("lastName")}
          />
        </Field>
      </div>

      <Field label="Email address" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          defaultValue={v.email ?? defaultEmail}
          onChange={() => clear("email")}
          {...invalid("email")}
        />
      </Field>

      <Field label="Phone number" htmlFor="phone" error={errors.phone}>
        <PhoneInput
          defaultCountry={v.phoneCountry}
          defaultValue={v.phone}
          invalid={Boolean(errors.phone)}
          required
          onChange={() => clear("phone")}
        />
      </Field>

      <div className="grid gap-1.5">
        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clear("password");
              }}
              className="pr-11"
              {...invalid("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls="password"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-2"
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </Field>
        <ul
          className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs"
          aria-live="polite"
        >
          {PASSWORD_RULES.map(([ok, label]) => {
            const met = ok(password);
            return (
              <li key={label} className={cn("flex items-center gap-1", met && "text-success")}>
                <span aria-hidden>{met ? "✓" : "•"}</span>
                {label}
                <span className="sr-only">{met ? " (done)" : " (needed)"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <Field label="How did you hear about WOHKAH? (optional)" htmlFor="acquisitionSource">
        <NativeSelect
          id="acquisitionSource"
          name="acquisitionSource"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Choose one</option>
          {ACQUISITION_SOURCES.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {source === "other" ? (
        <Field
          label="Please tell us where"
          htmlFor="acquisitionOther"
          error={errors.acquisitionOther}
        >
          <Input
            id="acquisitionOther"
            name="acquisitionOther"
            maxLength={100}
            defaultValue={v.acquisitionOther}
          />
        </Field>
      ) : null}

      <div className="grid gap-3 pt-1">
        <div className="grid gap-1">
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="terms"
              required
              aria-describedby={errors.terms ? "terms-error" : undefined}
              aria-invalid={errors.terms ? true : undefined}
              onChange={() => clear("terms")}
              className="mt-0.5 size-4 shrink-0 accent-[var(--brand-yellow)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-walnut font-semibold underline">
                General Terms of Use
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="/privacy" target="_blank" className="text-walnut font-semibold underline">
                Privacy Policy
              </Link>{" "}
              of WOHKAH.
            </span>
          </label>
          {errors.terms ? (
            <p id="terms-error" role="alert" className="text-destructive pl-7 text-xs font-medium">
              {errors.terms}
            </p>
          ) : null}
        </div>
        <label className="text-muted-foreground flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="marketing"
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand-yellow)]"
          />
          <span>
            I&apos;d like to receive product updates, business tips and important announcements from
            WOHKAH.
          </span>
        </label>
      </div>

      <SubmitButton pendingLabel="Creating your account…" className="h-11 w-full text-base">
        Start my free trial
      </SubmitButton>
    </form>
  );
}
