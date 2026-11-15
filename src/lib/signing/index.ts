import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandedEmail, sendEmail } from "@/lib/email";
import { isEmailConfigured } from "@/lib/env";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { renderSignedPdf, type PdfSignature } from "@/lib/contracts/pdf";
import { CODE_MAX_ATTEMPTS, CODE_TTL_MINUTES } from "@/lib/contracts/consent";

/**
 * Electronic signing (ADR-0007). This module uses the service-role client
 * because signatures, signing codes and final documents must never be
 * writable by a browser: the database accepts a signature only from
 * public.record_contract_signature(), which is executable by the service
 * role and itself re-checks that the user is entitled to sign for that party.
 *
 * Callers must already have loaded the contract with the user's own client
 * (so RLS has confirmed they can see it).
 */

export type SigningResult =
  { ok: true; completed: boolean } | { ok: false; message: string; field?: "code" };

const hashCode = (contractId: string, userId: string, code: string) =>
  createHash("sha256").update(`${contractId}:${userId}:${code}`, "utf8").digest("hex");

export async function sendSigningCode(input: {
  contractId: string;
  companyId: string;
  userId: string;
  email: string;
  contractTitle: string;
  businessName: string;
  party: "staff" | "business";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      message:
        "Email isn't set up for WOHKAH yet, so we can't send you a signing code. Please try again later.",
    };
  }
  const limit = await hitRateLimit(RATE_LIMITS.signingCodeByUser, input.userId);
  if (!limit.allowed) {
    return {
      ok: false,
      message: `You've asked for several codes. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minutes and try again.`,
    };
  }
  const admin = createAdminClient();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  // Older unused codes stop working as soon as a new one is sent.
  await admin
    .from("contract_signing_codes")
    .update({ used_at: now.toISOString() })
    .eq("contract_id", input.contractId)
    .eq("user_id", input.userId)
    .is("used_at", null);
  const { error } = await admin.from("contract_signing_codes").insert({
    company_id: input.companyId,
    contract_id: input.contractId,
    user_id: input.userId,
    code_hash: hashCode(input.contractId, input.userId, code),
    expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error("[signing] could not store code", { code: error.code });
    return { ok: false, message: "We couldn't send a code just now. Please try again." };
  }
  const mail = brandedEmail({
    heading: "Your signing code",
    paragraphs: [
      `Use this code to sign “${input.contractTitle}” for ${input.businessName}:`,
      code,
      `It works for ${CODE_TTL_MINUTES} minutes. If you didn't ask to sign this document, you can ignore this email.`,
    ],
  });
  const sent = await sendEmail({
    to: input.email,
    subject: `${code} is your WOHKAH signing code`,
    html: mail.html,
    text: mail.text,
  });
  if (!sent.sent) {
    return { ok: false, message: "We couldn't send the email just now. Please try again." };
  }
  await admin.from("contract_events").insert({
    company_id: input.companyId,
    contract_id: input.contractId,
    event: "code_sent",
    party: input.party,
    actor_user_id: input.userId,
  });
  return { ok: true };
}

const SIGN_ERRORS: Record<string, string> = {
  contract_changed: "This document changed after you opened it. Reload the page and read it again.",
  contract_not_awaiting_signatures: "This document is no longer waiting for signatures.",
  already_signed: "This document has already been signed for your side.",
  not_a_signer: "You can't sign this document.",
  same_person_both_parties:
    "The same person can't sign for both the business and the staff member. Ask someone else with signing access to sign for the business.",
};

export async function verifyCodeAndSign(input: {
  contractId: string;
  userId: string;
  code: string;
  party: "staff" | "business";
  signerName: string;
  markType: "typed" | "drawn";
  mark: string;
  consentText: string;
  consentVersion: string;
  contentHash: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<SigningResult> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("contract_signing_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("contract_id", input.contractId)
    .eq("user_id", input.userId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[signing] could not read code", { code: error.code });
    return { ok: false, message: "We couldn't check the code just now. Please try again." };
  }
  if (!row || new Date(row.expires_at) < new Date()) {
    return {
      ok: false,
      field: "code",
      message: "That code has expired. Send yourself a new code.",
    };
  }
  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    return { ok: false, field: "code", message: "Too many wrong codes. Send yourself a new code." };
  }
  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashCode(input.contractId, input.userId, input.code.trim()), "hex");
  if (!timingSafeEqual(expected, actual)) {
    await admin
      .from("contract_signing_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return {
      ok: false,
      field: "code",
      message: "That code isn't right. Check the email and try again.",
    };
  }
  const verifiedAt = new Date().toISOString();
  await admin.from("contract_signing_codes").update({ used_at: verifiedAt }).eq("id", row.id);

  const { data, error: signError } = await admin.rpc("record_contract_signature", {
    p_contract: input.contractId,
    p_user: input.userId,
    p_party: input.party,
    p_signer_name: input.signerName,
    p_mark_type: input.markType,
    p_mark: input.mark,
    p_consent_text: input.consentText,
    p_consent_version: input.consentVersion,
    p_content_hash: input.contentHash,
    p_ip: input.ip,
    p_user_agent: input.userAgent ?? "",
    p_code_verified_at: verifiedAt,
  });
  if (signError) {
    const key = Object.keys(SIGN_ERRORS).find((k) => signError.message.includes(k));
    if (!key) console.error("[signing] signature refused", { code: signError.code });
    return {
      ok: false,
      message: key ? SIGN_ERRORS[key]! : "We couldn't record your signature. Please try again.",
    };
  }
  const completed = Boolean((data as { completed?: boolean } | null)?.completed);
  if (completed) await createFinalDocument(input.contractId);
  return { ok: true, completed };
}

/**
 * Builds the signed PDF with its signing certificate, stores it privately and
 * records its fingerprint. Safe to call again: it does nothing once stored.
 */
export async function createFinalDocument(contractId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("contracts")
    .select(
      "id, company_id, kind, title, body, status, content_hash, sent_at, final_pdf_path, employee:employees(full_name), company:companies(name)",
    )
    .eq("id", contractId)
    .single();
  if (!c || c.status !== "completed" || !c.content_hash || !c.sent_at) return false;
  if (c.final_pdf_path) return true;
  const { data: sigs } = await admin
    .from("contract_signatures")
    .select(
      "party, signer_name, mark_type, mark, signed_at, code_verified_at, ip_address, user_agent, consent_text",
    )
    .eq("contract_id", contractId)
    .order("signed_at");
  try {
    const pdf = await renderSignedPdf({
      businessName: c.company?.name ?? "",
      staffName: c.employee?.full_name ?? "",
      title: c.title,
      body: c.body,
      contractId: c.id,
      contentHash: c.content_hash,
      sentAt: c.sent_at,
      kind: c.kind,
      signatures: (sigs ?? []).map((s): PdfSignature => ({
        party: s.party as PdfSignature["party"],
        signerName: s.signer_name,
        markType: s.mark_type as PdfSignature["markType"],
        mark: s.mark,
        signedAt: s.signed_at,
        codeVerifiedAt: s.code_verified_at,
        ip: (s.ip_address as string | null) ?? null,
        userAgent: s.user_agent,
        consentText: s.consent_text,
      })),
    });
    const hash = createHash("sha256").update(pdf).digest("hex");
    const path = `${c.company_id}/${c.id}/signed-${hash.slice(0, 12)}.pdf`;
    const upload = await admin.storage
      .from("contracts")
      .upload(path, pdf, { contentType: "application/pdf", upsert: false });
    if (upload.error && !/exists/i.test(upload.error.message)) {
      console.error("[signing] could not store signed document", { message: upload.error.message });
      return false;
    }
    const { error } = await admin.rpc("set_contract_final_document", {
      p_contract: c.id,
      p_path: path,
      p_hash: hash,
    });
    if (error) {
      console.error("[signing] could not record signed document", { code: error.code });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[signing] could not build signed document", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
