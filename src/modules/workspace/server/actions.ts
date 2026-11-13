"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hitRateLimit, RATE_LIMITS, rateLimitMessage } from "@/lib/rate-limit";
import { echoValues, errorState, fieldErrorsFrom, type FormState } from "@/lib/forms";
import { userMessageFor } from "@/lib/errors";
import { assertLimit } from "@/lib/entitlements";
import { check, workspaceAction } from "@/lib/tenancy/actions";
import {
  branchSchema,
  companyProfileSchema,
  createCompanySchema,
  holidaySchema,
  idSchema,
  toAddress,
  workingDaysFrom,
  addressFields,
} from "../schemas";

// ---------------------------------------------------------------------------
// Create a workspace
// ---------------------------------------------------------------------------
export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/onboarding");
  const values = echoValues(formData);
  const parsed = createCompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }
  const rl = await hitRateLimit(RATE_LIMITS.createCompanyByUser, user.id);
  if (!rl.allowed) return errorState(rateLimitMessage(rl.retryAfterSeconds), { values });

  const d = parsed.data;
  const supabase = await createClient();
  const { data: companyId, error } = await supabase.rpc("create_company", {
    p_name: d.name,
    p_slug: d.slug,
    p_country_code: d.countryCode,
    p_currency: d.currency,
    p_timezone: d.timezone,
    p_industry: d.industry ?? undefined,
    p_size_band: d.sizeBand ?? undefined,
  });
  if (error) {
    const message = userMessageFor(
      error,
      "We couldn't create your business account. Please try again.",
    );
    if (error.message.includes("slug_")) {
      return errorState("Choose a different web address.", {
        fieldErrors: { slug: message },
        values,
      });
    }
    if (!/slug_|too_many|email_not/.test(error.message)) {
      console.error("[workspace] create_company failed", { code: error.code });
    }
    return errorState(message, { values });
  }
  if (d.startPlan === "free") redirect(`/w/${d.slug}?welcome=1`);

  // The trial is checked again in the database (one per workspace, one per
  // owner every 12 months). If it isn't available the workspace stays on Free.
  const { error: trialError } = await supabase.rpc("start_trial", {
    p_company: companyId,
    p_plan_code: d.startPlan,
  });
  if (trialError && !trialError.message.startsWith("trial_not_eligible")) {
    console.error("[workspace] start_trial after create failed", { code: trialError.code });
  }
  redirect(`/w/${d.slug}?welcome=1&trial=${trialError ? "unavailable" : "started"}`);
}

// ---------------------------------------------------------------------------
// Company profile and working calendar
// ---------------------------------------------------------------------------
export async function updateCompanyProfile(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "company.settings.manage",
    schema: companyProfileSchema,
    successMessage: "Company profile saved.",
    run: async ({ ctx, data, supabase }) => {
      const workingDays = workingDaysFrom(formData);
      if (workingDays.length === 0) {
        return errorState("Choose at least one working day.", {
          fieldErrors: { workingDays: "Choose at least one working day." },
          values: echoValues(formData),
        });
      }
      const { error } = await supabase
        .from("companies")
        .update({
          name: data.name,
          legal_name: data.legalName,
          business_email: data.businessEmail,
          phone: data.phone,
          website: data.website,
          industry: data.industry ?? null,
          size_band: data.sizeBand ?? null,
          country_code: data.countryCode,
          currency: data.currency,
          timezone: data.timezone,
          working_days: workingDays,
          work_start: data.workStart,
          work_end: data.workEnd,
          address: toAddress(data),
        })
        .eq("id", ctx.company.id);
      check(error, "update company");
    },
  });
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
export async function saveBranch(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "branches.manage",
    schema: branchSchema,
    successMessage: "Branch saved.",
    run: async ({ ctx, data, supabase }) => {
      const fields = {
        name: data.name,
        code: data.code,
        phone: data.phone,
        is_headquarters: data.isHeadquarters,
        address: toAddress(data),
      };
      if (data.id) {
        const { error } = await supabase
          .from("branches")
          .update(fields)
          .eq("id", data.id)
          .eq("company_id", ctx.company.id);
        check(error, "update branch");
        return;
      }
      // Clear message before hitting the database limit (which also enforces it).
      const { count, error: countError } = await supabase
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.company.id)
        .is("archived_at", null);
      check(countError, "count branches");
      assertLimit(ctx, "branches", count ?? 0);
      const { error } = await supabase
        .from("branches")
        .insert({ ...fields, company_id: ctx.company.id });
      check(error, "create branch");
    },
  });
}

export async function setBranchArchived(_prev: FormState, formData: FormData) {
  const archive = formData.get("archive") === "true";
  return workspaceAction({
    formData,
    permission: "branches.manage",
    schema: idSchema,
    successMessage: archive ? "Branch archived." : "Branch restored.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("branches")
        .update({
          archived_at: archive ? new Date().toISOString() : null,
          ...(archive ? { is_headquarters: false } : {}),
        })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "archive branch");
    },
  });
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------
export async function addHoliday(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "holidays.manage",
    schema: holidaySchema,
    successMessage: "Holiday added.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase.from("public_holidays").insert({
        company_id: ctx.company.id,
        holiday_date: data.holidayDate,
        name: data.name,
        branch_id: data.branchId ?? null,
      });
      check(error, "add holiday");
    },
  });
}

export async function deleteHoliday(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "holidays.manage",
    schema: idSchema,
    successMessage: "Holiday removed.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("public_holidays")
        .delete()
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "delete holiday");
    },
  });
}

// ---------------------------------------------------------------------------
// Work locations (approved places for attendance)
// ---------------------------------------------------------------------------
const workLocationSchema = z.object({
  id: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Enter a name.").max(100, "That name is too long."),
  branchId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  ...addressFields,
});

export async function saveWorkLocation(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "work_locations.manage",
    schema: workLocationSchema,
    successMessage: "Work location saved.",
    run: async ({ ctx, data, supabase }) => {
      const fields = {
        name: data.name,
        branch_id: data.branchId ?? null,
        address: toAddress(data),
      };
      const { error } = data.id
        ? await supabase
            .from("work_locations")
            .update(fields)
            .eq("id", data.id)
            .eq("company_id", ctx.company.id)
        : await supabase.from("work_locations").insert({ ...fields, company_id: ctx.company.id });
      check(error, "save work location");
    },
  });
}

export async function setWorkLocationArchived(_prev: FormState, formData: FormData) {
  const archive = formData.get("archive") === "true";
  return workspaceAction({
    formData,
    permission: "work_locations.manage",
    schema: idSchema,
    successMessage: archive ? "Work location archived." : "Work location restored.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("work_locations")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "archive work location");
    },
  });
}
