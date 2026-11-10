"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { hashIdentifier, requestMeta } from "@/lib/request-meta";
import { createClient } from "@/lib/supabase/server";
import { hitRateLimit, RATE_LIMITS, rateLimitMessage } from "@/lib/rate-limit";
import { recordLoginEvent } from "@/lib/audit/security-events";
import { requireUser, safeNextPath } from "@/lib/auth/session";
import { echoValues, errorState, fieldErrorsFrom, type FormState } from "@/lib/forms";
import {
  forgotPasswordSchema,
  loginSchema,
  mfaCodeSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas";

async function ipSubject(): Promise<string> {
  const { ip } = await requestMeta();
  return hashIdentifier(ip ?? "unknown");
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }
  const { email, password } = parsed.data;

  for (const [rule, subject] of [
    [RATE_LIMITS.loginByIp, await ipSubject()],
    [RATE_LIMITS.loginByEmail, hashIdentifier(email)],
  ] as const) {
    const rl = await hitRateLimit(rule, subject);
    if (!rl.allowed) {
      await recordLoginEvent("rate_limited", { email });
      return errorState(rateLimitMessage(rl.retryAfterSeconds), { values });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordLoginEvent("login_failure", { email });
    if (error?.code === "email_not_confirmed") {
      return errorState("Please confirm your email address first. Check your inbox for the link.", {
        values,
      });
    }
    // Same message for unknown email and wrong password: no account enumeration.
    return errorState("The email or password is incorrect.", { values });
  }

  await recordLoginEvent("login_success", { userId: data.user.id, email });

  const next = safeNextPath(formData.get("next"));
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }
  const { fullName, email, password } = parsed.data;

  const rl = await hitRateLimit(RATE_LIMITS.registerByIp, await ipSubject());
  if (!rl.allowed) return errorState(rateLimitMessage(rl.retryAfterSeconds), { values });

  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${env.appUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return errorState("Choose a stronger password.", {
        fieldErrors: { password: error.message },
        values,
      });
    }
    if (error.code === "over_email_send_rate_limit") {
      return errorState("We couldn't send the email right now. Please try again shortly.", {
        values,
      });
    }
    console.error("[register] sign-up failed", { code: error.code, message: error.message });
    return errorState("We couldn't create your account. Please try again.", { values });
  }

  await recordLoginEvent("signup", { userId: data.user?.id ?? null, email });

  // With email confirmation on (production default) there is no session yet.
  // The response is the same whether or not the email was already registered.
  if (!data.session) {
    redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
  }
  redirect(next);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = echoValues(formData);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }
  const { email } = parsed.data;

  for (const [rule, subject] of [
    [RATE_LIMITS.resetByIp, await ipSubject()],
    [RATE_LIMITS.resetByEmail, hashIdentifier(email)],
  ] as const) {
    const rl = await hitRateLimit(rule, subject);
    if (!rl.allowed) return errorState(rateLimitMessage(rl.retryAfterSeconds), { values });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/auth/confirm?next=/reset-password`,
  });
  if (error && error.code !== "user_not_found") {
    console.error("[password-reset] request failed", { code: error.code });
  }
  await recordLoginEvent("password_reset_requested", { email });

  // Always the same answer: never reveal whether an account exists.
  return {
    status: "success",
    message:
      "If an account exists for that email, we've sent a link to reset the password. It expires in one hour.",
  };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/reset-password");
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return errorState("Choose a password you haven't used for this account.", {
        fieldErrors: { password: "This is your current password." },
      });
    }
    if (error.code === "weak_password") {
      return errorState("Choose a stronger password.", {
        fieldErrors: { password: error.message },
      });
    }
    if (error.code === "reauthentication_needed" || error.code === "insufficient_aal") {
      return errorState(
        "For your security, sign in again (including your authenticator code) before changing your password.",
      );
    }
    console.error("[password-reset] update failed", { code: error.code });
    return errorState("We couldn't update your password. Please request a new link.");
  }
  await recordLoginEvent("password_reset_completed", { userId: user.id, email: user.email });
  redirect("/workspaces?notice=password-updated");
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  await supabase.auth.signOut();
  if (data?.claims?.sub) await recordLoginEvent("logout", { userId: data.claims.sub });
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Multi-factor authentication (TOTP)
// ---------------------------------------------------------------------------
export async function verifyMfaLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/login/mfa");
  const parsed = mfaCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the code.", { fieldErrors: fieldErrorsFrom(parsed.error) });
  }

  const rl = await hitRateLimit(RATE_LIMITS.mfaByUser, user.id);
  if (!rl.allowed) return errorState(rateLimitMessage(rl.retryAfterSeconds));

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect(safeNextPath(formData.get("next")));

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data.code,
  });
  if (error) {
    await recordLoginEvent("mfa_challenge_failed", { userId: user.id });
    return errorState("That code didn't work. Check your authenticator app and try again.", {
      fieldErrors: { code: "Invalid or expired code." },
    });
  }
  redirect(safeNextPath(formData.get("next")));
}

export type EnrollState = FormState & {
  enrollment?: { factorId: string; qrCode: string; secret: string };
};

export async function startMfaEnrollment(): Promise<EnrollState> {
  await requireUser("/account");
  const supabase = await createClient();
  // Remove abandoned, unverified factors so enrolment can be retried.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) {
    console.error("[mfa] enrol failed", { code: error?.code });
    return errorState("We couldn't start two-step verification. Please try again.");
  }
  return {
    status: "idle",
    enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  };
}

export async function confirmMfaEnrollment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/account");
  const parsed = mfaCodeSchema.safeParse(Object.fromEntries(formData));
  const factorId = String(formData.get("factorId") ?? "");
  if (!parsed.success || !factorId) {
    return errorState("Enter the 6-digit code.", {
      fieldErrors: parsed.success ? {} : fieldErrorsFrom(parsed.error),
    });
  }
  const rl = await hitRateLimit(RATE_LIMITS.mfaByUser, user.id);
  if (!rl.allowed) return errorState(rateLimitMessage(rl.retryAfterSeconds));

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: parsed.data.code,
  });
  if (error) {
    return errorState(
      "That code didn't work. Make sure your phone's time is correct and try again.",
      {
        fieldErrors: { code: "Invalid or expired code." },
      },
    );
  }
  await recordLoginEvent("mfa_enrolled", { userId: user.id });
  return { status: "success", message: "Two-step verification is now on for your account." };
}

export async function disableMfa(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const factorId = String(formData.get("factorId") ?? "");
  const supabase = await createClient();
  // Supabase requires an aal2 session to remove a verified factor.
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return errorState(
      error.code === "insufficient_aal"
        ? "Sign in again with your authenticator code before turning two-step verification off."
        : "We couldn't turn off two-step verification. Please try again.",
    );
  }
  await recordLoginEvent("mfa_unenrolled", { userId: user.id });
  return { status: "success", message: "Two-step verification has been turned off." };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const values = echoValues(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) {
    console.error("[profile] update failed", { code: error.code });
    return errorState("We couldn't save your profile. Please try again.", { values });
  }
  return { status: "success", message: "Profile saved.", values };
}
