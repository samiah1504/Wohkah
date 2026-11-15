import { z } from "zod";

const uuid = z.uuid();
const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

export const templateSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(1, "Give the template a name.").max(120, "That name is too long."),
  kind: z.enum(["contract", "policy"]),
  body: z
    .string()
    .trim()
    .min(20, "Write the template text first.")
    .max(60000, "That template is too long."),
  starterKey: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .nullable(),
    ),
});

export const newContractSchema = z.object({
  employeeId: uuid,
  templateId: optionalUuid,
  kind: z.enum(["contract", "policy"]).default("contract"),
  title: z.string().trim().max(150).optional(),
  amendsId: optionalUuid,
});

export const draftSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, "Give the document a title.").max(150, "That title is too long."),
  body: z
    .string()
    .trim()
    .min(20, "The document is empty.")
    .max(60000, "That document is too long."),
});

export const idSchema = z.object({ id: uuid });

export const cancelSchema = z.object({
  id: uuid,
  reason: z.string().trim().max(300, "Keep the reason under 300 characters.").optional(),
});

export const signSchema = z
  .object({
    id: uuid,
    signerName: z.string().trim().min(2, "Type your full name.").max(120, "That name is too long."),
    markType: z.enum(["typed", "drawn"]),
    drawn: z.string().max(200000).optional(),
    consent: z.literal("on", { message: "Tick the box to confirm you agree." }),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
  })
  .refine(
    (d) => d.markType === "typed" || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.drawn ?? ""),
    {
      path: ["drawn"],
      message: "Draw your signature in the box, or choose Type instead.",
    },
  );

export const jobDescriptionSchema = z.object({
  id: optionalUuid,
  title: z.string().trim().min(1, "Enter the job title.").max(120, "That title is too long."),
  body: z
    .string()
    .trim()
    .min(20, "Describe the job first.")
    .max(30000, "That job description is too long."),
  changeNote: z
    .string()
    .trim()
    .max(300, "Keep the note under 300 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
});
