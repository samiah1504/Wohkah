import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/payments";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Where Paystack sends the customer after paying. The redirect itself proves
 * nothing: the payment is verified with Paystack on the server before
 * anything changes (the webhook does the same, whichever arrives first).
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? "";
  const back = safeNextPath(request.nextUrl.searchParams.get("next"), "/workspaces");
  const result = reference ? await confirmPayment(reference) : "unverified";
  const status = result === "applied" || result === "already_applied" ? "paid" : "pending";
  const url = new URL(back, request.nextUrl.origin);
  url.searchParams.set("payment", status);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
