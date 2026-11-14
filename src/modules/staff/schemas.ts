import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { DOCUMENT_CATEGORIES, EMPLOYMENT_TYPES, GENDERS } from "@/lib/copy/staff";

const text = (max: number, label = "This") =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long.`)
    .optional()
    .transform((v) => (v ? v : null));

const uuidOrNull = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

const dateOrNull = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
      .nullable(),
  );

const keys = <T extends Record<string, unknown>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const staffSchema = z
  .object({
    id: uuidOrNull,
    firstName: z.string().trim().min(1, "Enter a first name.").max(60, "That name is too long."),
    lastName: z.string().trim().min(1, "Enter a last name.").max(60, "That name is too long."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.email("Enter a valid email address.").nullable()),
    phoneCountry: z.string().trim().length(2).default("NG"),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((v) => (v ? v : null)),
    jobTitle: text(100, "That job title"),
    employmentType: z.enum(keys(EMPLOYMENT_TYPES)),
    startDate: dateOrNull,
    branchId: uuidOrNull,
    reportsTo: uuidOrNull,
  })
  .transform((d, ctx) => {
    let phone: string | null = null;
    if (d.phone) {
      phone = toE164(d.phoneCountry, d.phone);
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Enter a valid phone number for the country you picked.",
        });
        return z.NEVER;
      }
    }
    if (d.id && d.reportsTo === d.id) {
      ctx.addIssue({
        code: "custom",
        path: ["reportsTo"],
        message: "Someone can't report to themselves.",
      });
      return z.NEVER;
    }
    return { ...d, phone };
  });

const phoneOrNull = (label: string) =>
  z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .regex(/^[+0-9 ()-]{7,}$/, `Enter a valid ${label}.`)
        .nullable(),
    );

export const privateSchema = z.object({
  id: z.uuid(),
  dateOfBirth: dateOrNull.refine(
    (v) => !v || (v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10)),
    "Enter a date of birth in the past.",
  ),
  gender: z
    .enum(keys(GENDERS))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  addressLine1: text(200, "The address"),
  addressLine2: text(200, "The address"),
  city: text(100, "The city"),
  state: text(100, "The state"),
  emergencyName: text(120, "The name"),
  emergencyPhone: phoneOrNull("phone number"),
  emergencyRelationship: text(60, "The relationship"),
  kinName: text(120, "The name"),
  kinPhone: phoneOrNull("phone number"),
  kinRelationship: text(60, "The relationship"),
  bankName: text(100, "The bank name"),
  bankAccountNumber: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : null))
    .pipe(
      z
        .string()
        .regex(
          /^\d{6,20}$/,
          "Enter the account number using digits only (10 digits for Nigerian banks).",
        )
        .nullable(),
    ),
  bankAccountName: text(120, "The account name"),
  tin: text(30, "The TIN"),
  pensionPin: text(30, "The pension PIN"),
  pfaName: text(100, "The PFA name"),
});

export const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["active", "on_leave", "suspended", "resigned", "terminated", "archived"]),
});

export const documentSchema = z.object({
  employeeId: z.uuid(),
  path: z.string().min(10).max(400),
  name: z.string().trim().min(1, "Give the document a name.").max(150, "That name is too long."),
  category: z.enum(keys(DOCUMENT_CATEGORIES)),
});

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
