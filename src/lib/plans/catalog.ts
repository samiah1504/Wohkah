/**
 * WOHKAH plans and features: the single configuration used by the public
 * pricing cards, the comparison table, the subscription page and upgrade
 * prompts.
 *
 * The database holds the same configuration and enforces it (migration
 * 20261113000100). tests/db/catalog.test.ts fails if this file and the
 * database ever differ, so what customers are shown is what the backend does.
 *
 * Product owner decisions: docs/PRICING_AUDIT.md. Don't change values here
 * without an approved decision AND a matching migration.
 */

export const PLAN_CODES = ["free", "starter", "growth", "business"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
export type BillingInterval = "monthly" | "annual";

export type Plan = {
  code: PlanCode;
  name: string;
  forWho: string;
  /** Kobo. */
  monthlyMinor: number;
  /** Kobo, 10 × monthly. null = no annual option (Free). */
  annualMinor: number | null;
  includedStaff: number;
  /** Paid plans only (Free must upgrade). */
  extraStaff: { allowed: boolean; monthlyMinor: number; annualMinor: number };
  extraWorkLocation: { allowed: boolean; monthlyMinor: number; annualMinor: number };
  trialDays: number;
  /** Only where approved; null = not stated (never shown as a value). */
  supportLevel: string | null;
  reportHistoryMonths: number | null;
  /** Feature keys highlighted on pricing cards. */
  highlights: FeatureKey[];
};

const EXTRA_STAFF = { monthlyMinor: 100_000, annualMinor: 1_200_000 };
const EXTRA_LOCATION = { monthlyMinor: 100_000, annualMinor: 1_200_000 };

export const PLANS: readonly Plan[] = [
  {
    code: "free",
    name: "Free",
    forWho: "For very small teams getting organised. Free forever.",
    monthlyMinor: 0,
    annualMinor: null,
    includedStaff: 3,
    extraStaff: { allowed: false, ...EXTRA_STAFF },
    extraWorkLocation: { allowed: true, ...EXTRA_LOCATION },
    trialDays: 0,
    supportLevel: null,
    reportHistoryMonths: null,
    highlights: ["gps_clock_in", "basic_salaries", "leave_requests", "staff_portal"],
  },
  {
    code: "starter",
    name: "Starter",
    forWho: "For small businesses that need professional staff management.",
    monthlyMinor: 500_000,
    annualMinor: 5_000_000,
    includedStaff: 10,
    extraStaff: { allowed: true, ...EXTRA_STAFF },
    extraWorkLocation: { allowed: true, ...EXTRA_LOCATION },
    trialDays: 7,
    supportLevel: "Email support",
    reportHistoryMonths: 12,
    highlights: ["full_salaries", "digital_contracts", "advanced_onboarding", "full_attendance"],
  },
  {
    code: "growth",
    name: "Growth",
    forWho: "For businesses managing more staff, branches and routines.",
    monthlyMinor: 1_000_000,
    annualMinor: 10_000_000,
    includedStaff: 25,
    extraStaff: { allowed: true, ...EXTRA_STAFF },
    extraWorkLocation: { allowed: true, ...EXTRA_LOCATION },
    trialDays: 7,
    supportLevel: "Priority support",
    reportHistoryMonths: null,
    highlights: ["advanced_approvals", "staff_performance", "advanced_salaries", "meeting_minutes"],
  },
  {
    code: "business",
    name: "Business",
    forWho: "For businesses with several branches and busier operations.",
    monthlyMinor: 1_500_000,
    annualMinor: 15_000_000,
    includedStaff: 50,
    extraStaff: { allowed: true, ...EXTRA_STAFF },
    extraWorkLocation: { allowed: true, ...EXTRA_LOCATION },
    trialDays: 7,
    supportLevel: "Priority support",
    reportHistoryMonths: null,
    highlights: ["advanced_analytics", "advanced_reporting", "detailed_access_controls"],
  },
];

export function getPlan(code: string): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

// ---------------------------------------------------------------------------
// Features and limits
// ---------------------------------------------------------------------------
export type Entitlement = { enabled: boolean; limit: number | null };

const yes: Entitlement = { enabled: true, limit: null };
const no: Entitlement = { enabled: false, limit: null };
const lim = (n: number | null): Entitlement => ({ enabled: true, limit: n });
const off: Entitlement = { enabled: false, limit: 0 };

type Row = readonly [Entitlement, Entitlement, Entitlement, Entitlement];
const all: Row = [yes, yes, yes, yes];
const starterUp: Row = [no, yes, yes, yes];
const growthUp: Row = [no, no, yes, yes];
const businessOnly: Row = [no, no, no, yes];

/** Feature → [Free, Starter, Growth, Business]. limit null = unlimited. */
const MATRIX = {
  // Limits
  admins: [lim(1), lim(2), lim(5), lim(10)],
  branches: [lim(1), lim(2), lim(5), lim(10)], // product owner, 2026-11-14
  work_locations: [lim(1), lim(2), lim(5), lim(10)],
  storage_mb: [lim(500), lim(5120), lim(20480), lim(51200)],
  custom_domains: [off, off, off, off], // not offered (product owner, 2026-11-13)
  // Every plan
  staff_records: all,
  staff_portal: all,
  gps_clock_in: all,
  basic_attendance: all,
  basic_salaries: all,
  leave_requests: all,
  basic_tasks: all,
  staff_messaging: all,
  announcements: all,
  basic_reports: all,
  // Starter and up
  advanced_onboarding: starterUp,
  digital_contracts: starterUp,
  job_descriptions: starterUp,
  full_attendance: starterUp,
  full_salaries: starterUp,
  salary_advances: starterUp,
  salary_slips: starterUp,
  meetings: starterUp,
  company_documents: starterUp,
  // Growth and up
  advanced_approvals: growthUp,
  advanced_salaries: growthUp,
  advanced_attendance_reports: growthUp,
  staff_performance: growthUp,
  meeting_minutes: growthUp,
  advanced_lifecycle: growthUp,
  // Business
  advanced_analytics: businessOnly,
  advanced_reporting: businessOnly,
  advanced_approval_workflows: businessOnly,
  detailed_access_controls: businessOnly,
  extended_audit_history: businessOnly,
} as const satisfies Record<string, Row>;

export type FeatureKey = keyof typeof MATRIX;
export const FEATURE_KEYS = Object.keys(MATRIX) as FeatureKey[];

export function entitlement(plan: PlanCode, feature: FeatureKey): Entitlement {
  return MATRIX[feature][PLAN_CODES.indexOf(plan)]!;
}

/**
 * Customer-facing wording and release status for each feature.
 * `available: false` = not built yet ("Coming soon"); flip when its phase ships.
 */
export const FEATURE_INFO: Record<
  FeatureKey,
  { label: string; singular?: string; available: boolean; hidden?: boolean }
> = {
  admins: { label: "Administrators", singular: "administrator", available: true },
  branches: { label: "Branches", singular: "branch", available: true },
  work_locations: { label: "Work locations included", singular: "work location", available: true },
  storage_mb: { label: "File storage", available: true },
  custom_domains: { label: "Custom domains", available: false, hidden: true },
  staff_records: { label: "Staff profiles and records", available: false },
  staff_portal: { label: "Staff portal", available: false },
  gps_clock_in: { label: "GPS clock-in and clock-out", available: false },
  basic_attendance: { label: "Basic attendance tracking", available: false },
  basic_salaries: { label: "Basic salary calculations", available: false },
  leave_requests: { label: "Leave requests", available: false },
  basic_tasks: { label: "Basic task management", available: false },
  staff_messaging: { label: "Staff messaging", available: false },
  announcements: { label: "Company announcements", available: false },
  basic_reports: { label: "Basic dashboard and reports", available: false },
  advanced_onboarding: { label: "Full new staff setup", available: false },
  digital_contracts: { label: "Digital employment contracts and signatures", available: false },
  job_descriptions: { label: "Job descriptions and responsibilities", available: false },
  full_attendance: { label: "Full GPS attendance with approved work locations", available: false },
  full_salaries: { label: "Full salary management", available: false },
  salary_advances: { label: "Salary advances and deductions", available: false },
  salary_slips: { label: "Salary slips and salary reports", available: false },
  meetings: { label: "Meeting scheduling", available: false },
  company_documents: { label: "Company documents and policies", available: false },
  advanced_approvals: { label: "Multiple approval levels", available: false },
  advanced_salaries: { label: "Advanced salary management", available: false },
  advanced_attendance_reports: { label: "Advanced attendance reports", available: false },
  staff_performance: { label: "Staff performance and targets", available: false },
  meeting_minutes: { label: "Meeting minutes and action points", available: false },
  advanced_lifecycle: {
    label: "Advanced staff management (promotions, transfers, exits)",
    available: false,
  },
  advanced_analytics: { label: "Advanced business reports and analytics", available: false },
  advanced_reporting: { label: "Custom reports", available: false },
  advanced_approval_workflows: { label: "Advanced approval workflows", available: false },
  detailed_access_controls: { label: "Detailed access controls", available: false },
  extended_audit_history: { label: "Extended activity history", available: false },
};

/** Cheapest plan that includes a feature (for upgrade prompts). */
export function lowestPlanWith(feature: FeatureKey): Plan | undefined {
  return PLANS.find((p) => entitlement(p.code, feature).enabled);
}

// ---------------------------------------------------------------------------
// Comparison table layout (categories in the order the product owner listed)
// ---------------------------------------------------------------------------
export type ComparisonRow =
  | { type: "feature"; key: FeatureKey }
  | { type: "staff" }
  | { type: "extraStaff" }
  | { type: "extraLocations" }
  | { type: "support" }
  | { type: "reportHistory" };

const f = (key: FeatureKey): ComparisonRow => ({ type: "feature", key });

export const COMPARISON: { title: string; rows: ComparisonRow[] }[] = [
  {
    title: "Staff management",
    rows: [
      { type: "staff" },
      { type: "extraStaff" },
      f("staff_records"),
      f("staff_portal"),
      f("advanced_lifecycle"),
    ],
  },
  {
    title: "New staff setup and contracts",
    rows: [f("advanced_onboarding"), f("digital_contracts"), f("job_descriptions")],
  },
  {
    title: "Attendance and work locations",
    rows: [
      f("gps_clock_in"),
      f("basic_attendance"),
      f("full_attendance"),
      f("work_locations"),
      { type: "extraLocations" },
      f("advanced_attendance_reports"),
    ],
  },
  {
    title: "Salaries",
    rows: [
      f("basic_salaries"),
      f("full_salaries"),
      f("salary_advances"),
      f("salary_slips"),
      f("advanced_salaries"),
    ],
  },
  { title: "Leave", rows: [f("leave_requests")] },
  {
    title: "Tasks and communication",
    rows: [f("basic_tasks"), f("staff_messaging"), f("announcements")],
  },
  { title: "Meetings", rows: [f("meetings"), f("meeting_minutes")] },
  { title: "Documents and policies", rows: [f("company_documents")] },
  { title: "Staff performance", rows: [f("staff_performance")] },
  {
    title: "Branches and permissions",
    rows: [
      f("branches"),
      f("advanced_approvals"),
      f("advanced_approval_workflows"),
      f("detailed_access_controls"),
    ],
  },
  {
    title: "Reports and analytics",
    rows: [
      f("basic_reports"),
      { type: "reportHistory" },
      f("advanced_analytics"),
      f("advanced_reporting"),
      f("extended_audit_history"),
    ],
  },
  { title: "Account limits and storage", rows: [f("admins"), f("storage_mb")] },
  { title: "Support", rows: [{ type: "support" }] },
];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function naira(minor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function formatStorage(mb: number): string {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`;
}

/** "1" / "Unlimited" / "Not included" for a limit entitlement. */
export function formatLimit(feature: FeatureKey, e: Entitlement): string {
  if (!e.enabled) return "Not included";
  if (e.limit === null) return "Unlimited";
  return feature === "storage_mb" ? formatStorage(e.limit) : String(e.limit);
}
