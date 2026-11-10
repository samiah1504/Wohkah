import { z } from "zod";
import { COUNTRIES, CURRENCIES, INDUSTRIES, SIZE_BANDS, TIMEZONES } from "./constants";

const optionalText = (max: number, label = "This") =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long.`)
    .optional()
    .transform((v) => (v ? v : null));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
    "Use 3–40 lowercase letters, numbers or hyphens, starting and ending with a letter or number.",
  );

const countryCode = z.enum(COUNTRIES.map((c) => c.code) as [string, ...string[]], {
  message: "Choose a country.",
});
const currency = z.enum(CURRENCIES, { message: "Choose a currency." });
const timezone = z.enum(TIMEZONES, { message: "Choose a time zone." });
const sizeBand = z
  .enum(SIZE_BANDS, { message: "Choose a company size." })
  .optional()
  .or(z.literal("").transform(() => undefined));
const industry = z
  .enum(INDUSTRIES, { message: "Choose an industry." })
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Enter the company name.").max(120, "That name is too long."),
  slug: slugSchema,
  countryCode,
  currency,
  timezone,
  industry,
  sizeBand,
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:MM.");

export const addressFields = {
  addressLine1: optionalText(200, "Address"),
  addressLine2: optionalText(200, "Address"),
  city: optionalText(100, "City"),
  state: optionalText(100, "State"),
  postalCode: optionalText(20, "Postal code"),
};

export function toAddress(d: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}) {
  const out: Record<string, string> = {};
  if (d.addressLine1) out.line1 = d.addressLine1;
  if (d.addressLine2) out.line2 = d.addressLine2;
  if (d.city) out.city = d.city;
  if (d.state) out.state = d.state;
  if (d.postalCode) out.postal_code = d.postalCode;
  return out;
}

export const companyProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the company name.").max(120, "That name is too long."),
    legalName: optionalText(200, "Legal name"),
    businessEmail: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.email("Enter a valid email address.").nullable()),
    phone: optionalText(32, "Phone number"),
    website: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(
        z
          .url({
            protocol: /^https?$/,
            message: "Enter a full web address, e.g. https://example.com",
          })
          .nullable(),
      ),
    industry,
    sizeBand,
    countryCode,
    currency,
    timezone,
    workStart: time,
    workEnd: time,
    ...addressFields,
  })
  .refine((v) => v.workEnd > v.workStart, {
    path: ["workEnd"],
    message: "The working day must end after it starts.",
  });

/** Checkbox group -> sorted unique weekday numbers. */
export function workingDaysFrom(formData: FormData): number[] {
  const days = formData
    .getAll("workingDays")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort();
}

export const departmentSchema = z.object({
  id: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Enter a name.").max(100, "That name is too long."),
  description: optionalText(500, "Description"),
  parentId: z
    .uuid("Choose a parent department.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const branchSchema = z.object({
  id: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Enter a name.").max(100, "That name is too long."),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{0,20}$/, "Use up to 20 letters, numbers, - or _.")
    .optional()
    .transform((v) => (v ? v : null)),
  phone: optionalText(32, "Phone number"),
  isHeadquarters: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  ...addressFields,
});

export const holidaySchema = z.object({
  holidayDate: z.iso.date("Choose a date."),
  name: z.string().trim().min(1, "Enter a name.").max(100, "That name is too long."),
  branchId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const idSchema = z.object({ id: z.uuid() });
