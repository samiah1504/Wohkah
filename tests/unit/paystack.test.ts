import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Paystack webhook signature", async () => {
  const { verifyWebhookSignature } = await import("@/lib/payments/paystack");
  const key = "sk_test_example_not_a_real_key";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "WHK-1" } });
  const sign = (b: string, k = key) => createHmac("sha512", k).update(b).digest("hex");

  it("accepts a correctly signed body", () => {
    expect(verifyWebhookSignature(body, sign(body), key)).toBe(true);
  });
  it("rejects a tampered body, a wrong key or a missing signature", () => {
    expect(verifyWebhookSignature(body.replace("WHK-1", "WHK-2"), sign(body), key)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, "sk_test_other"), key)).toBe(false);
    expect(verifyWebhookSignature(body, null, key)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), undefined)).toBe(false);
  });
});
