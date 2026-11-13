/**
 * Central customer-facing terminology (PRODUCT_LANGUAGE_AND_POSITIONING.md).
 * Interface text should come from here rather than being hand-written, so the
 * language stays consistent. Internal code and database names are unaffected.
 */

/**
 * The only built-in role. Every other role is created and named by the
 * business itself (product owner, 2026-11-14).
 */
export const SYSTEM_ROLE_COPY = {
  owner: {
    name: "Owner",
    description: "Full control of the business account, subscription and roles.",
  },
} as const;

export type SystemRoleKey = keyof typeof SYSTEM_ROLE_COPY;

/** Headings for permission groups (the database's internal module keys). */
const PERMISSION_GROUP_LABELS: Record<string, string> = {
  workspace: "Business setup",
  access: "Team access",
  staff: "Staff",
  billing: "Subscription",
  security: "Security",
};

export function permissionGroupLabel(module: string): string {
  return PERMISSION_GROUP_LABELS[module] ?? module.replace(/_/g, " ");
}

/** "1 staff member" / "5 staff". */
export function staffCount(n: number): string {
  return n === 1 ? "1 staff member" : `${n} staff`;
}

/**
 * Words customers should not see (PRODUCT_LANGUAGE_AND_POSITIONING.md §4).
 * tests/unit/language.test.ts scans customer-facing source for them.
 */
export const DISALLOWED_TERMS = [
  /\bemployees?\b/i,
  /\bworkforce\b/i,
  /\bhuman resources\b/i,
  /\bHR\b/,
  /\bpayroll\b/i,
  /\bpayslips?\b/i,
  /\bpersonnel\b/i,
  /\bremuneration\b/i,
  /\bonboarding\b/i,
  /\bself-service\b/i,
  /\bgeofenc/i,
  /\bworkspaces?\b/i, // say "business account" or "business"
  /\bwork e-?mail\b/i, // say "email address"
] as const;
