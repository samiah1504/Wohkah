"use server";

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

/** Keep the chosen staff active; pause the rest because of the plan limit. */
export async function selectActiveStaff(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({
      forPlan: z
        .enum(["free", "starter", "growth", "business"])
        .optional()
        .or(z.literal("").transform(() => undefined)),
    }),
    run: async ({ ctx, data, supabase }) => {
      const { data: paused, error } = await supabase.rpc("select_active_staff", {
        p_company: ctx.company.id,
        p_keep: uuids(formData, "keep"),
        p_for_plan_code: data.forPlan,
      });
      check(error, "select staff");
      return {
        status: "success",
        message: paused
          ? `${paused} staff member${paused === 1 ? " is" : "s are"} now paused. Their records are kept and they can be reactivated after upgrading.`
          : "No changes were needed.",
      };
    },
  });
}

export async function reactivateStaff(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({}),
    run: async ({ ctx, supabase }) => {
      const { data: n, error } = await supabase.rpc("reactivate_staff", {
        p_company: ctx.company.id,
        p_ids: uuids(formData, "ids"),
      });
      check(error, "reactivate staff");
      return {
        status: "success",
        message: n
          ? `${n} staff member${n === 1 ? "" : "s"} reactivated.`
          : "Nothing to reactivate.",
      };
    },
  });
}
