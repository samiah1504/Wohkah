import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "./paystack";

export { initializeTransaction, isPaystackConfigured, verifyWebhookSignature } from "./paystack";

/**
 * Verify a Paystack reference with Paystack, then apply it through the
 * database (which checks the amount against WOHKAH's own invoice and is
 * idempotent). Used by both the webhook and the post-payment redirect.
 */
export async function confirmPayment(
  reference: string,
): Promise<
  "applied" | "already_applied" | "amount_mismatch" | "not_paid" | "unknown_invoice" | "unverified"
> {
  const verified = await verifyTransaction(reference);
  if (!verified) return "unverified";
  if (!verified.ok) return "not_paid";
  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("billing_invoices")
    .select("id")
    .eq("reference", verified.reference)
    .maybeSingle();
  if (!invoice) return "unknown_invoice";
  const { data, error } = await admin.rpc("apply_verified_payment", {
    p_invoice_id: invoice.id,
    p_provider: "paystack",
    p_provider_reference: verified.reference,
    p_amount_minor: verified.amountMinor,
    p_currency: verified.currency,
    p_raw: verified.raw as never,
  });
  if (error) {
    console.error("[payments] apply_verified_payment failed", { code: error.code });
    return "unverified";
  }
  return data as "applied" | "already_applied" | "amount_mismatch";
}

/**
 * Store a verified webhook. "done" means the same event was already handled
 * successfully (a duplicate delivery); otherwise it should be processed,
 * which is safe to repeat because applying a payment is idempotent.
 */
export async function recordWebhook(
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<"process" | "done"> {
  const admin = createAdminClient();
  const { error } = await admin.from("webhook_events").insert({
    provider: "paystack",
    event_id: eventId,
    event_type: eventType,
    payload: payload as never,
  });
  if (!error) return "process";
  if (error.code !== "23505") throw error;
  const { data } = await admin
    .from("webhook_events")
    .select("processed_at, processing_error")
    .eq("provider", "paystack")
    .eq("event_id", eventId)
    .maybeSingle();
  return data?.processed_at && !data.processing_error ? "done" : "process";
}

export async function markWebhookProcessed(eventId: string, problem?: string) {
  await createAdminClient()
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_error: problem ?? null })
    .eq("provider", "paystack")
    .eq("event_id", eventId);
}
