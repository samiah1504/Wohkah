import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});

export const memberIdSchema = z.object({ memberId: z.uuid() });

export const memberStatusSchema = z.object({
  memberId: z.uuid(),
  status: z.enum(["active", "suspended", "removed"]),
});

export const invitationIdSchema = z.object({ invitationId: z.uuid() });

export const roleSchema = z.object({
  roleId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Enter a role name.").max(60, "That name is too long."),
  description: z
    .string()
    .trim()
    .max(300, "That description is too long.")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const roleIdSchema = z.object({ roleId: z.uuid() });

/** Checkbox groups arrive as repeated form fields. */
export function uuidsFrom(formData: FormData, name: string): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [
    ...new Set(
      formData
        .getAll(name)
        .map(String)
        .filter((v) => uuid.test(v)),
    ),
  ];
}
