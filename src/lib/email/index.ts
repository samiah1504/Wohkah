import "server-only";
import { env, isEmailConfigured } from "@/lib/env";

export type EmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: "not_configured" | "failed" };

/**
 * Transactional email through Resend's REST API (ADR-0008).
 * When RESEND_API_KEY isn't set, nothing is sent and the caller is told so;
 * we never pretend an email went out.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}): Promise<EmailResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[email] Resend rejected the message", { status: res.status });
      return { sent: false, reason: "failed" };
    }
    const body = (await res.json()) as { id?: string };
    return { sent: true, id: body.id ?? "" };
  } catch (err) {
    console.error("[email] send failed", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false, reason: "failed" };
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal branded layout (WOHKAH colours, inline styles for email clients). */
export function brandedEmail(opts: {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}): { html: string; text: string } {
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 16px;line-height:1.6">${escape(t)}</p>`).join("");
  const cta = opts.cta
    ? `<p style="margin:24px 0"><a href="${escape(opts.cta.url)}" style="background:#D69E00;color:#2B1D18;padding:12px 20px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block">${escape(opts.cta.label)}</a></p>
       <p style="margin:0 0 16px;font-size:12px;color:#78665B;word-break:break-all">Or paste this link into your browser: ${escape(opts.cta.url)}</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#FAF8F2;font-family:Inter,Arial,sans-serif;color:#292929">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <p style="font-family:Manrope,Arial,sans-serif;font-weight:800;font-size:20px;color:#2B1D18;margin:0 0 24px">WOHKAH</p>
    <div style="background:#ffffff;border:1px solid #E7DFD0;border-radius:12px;padding:28px">
      <h1 style="font-family:Manrope,Arial,sans-serif;font-size:22px;color:#2B1D18;margin:0 0 16px">${escape(opts.heading)}</h1>
      ${p}${cta}
      ${opts.footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#78665B">${escape(opts.footnote)}</p>` : ""}
    </div>
    <p style="font-size:12px;color:#78665B;margin:24px 0 0">Your staff, well managed. · A product of Crift Concepts</p>
  </div></body></html>`;
  const text = [opts.heading, "", ...opts.paragraphs, ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []), ...(opts.footnote ? ["", opts.footnote] : [])].join("\n");
  return { html, text };
}
