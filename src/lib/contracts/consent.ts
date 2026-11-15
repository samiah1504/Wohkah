/** Wording each signer agrees to. Stored with every signature, with its version. */
export const CONSENT_VERSION = "2026-11-15";

export function consentText(kind: "contract" | "policy"): string {
  return kind === "contract"
    ? "I have read this document and I agree to sign it electronically. I understand that my name, the time, my device and my network address are recorded with my signature."
    : "I have read this document and I confirm that I understand it and agree to follow it. I understand that my name, the time, my device and my network address are recorded.";
}

/** Signing codes: 6 digits, valid for 10 minutes, 5 tries each. */
export const CODE_TTL_MINUTES = 10;
export const CODE_MAX_ATTEMPTS = 5;
