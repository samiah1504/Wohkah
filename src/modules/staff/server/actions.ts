"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { check, workspaceAction } from "@/lib/tenancy/actions";
import type { FormState } from "@/lib/forms";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That's too long.")
    .optional()
    .transform((v) => (v ? v : null));

const staffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the staff member's full name.")
    .max(120, "That name is too long."),
  jobTitle: optional(100),
  phone: z
    .string()
    .trim()
    .max(32, "That phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, +, - and brackets only.")
    .optional()
    .transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Enter a valid email address.").nullable()),
});

export async function addStaff(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: staffSchema,
    successMessage: "Staff member added.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase.from("employees").insert({
        company_id: ctx.company.id,
        full_name: data.fullName,
        job_title: data.jobTitle,
        phone: data.phone,
        email: data.email,
      });
      check(error, "add staff");
    },
  });
}

/** Ordinary employment status changes (not the subscription pause). */
export async function setStaffStatus(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({ id: z.uuid(), status: z.enum(["active", "resigned", "archived"]) }),
    successMessage: "Staff status updated.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: data.status })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "update staff status");
    },
  });
}

const uuids = (formData: FormData, name: string) =>
  [...new Set(formData.getAll(name).map(String))].filter((v) => z.uuid().safeParse(v).success);

const staffPage = (formData: FormData, query: string) =>
  `/w/${encodeURIComponent(String(formData.get("slug") ?? ""))}/staff?${query}`;

/**
 * Keep the chosen staff active; pause the rest because of the plan limit.
 * Redirects on success because the selection form disappears once it's done.
 */
export async function selectActiveStaff(_prev: FormState, formData: FormData) {
  let paused = 0;
  const result = await workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({
      forPlan: z
        .enum(["free", "starter", "growth", "business"])
        .optional()
        .or(z.literal("").transform(() => undefined)),
    }),
    run: async ({ ctx, data, supabase }) => {
      const { data: n, error } = await supabase.rpc("select_active_staff", {
        p_company: ctx.company.id,
        p_keep: uuids(formData, "keep"),
        p_for_plan_code: data.forPlan,
      });
      check(error, "select staff");
      paused = n ?? 0;
    },
  });
  if (result.status === "success") redirect(staffPage(formData, `paused=${paused}`));
  return result;
}

export async function reactivateStaff(_prev: FormState, formData: FormData) {
  let count = 0;
  const result = await workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({}),
    run: async ({ ctx, supabase }) => {
      const { data: n, error } = await supabase.rpc("reactivate_staff", {
        p_company: ctx.company.id,
        p_ids: uuids(formData, "ids"),
      });
      check(error, "reactivate staff");
      count = n ?? 0;
    },
  });
  if (result.status === "success") redirect(staffPage(formData, `reactivated=${count}`));
  return result;
}
