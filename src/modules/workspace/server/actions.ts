"use server";

import { redirect } from "next/navigation";
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
  departmentSchema,
  holidaySchema,
  idSchema,
  toAddress,
  workingDaysFrom,
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
  const { error } = await supabase.rpc("create_company", {
    p_name: d.name,
    p_slug: d.slug,
    p_country_code: d.countryCode,
    p_currency: d.currency,
    p_timezone: d.timezone,
    p_industry: d.industry ?? undefined,
    p_size_band: d.sizeBand ?? undefined,
  });
  if (error) {
    const message = userMessageFor(error, "We couldn't create the workspace. Please try again.");
    if (error.message.includes("slug_")) {
      return errorState("Choose a different workspace address.", {
        fieldErrors: { slug: message },
        values,
      });
    }
    if (!/slug_|too_many|email_not/.test(error.message)) {
      console.error("[workspace] create_company failed", { code: error.code });
    }
    return errorState(message, { values });
  }
  redirect(`/w/${d.slug}?welcome=1`);
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
// Departments
// ---------------------------------------------------------------------------
export async function saveDepartment(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "departments.manage",
    schema: departmentSchema,
    successMessage: "Department saved.",
    run: async ({ ctx, data, supabase }) => {
      const fields = {
        name: data.name,
        description: data.description,
        parent_id: data.parentId ?? null,
      };
      const { error } = data.id
        ? await supabase
            .from("departments")
            .update(fields)
            .eq("id", data.id)
            .eq("company_id", ctx.company.id)
        : await supabase.from("departments").insert({ ...fields, company_id: ctx.company.id });
      check(error, "save department");
    },
  });
}

export async function setDepartmentArchived(_prev: FormState, formData: FormData) {
  const archive = formData.get("archive") === "true";
  return workspaceAction({
    formData,
    permission: "departments.manage",
    schema: idSchema,
    successMessage: archive ? "Department archived." : "Department restored.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("departments")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "archive department");
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
