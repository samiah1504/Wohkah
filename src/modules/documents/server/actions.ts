"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, check, workspaceAction } from "@/lib/tenancy/actions";
import { getTenant } from "@/lib/tenancy";
import { assertFeature } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { requestMeta } from "@/lib/request-meta";
import { brandedEmail, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { fillBlanks, fillFields } from "@/lib/contracts/document";
import { CONSENT_VERSION, consentText } from "@/lib/contracts/consent";
import { starterTemplate } from "@/lib/contracts/starters";
import { createFinalDocument, sendSigningCode, verifyCodeAndSign } from "@/lib/signing";
import {
  cancelSchema,
  draftSchema,
  idSchema,
  jobDescriptionSchema,
  newContractSchema,
  signSchema,
  templateSchema,
} from "../schemas";
import { fieldValuesFor, getContract, signingPartyFor } from "./queries";

const base = (formData: FormData) =>
  `/w/${encodeURIComponent(String(formData.get("slug") ?? ""))}/documents`;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function saveTemplate(_prev: FormState, formData: FormData) {
  let id: string | null = null;
  const result = await workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: templateSchema,
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "digital_contracts");
      if (data.id) {
        const { error } = await supabase
          .from("contract_templates")
          .update({ name: data.name, body: data.body })
          .eq("company_id", ctx.company.id)
          .eq("id", data.id);
        check(error, "update template");
        id = data.id;
      } else {
        const { data: row, error } = await supabase
          .from("contract_templates")
          .insert({
            company_id: ctx.company.id,
            kind: data.kind,
            name: data.name,
            body: data.body,
            starter_key: data.starterKey,
          })
          .select("id")
          .single();
        check(error, "add template");
        id = row!.id;
      }
    },
  });
  if (result.status === "success" && id) redirect(`${base(formData)}/templates?saved=1`);
  return result;
}

export async function setTemplateArchived(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }),
    successMessage: "Template updated.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("contract_templates")
        .update({ archived_at: data.archived === "true" ? new Date().toISOString() : null })
        .eq("company_id", ctx.company.id)
        .eq("id", data.id);
      check(error, "archive template");
    },
  });
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

/** Start a draft for a staff member, from a template or a starter template. */
export async function createContract(_prev: FormState, formData: FormData) {
  let id: string | null = null;
  const result = await workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: newContractSchema.extend({ starter: z.string().max(40).optional() }),
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "digital_contracts");
      let title = data.title || "";
      let body = "";
      let kind = data.kind;
      let templateId: string | null = null;
      if (data.templateId) {
        const { data: t, error } = await supabase
          .from("contract_templates")
          .select("id, kind, name, body")
          .eq("company_id", ctx.company.id)
          .eq("id", data.templateId)
          .single();
        check(error, "load template");
        title ||= t!.name;
        body = t!.body;
        kind = t!.kind;
        templateId = t!.id;
      } else if (data.starter) {
        const s = starterTemplate(data.starter);
        if (!s) throw new ActionError("Choose a template.");
        title ||= s.name;
        body = s.body;
        kind = s.kind;
      } else if (data.amendsId) {
        const { data: prev, error } = await supabase
          .from("contracts")
          .select("title, body, kind")
          .eq("company_id", ctx.company.id)
          .eq("id", data.amendsId)
          .single();
        check(error, "load contract");
        title ||= `${prev!.title} (updated)`;
        body = prev!.body;
        kind = prev!.kind;
      } else {
        throw new ActionError("Choose a template.");
      }
      const values = await fieldValuesFor(ctx, data.employeeId);
      const { data: row, error } = await supabase
        .from("contracts")
        .insert({
          company_id: ctx.company.id,
          employee_id: data.employeeId,
          template_id: templateId,
          kind,
          title: fillFields(title, values).slice(0, 150),
          body: fillFields(body, values),
          amends_id: data.amendsId,
        })
        .select("id")
        .single();
      check(error, "create contract");
      id = row!.id;
    },
  });
  if (result.status === "success" && id) redirect(`${base(formData)}/contracts/${id}`);
  return result;
}

/** Save a draft. Answers to blanks arrive as blank:<label> fields. */
export async function saveDraft(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: draftSchema,
    successMessage: "Draft saved.",
    run: async ({ ctx, data, supabase }) => {
      const answers: Record<string, string> = {};
      for (const [k, v] of formData.entries()) {
        if (k.startsWith("blank:") && typeof v === "string" && v.trim())
          answers[k.slice(6)] = v.slice(0, 500);
      }
      const { error } = await supabase
        .from("contracts")
        .update({ title: fillBlanks(data.title, answers), body: fillBlanks(data.body, answers) })
        .eq("company_id", ctx.company.id)
        .eq("id", data.id);
      check(error, "save draft");
    },
  });
}

export async function sendContract(_prev: FormState, formData: FormData) {
  let sent = false;
  const result = await workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: idSchema,
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase.rpc("send_contract", { p_contract: data.id });
      check(error, "send contract");
      sent = true;
      // Tell the staff member, if they have a staff portal sign-in. Best effort.
      const c = await getContract(ctx, data.id);
      if (c?.employee?.member_id && c.employee.email) {
        const url = `${env.appUrl}/w/${ctx.company.slug}/sign/${c.id}`;
        const mail = brandedEmail({
          heading:
            c.kind === "contract"
              ? "A document is ready for you to sign"
              : "Please read and confirm",
          paragraphs: [
            `${ctx.company.name} has sent you “${c.title}”.`,
            c.kind === "contract"
              ? "Open it in your staff portal, read it, and sign it when you're ready."
              : "Open it in your staff portal, read it, and confirm you have read it.",
          ],
          cta: { label: "Open the document", url },
        });
        await sendEmail({
          to: c.employee.email,
          subject: `${ctx.company.name}: ${c.title}`,
          html: mail.html,
          text: mail.text,
          idempotencyKey: `contract-sent-${c.id}`,
        });
      }
    },
  });
  if (result.status === "success" && sent) {
    redirect(`${base(formData)}/contracts/${String(formData.get("id"))}?sent=1`);
  }
  return result;
}

export async function cancelContract(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: cancelSchema,
    successMessage: "Cancelled. Nobody can sign it now.",
    run: async ({ data, supabase }) => {
      const { error } = await supabase.rpc("cancel_contract", {
        p_contract: data.id,
        p_reason: data.reason ?? undefined,
      });
      check(error, "cancel contract");
    },
  });
}

/** Managers can ask again for the signed copy if storing it failed the first time. */
export async function retrySignedCopy(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "contracts.manage",
    schema: idSchema,
    successMessage: "Signed copy saved.",
    run: async ({ ctx, data }) => {
      const c = await getContract(ctx, data.id);
      if (!c || c.status !== "completed")
        throw new ActionError("This document isn't fully signed yet.");
      if (!(await createFinalDocument(c.id))) {
        throw new ActionError("We couldn't save the signed copy just now. Please try again.");
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Signing (staff member or someone signing for the business)
// ---------------------------------------------------------------------------
export async function requestSigningCode(input: {
  slug: string;
  id: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const ctx = await getTenant(input.slug);
  if (!ctx || !z.uuid().safeParse(input.id).success)
    return { ok: false, message: "Document not found." };
  const c = await getContract(ctx, input.id);
  if (!c) return { ok: false, message: "Document not found." };
  const { party, canSign } = signingPartyFor(ctx, c);
  if (!party || !canSign)
    return { ok: false, message: "This document isn't waiting for your signature." };
  const result = await sendSigningCode({
    contractId: c.id,
    companyId: ctx.company.id,
    userId: ctx.user.id,
    email: ctx.user.email,
    contractTitle: c.title,
    businessName: ctx.company.name,
    party,
  });
  return result.ok ? { ok: true, email: ctx.user.email } : result;
}

export async function signContract(_prev: FormState, formData: FormData) {
  let done: { id: string; completed: boolean } | null = null;
  const result = await workspaceAction({
    formData,
    schema: signSchema,
    run: async ({ ctx, data }) => {
      const c = await getContract(ctx, data.id);
      if (!c || !c.content_hash) throw new ActionError("Document not found.");
      const { party, canSign } = signingPartyFor(ctx, c);
      if (!party || !canSign)
        throw new ActionError("This document isn't waiting for your signature.");
      const meta = await requestMeta();
      const out = await verifyCodeAndSign({
        contractId: c.id,
        userId: ctx.user.id,
        code: data.code,
        party,
        signerName: data.signerName,
        markType: data.markType,
        mark: data.markType === "typed" ? data.signerName : data.drawn!,
        consentText: consentText(c.kind),
        consentVersion: CONSENT_VERSION,
        contentHash: c.content_hash,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      if (!out.ok) {
        return {
          status: "error" as const,
          message: out.message,
          fieldErrors: out.field ? { [out.field]: out.message } : undefined,
          values: { signerName: data.signerName, markType: data.markType },
        };
      }
      done = { id: c.id, completed: out.completed };
    },
  });
  if (result.status === "success" && done) {
    const d = done as { id: string; completed: boolean };
    redirect(`/w/${encodeURIComponent(String(formData.get("slug")))}/sign/${d.id}?signed=1`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Job descriptions
// ---------------------------------------------------------------------------
export async function saveJobDescription(_prev: FormState, formData: FormData) {
  let id: string | null = null;
  const result = await workspaceAction({
    formData,
    permission: "job_descriptions.manage",
    schema: jobDescriptionSchema,
    run: async ({ ctx, data, supabase }) => {
      assertFeature(ctx, "job_descriptions");
      if (data.id) {
        const { data: jd, error } = await supabase
          .from("job_descriptions")
          .update({ title: data.title })
          .eq("company_id", ctx.company.id)
          .eq("id", data.id)
          .select("id")
          .single();
        check(error, "update job description");
        id = jd!.id;
        const { data: latest } = await supabase
          .from("job_description_versions")
          .select("body")
          .eq("job_description_id", id!)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.body.trim() === data.body.trim()) return; // only the title changed
      } else {
        const { data: jd, error } = await supabase
          .from("job_descriptions")
          .insert({ company_id: ctx.company.id, title: data.title })
          .select("id")
          .single();
        check(error, "add job description");
        id = jd!.id;
      }
      const { error } = await supabase.from("job_description_versions").insert({
        company_id: ctx.company.id,
        job_description_id: id!,
        body: data.body,
        change_note: data.changeNote,
      });
      check(error, "publish job description");
    },
  });
  if (result.status === "success" && id)
    redirect(`${base(formData)}/job-descriptions/${id}?saved=1`);
  return result;
}

export async function setJobDescriptionArchived(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "job_descriptions.manage",
    schema: z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }),
    successMessage: "Job description updated.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("job_descriptions")
        .update({ archived_at: data.archived === "true" ? new Date().toISOString() : null })
        .eq("company_id", ctx.company.id)
        .eq("id", data.id);
      check(error, "archive job description");
    },
  });
}

export async function assignJobDescription(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "job_descriptions.manage",
    schema: idSchema,
    successMessage: "Staff updated. They see the job description in their staff portal.",
    run: async ({ data, supabase }) => {
      const ids = [...new Set(formData.getAll("staff").map(String))].filter(
        (v) => z.uuid().safeParse(v).success,
      );
      const { error } = await supabase.rpc("assign_job_description", {
        p_job_description: data.id,
        p_employee_ids: ids,
      });
      check(error, "assign job description");
    },
  });
}

export async function acknowledgeJobDescription(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    schema: z.object({ versionId: z.uuid() }),
    successMessage: "Thank you. Your confirmation has been recorded.",
    run: async ({ data }) => {
      const supabase = await createClient();
      const meta = await requestMeta();
      const { error } = await supabase.rpc("acknowledge_job_description", {
        p_version: data.versionId,
        p_user_agent: meta.userAgent ?? undefined,
      });
      check(error, "acknowledge job description");
    },
  });
}
