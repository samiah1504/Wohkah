import { z } from "zod";

/** Matches supabase/config.toml: 10+ characters with upper, lower and a digit. */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "That name is too long."),
  email,
  password: passwordSchema,
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
