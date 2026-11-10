import type { z } from "zod";

/**
 * Result returned by Server Actions to forms (useActionState).
 * `values` echoes non-secret input so the form keeps what the user typed.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** First error message per field from a zod error. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Plain-object view of FormData (strings only), dropping secret fields. */
export function echoValues(
  formData: FormData,
  omit: readonly string[] = ["password", "confirmPassword", "currentPassword", "code"],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !omit.includes(k) && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}

export function errorState(
  message: string,
  extra: Omit<FormState, "status" | "message"> = {},
): FormState {
  return { status: "error", message, ...extra };
}
