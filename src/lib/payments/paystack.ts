import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack adapter (ADR-0006). WOHKAH decides prices and entitlements;
 * Paystack only collects the money. Nothing here is trusted until the server
 * has verified the transaction with Paystack's API.
 *
 * STATUS: Stage 2. The code paths are written but have NOT yet been tested
 * against Paystack test mode (no credentials yet). Do not launch paid plans
 * until docs/PRICING_AUDIT.md "Stage 2" tests pass.
 */
const API = "https://api.paystack.co";

function secretKey(): string | undefined {
  const k = process.env.PAYSTACK_SECRET_KEY?.trim();
  return k ? k : undefined;
}

export function isPaystackConfigured(): boolean {
  return Boolean(secretKey());
}

/** True only for live keys; used to block live mode until approved. */
export function isLiveKey(): boolean {
  return secretKey()?.startsWith("sk_live_") ?? false;
}

export type InitResult =
  | { status: "redirect"; url: string }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export async function initializeTransaction(input: {
  reference: string;
  amountMinor: number;
  email: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<InitResult> {
  const key = secretKey();
  if (!key) return { status: "not_configured" };
  if (isLiveKey() && process.env.PAYSTACK_LIVE_APPROVED !== "true") {
    return { status: "error", message: "Live payments are not approved yet." };
  }
  try {
    const res = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amountMinor, // kobo
        currency: "NGN",
        email: input.email,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { status?: boolean; data?: { authorization_url?: string } };
    if (!res.ok || !body.status || !body.data?.authorization_url) {
      return { status: "error", message: "The payment page couldn't be opened. Please try again." };
    }
    return { status: "redirect", url: body.data.authorization_url };
  } catch {
    return { status: "error", message: "The payment service didn't respond. Please try again." };
  }
}

export type Verified = {
  ok: boolean;
  reference: string;
  amountMinor: number;
  currency: string;
  raw: unknown;
};

/** Server-side verification. Never rely on a browser redirect alone. */
export async function verifyTransaction(reference: string): Promise<Verified | null> {
  const key = secretKey();
  if (!key || !/^[A-Za-z0-9_-]{4,100}$/.test(reference)) return null;
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: { status?: string; reference?: string; amount?: number; currency?: string };
  };
  const d = body.data;
  if (!d?.reference) return null;
  return {
    ok: d.status === "success",
    reference: d.reference,
    amountMinor: Number(d.amount ?? 0),
    currency: String(d.currency ?? ""),
    raw: body,
  };
}

/** Paystack signs webhook bodies with HMAC-SHA512 using the secret key. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  key: string | undefined = secretKey(),
): boolean {
  if (!key || !signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", key).update(rawBody, "utf8").digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
