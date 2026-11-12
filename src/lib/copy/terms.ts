/**
 * Central customer-facing terminology (PRODUCT_LANGUAGE_AND_POSITIONING.md).
 * Interface text should come from here rather than being hand-written, so the
 * language stays consistent. Internal code and database names are unaffected.
 */

/** Display names and descriptions for the six system roles, keyed by system_key. */
export const SYSTEM_ROLE_COPY = {
  owner: { name: "Owner", description: "Full control of the workspace, billing and roles." },
  hr_admin: {
    name: "Staff Manager",
    description: "Manages staff records, invitations and day-to-day staff matters.",
  },
  ops_manager: {
    name: "Operations Manager",
    description: "Branches, attendance, shifts and daily operations.",
  },
  dept_manager: {
    name: "Department Manager",
    description: "Their department's staff, tasks and approvals.",
  },
  accountant: { name: "Accountant", description: "Salaries and financial records." },
  employee: {
    name: "Staff Member",
    description: "Access to their own information in the staff portal.",
  },
} as const;

export type SystemRoleKey = keyof typeof SYSTEM_ROLE_COPY;

/** Plan feature labels shown on plan and pricing pages. */
export const FEATURE_COPY = {
  admins: { label: "Administrators", singular: "administrator" },
  branches: { label: "Branches", singular: "branch" },
  work_locations: { label: "Approved work locations", singular: "approved work location" },
  storage_mb: { label: "File storage", singular: null },
  custom_domains: { label: "Custom domains", singular: "custom domain" },
  custom_roles: { label: "Custom roles", singular: null },
  advanced_onboarding: { label: "New staff setup checklists", singular: null },
  job_descriptions: { label: "Job descriptions", singular: null },
  digital_contracts: { label: "Digital staff contracts", singular: null },
  advanced_approvals: { label: "Advanced approvals", singular: null },
  advanced_reporting: { label: "Advanced reports", singular: null },
  advanced_analytics: { label: "Business and staff reports", singular: null },
} as const;

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
] as const;
