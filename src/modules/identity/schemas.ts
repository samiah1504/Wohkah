import { z } from "zod";

/** Matches Supabase Auth settings: 10+ characters with upper, lower, a digit and a symbol. */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.")
  .regex(/[^A-Za-z0-9]/, "Include a symbol, such as ! or -.");

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

/** "How did you hear about WOHKAH?" options (stored keys match the database check). */
export const ACQUISITION_SOURCES = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
  ["google_search", "Google Search"],
  ["youtube", "YouTube"],
  ["whatsapp", "WhatsApp"],
  ["referral", "Referral from a friend"],
  ["business_community", "Business community"],
  ["other", "Other"],
] as const;

const sourceKeys = ACQUISITION_SOURCES.map(([k]) => k) as [string, ...string[]];

/** Bump when the Terms of Use or Privacy Policy change materially. */
export const TERMS_VERSION = "2026-11-14";

const personName = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(60, `That ${label} is too long.`);

export const registerSchema = z.object({
  firstName: personName("first name"),
  lastName: personName("last name"),
  email,
  phoneCountry: z.string().trim().length(2),
  phone: z.string().trim().min(1, "Enter your phone number.").max(32, "That number is too long."),
  password: passwordSchema,
  acquisitionSource: z
    .enum(sourceKeys)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  acquisitionOther: z
    .string()
    .trim()
    .max(100, "Please keep this under 100 characters.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  terms: z.literal("on", {
    error: "Please agree to the General Terms of Use and Privacy Policy to continue.",
  }),
  marketing: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "That name is too long."),
  phone: z
    .string()
    .trim()
    .max(32, "That phone number is too long.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, +, - and brackets only.")
    .optional()
    .transform((v) => (v ? v : null)),
});
