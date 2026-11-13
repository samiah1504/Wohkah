import { NextResponse, type NextRequest } from "next/server";
import {
  confirmPayment,
  isPaystackConfigured,
  markWebhookProcessed,
  recordWebhook,
  verifyWebhookSignature,
} from "@/lib/payments";

/**
 * Paystack webhook (configure in Paystack: Settings → API Keys & Webhooks →
 * https://<your-domain>/api/webhooks/paystack). Signature-verified,
 * stored once (duplicates are ignored) and confirmed with Paystack's API
 * before anything changes. Stage 2: not yet tested in Paystack test mode.
 */
export async function POST(request: NextRequest) {
  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  }
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { id?: number | string; reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const type = String(event.event ?? "unknown");
  const reference = String(event.data?.reference ?? "");
  const eventId = `${type}:${reference}:${event.data?.id ?? ""}`;

  if ((await recordWebhook(eventId, type, event)) === "done") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (type === "charge.success" && reference) {
    const result = await confirmPayment(reference);
    const ok = result === "applied" || result === "already_applied";
    await markWebhookProcessed(eventId, ok ? undefined : result);
    // Couldn't reach Paystack or the database: ask Paystack to retry later.
    if (result === "unverified") {
      return NextResponse.json({ error: "retry_later" }, { status: 503 });
    }
  } else {
    await markWebhookProcessed(eventId, "ignored_event_type");
  }
  // 200 for handled events (including ones we deliberately ignore or flag
  // for review, such as an amount mismatch) so Paystack doesn't retry them.
  return NextResponse.json({ received: true });
}
