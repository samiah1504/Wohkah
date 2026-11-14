"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, check, workspaceAction } from "@/lib/tenancy/actions";
import { getTenant } from "@/lib/tenancy";
import { can } from "@/lib/permissions";
import { userMessageFor } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";
import { createInvitation } from "@/modules/access";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_BYTES,
  documentSchema,
  privateSchema,
  staffSchema,
  statusSchema,
} from "../schemas";

const BUCKET = "staff-documents";

const profilePath = (formData: FormData, id: string, query = "") =>
  `/w/${encodeURIComponent(String(formData.get("slug") ?? ""))}/staff/${id}${query ? `?${query}` : ""}`;

// ---------------------------------------------------------------------------
// Add or edit a staff member
// ---------------------------------------------------------------------------
export async function saveStaff(_prev: FormState, formData: FormData) {
  let savedId: string | null = null;
  let created = false;
  const result = await workspaceAction({
    formData,
    permission: "staff.manage",
    schema: staffSchema,
    run: async ({ ctx, data, supabase }) => {
      const fields = {
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`.slice(0, 120),
        email: data.email,
        phone: data.phone,
        job_title: data.jobTitle,
        employment_type: data.employmentType,
        start_date: data.startDate,
        branch_id: data.branchId,
        reports_to: data.reportsTo,
      };
      if (data.id) {
        const { error } = await supabase
          .from("employees")
          .update(fields)
          .eq("id", data.id)
          .eq("company_id", ctx.company.id);
        check(error, "update staff");
        savedId = data.id;
      } else {
        const { data: row, error } = await supabase
          .from("employees")
          .insert({ ...fields, company_id: ctx.company.id })
          .select("id")
          .single();
        check(error, "add staff");
        savedId = row!.id;
        created = true;
      }
    },
  });
  if (result.status === "success" && savedId) {
    redirect(profilePath(formData, savedId, created ? "added=1" : "saved=1"));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Status (the database checks that the change is allowed)
// ---------------------------------------------------------------------------
export async function changeStaffStatus(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: statusSchema,
    successMessage: "Status updated.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: data.status })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "change staff status");
    },
  });
}

// ---------------------------------------------------------------------------
// Private details
// ---------------------------------------------------------------------------
export async function savePrivateDetails(_prev: FormState, formData: FormData) {
  const result = await workspaceAction({
    formData,
    permission: "staff.sensitive",
    schema: privateSchema,
    successMessage: "Private details saved.",
    run: async ({ ctx, data, supabase }) => {
      const address = Object.fromEntries(
        Object.entries({
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.city,
          state: data.state,
        }).filter(([, v]) => v),
      );
      const { error } = await supabase.from("employee_private").upsert(
        {
          employee_id: data.id,
          company_id: ctx.company.id,
          date_of_birth: data.dateOfBirth,
          gender: data.gender ?? null,
          home_address: address,
          emergency_name: data.emergencyName,
          emergency_phone: data.emergencyPhone,
          emergency_relationship: data.emergencyRelationship,
          kin_name: data.kinName,
          kin_phone: data.kinPhone,
          kin_relationship: data.kinRelationship,
          bank_name: data.bankName,
          bank_account_number: data.bankAccountNumber,
          bank_account_name: data.bankAccountName,
          tin: data.tin,
          pension_pin: data.pensionPin,
          pfa_name: data.pfaName,
        },
        { onConflict: "employee_id" },
      );
      check(error, "save private details");
    },
  });
  if (result.status === "success") {
    redirect(profilePath(formData, String(formData.get("id")), "tab=private&saved=1"));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Documents: the browser uploads straight to private storage through a
// short-lived signed link; the database row is created afterwards from the
// stored file's real size and type.
// ---------------------------------------------------------------------------
export async function prepareDocumentUpload(input: {
  slug: string;
  employeeId: string;
  fileName: string;
  size: number;
  type: string;
}): Promise<{ ok: true; path: string; url: string } | { ok: false; message: string }> {
  const ctx = await getTenant(input.slug);
  if (!ctx || !can(ctx, "staff.manage") || !can(ctx, "staff.sensitive")) {
    return { ok: false, message: "You don't have access to add documents." };
  }
  if (!z.uuid().safeParse(input.employeeId).success)
    return { ok: false, message: "Unknown staff member." };
  if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(input.type)) {
    return { ok: false, message: "Upload a PDF, Word document or photo (JPG, PNG or WebP)." };
  }
  if (input.size <= 0 || input.size > MAX_FILE_BYTES) {
    return { ok: false, message: "Files can be up to 10 MB." };
  }
  const safe =
    input.fileName
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "document";
  const path = `${ctx.company.id}/${input.employeeId}/${randomUUID()}-${safe}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[staff] signed upload failed", { message: error?.message });
    return { ok: false, message: "We couldn't prepare the upload. Please try again." };
  }
  return { ok: true, path, url: data.signedUrl };
}

export async function saveDocument(_prev: FormState, formData: FormData) {
  let employeeId = "";
  const result = await workspaceAction({
    formData,
    permission: "staff.manage",
    schema: documentSchema,
    run: async ({ ctx, data, supabase }) => {
      employeeId = data.employeeId;
      if (!data.path.startsWith(`${ctx.company.id}/${data.employeeId}/`)) {
        throw new ActionError("That upload doesn't belong to this staff member.");
      }
      const folder = data.path.slice(0, data.path.lastIndexOf("/"));
      const file = data.path.slice(data.path.lastIndexOf("/") + 1);
      const { data: found, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(folder, { search: file, limit: 1 });
      const object = found?.find((o) => o.name === file);
      if (listError || !object)
        throw new ActionError("We couldn't find the uploaded file. Please try again.");
      const meta = (object.metadata ?? {}) as { size?: number; mimetype?: string };
      const { error } = await supabase.from("employee_documents").insert({
        company_id: ctx.company.id,
        employee_id: data.employeeId,
        category: data.category,
        name: data.name,
        storage_path: data.path,
        size_bytes: Number(meta.size ?? 0) || 1,
        content_type: meta.mimetype ?? null,
      });
      if (error && /storage_limit_exceeded/.test(error.message)) {
        throw new ActionError(userMessageFor(error));
      }
      check(error, "save document");
      return { status: "success", message: "Document added." };
    },
  });
  if (result.status === "success" && employeeId) {
    redirect(profilePath(formData, employeeId, "tab=documents"));
  }
  return result;
}

export async function setDocumentArchived(_prev: FormState, formData: FormData) {
  const archive = formData.get("archive") === "true";
  return workspaceAction({
    formData,
    permission: "staff.manage",
    schema: z.object({ id: z.uuid() }),
    successMessage: archive ? "Document archived." : "Document restored.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("employee_documents")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", data.id)
        .eq("company_id", ctx.company.id);
      check(error, "archive document");
    },
  });
}

// ---------------------------------------------------------------------------
// Staff portal invitation (links the new sign-in to this record)
// ---------------------------------------------------------------------------
export type PortalInviteState = FormState & { inviteLink?: string };

export async function inviteToPortal(
  _prev: PortalInviteState,
  formData: FormData,
): Promise<PortalInviteState> {
  let inviteLink: string | undefined;
  const result = await workspaceAction({
    formData,
    permission: "members.invite",
    schema: z.object({ id: z.uuid() }),
    run: async ({ ctx, data, supabase }) => {
      const { data: staff, error } = await supabase
        .from("employees")
        .select("email, member_id")
        .eq("company_id", ctx.company.id)
        .eq("id", data.id)
        .single();
      check(error, "load staff");
      if (staff!.member_id)
        throw new ActionError("They already have a sign-in for the staff portal.");
      if (!staff!.email)
        throw new ActionError("Add their email address first; the invitation is sent there.");
      const out = await createInvitation({
        ctx,
        supabase,
        email: staff!.email,
        roleIds: [],
        employeeId: data.id,
      });
      inviteLink = out.link;
      return { status: "success", message: out.message };
    },
  });
  return { ...result, inviteLink };
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
