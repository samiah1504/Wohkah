import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

export type RequestMeta = { ip: string | null; userAgent: string | null };

/**
 * End-user IP and user agent for audit logs and rate limiting.
 * On Vercel, x-forwarded-for is set by the platform (its first entry is the
 * client). Elsewhere it may be absent or spoofable, so these values are used
 * for logging and throttling only, never for authorisation.
 */
export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || null;
  return { ip: ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null, userAgent: h.get("user-agent") };
}

/** One-way hash for identifiers stored in logs and rate-limit keys (emails, IPs). */
export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase(), "utf8").digest("hex");
}
