import "server-only";
import type { z } from "zod";
import { refresh } from "next/cache";
import { getTenant, type TenantContext } from "@/lib/tenancy";
import { can, type Permission } from "@/lib/permissions";
import { EntitlementError } from "@/lib/entitlements";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { echoValues, errorState, fieldErrorsFrom, type FormState } from "@/lib/forms";
import { userMessageFor } from "@/lib/errors";

type ActionArgs<S extends z.ZodType> = {
  formData: FormData;
  /** Required permission, checked before anything else. */
  permission?: Permission;
  schema: S;
  run: (input: {
    ctx: TenantContext;
    data: z.infer<S>;
    supabase: ServerSupabase;
  }) => Promise<FormState | void>;
  /** Shown when run() completes without returning a state. */
  successMessage?: string;
};

/** A database error to surface to the user (already mapped by userMessageFor). */
export class ActionError extends Error {}

/**
 * Standard pipeline for a Server Action inside a workspace:
 *  1. resolve the workspace from the slug in the form + the user's session
 *     (never from a company id sent by the browser),
 *  2. check the permission (the database checks again via RLS),
 *  3. validate input with zod,
 *  4. run the mutation with the user's own Supabase client (RLS applies),
 *  5. refresh the page and return a user-facing result.
 */
export async function workspaceAction<S extends z.ZodType>({
  formData,
  permission,
  schema,
  run,
  successMessage = "Saved.",
}: ActionArgs<S>): Promise<FormState> {
  const values = echoValues(formData);
  const slug = String(formData.get("slug") ?? "");
  const ctx = await getTenant(slug);
  if (!ctx) return errorState("This workspace isn't available.", { values });
  if (permission && !can(ctx, permission)) {
    return errorState("You don't have permission to do that.", { values });
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }

  try {
    const supabase = await createClient();
    const result = await run({ ctx, data: parsed.data, supabase });
    refresh();
    return result ?? { status: "success", message: successMessage };
  } catch (err) {
    if (err instanceof EntitlementError || err instanceof ActionError) {
      return errorState(err.message, { values });
    }
    throw err;
  }
}

/** Throw a user-facing ActionError for a Supabase error (logs the raw one). */
export function check(error: { code?: string; message?: string } | null, context: string): void {
  if (!error) return;
  const message = userMessageFor(error);
  if (message === userMessageFor(null)) {
    console.error(`[action] ${context} failed`, { code: error.code, message: error.message });
  }
  throw new ActionError(message);
}
