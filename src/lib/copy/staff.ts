/**
 * Customer-facing wording for staff records (PRODUCT_LANGUAGE_AND_POSITIONING.md).
 * Status changes mirror app.staff_status_allowed() in the database.
 */
import type { Database } from "@/lib/supabase/database.types";

export type StaffStatus = Database["public"]["Enums"]["staff_status"];
export type EmploymentType = Database["public"]["Enums"]["employment_type"];

export const STAFF_STATUS: Record<
  StaffStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "default" | "info" }
> = {
  invited: { label: "Invited", tone: "default" },
  onboarding: { label: "Getting set up", tone: "default" },
  active: { label: "Active", tone: "success" },
  on_leave: { label: "On leave", tone: "info" },
  suspended: { label: "Suspended", tone: "warning" },
  plan_suspended: { label: "Paused (plan limit)", tone: "warning" },
  resigned: { label: "Resigned", tone: "neutral" },
  terminated: { label: "Let go", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
};

/** Groups used by the staff list filter. */
export const STATUS_GROUPS = {
  current: ["active", "on_leave", "suspended", "invited", "onboarding"],
  left: ["resigned", "terminated"],
  archived: ["archived"],
} as const satisfies Record<string, readonly StaffStatus[]>;
export type StatusGroup = keyof typeof STATUS_GROUPS | "all";

/** What each status can change to from the app, with the action's wording. */
export const STATUS_ACTIONS: Partial<
  Record<StaffStatus, { to: StaffStatus; label: string; confirm?: string }[]>
> = {
  invited: [
    { to: "active", label: "Mark as active" },
    { to: "archived", label: "Archive" },
  ],
  onboarding: [
    { to: "active", label: "Mark as active" },
    { to: "archived", label: "Archive" },
  ],
  active: [
    { to: "on_leave", label: "Mark as on leave" },
    { to: "suspended", label: "Suspend" },
    {
      to: "resigned",
      label: "Record resignation",
      confirm: "They'll be marked as having left today.",
    },
    {
      to: "terminated",
      label: "Record that they were let go",
      confirm: "They'll be marked as having left today.",
    },
  ],
  on_leave: [
    { to: "active", label: "Back from leave" },
    { to: "resigned", label: "Record resignation" },
    { to: "terminated", label: "Record that they were let go" },
  ],
  suspended: [
    { to: "active", label: "End suspension" },
    { to: "resigned", label: "Record resignation" },
    { to: "terminated", label: "Record that they were let go" },
  ],
  resigned: [
    { to: "active", label: "Rejoined" },
    { to: "archived", label: "Archive" },
  ],
  terminated: [
    { to: "active", label: "Rejoined" },
    { to: "archived", label: "Archive" },
  ],
  archived: [{ to: "resigned", label: "Restore from archive" }],
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  casual: "Casual",
  intern: "Intern",
};

export const GENDERS = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
} as const;

export const DOCUMENT_CATEGORIES = {
  contract: "Employment letter or contract",
  id_document: "ID card or passport",
  certificate: "Certificate",
  guarantor: "Guarantor form",
  letter: "Letter",
  other: "Other",
} as const;
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

/** "0007" — staff numbers are shown padded so lists line up. */
export function staffNo(n: number) {
  return String(n).padStart(4, "0");
}

type HistoryRow = { event: string; details: unknown };

/** One line of a staff member's history, in plain words. */
export function describeHistory({ event, details }: HistoryRow): string {
  const d = (details ?? {}) as Record<string, string | null>;
  const status = (s: string | null) => (s ? (STAFF_STATUS[s as StaffStatus]?.label ?? s) : "—");
  switch (event) {
    case "added":
      return "Added to the business";
    case "status_changed":
      return `Status changed from ${status(d.from ?? null)} to ${status(d.to ?? null)}`;
    case "job_title_changed":
      return d.to ? `Job title changed to ${d.to}` : "Job title removed";
    case "branch_changed":
      return d.to ? `Moved to ${d.to} branch` : "Branch removed";
    case "manager_changed":
      return d.to ? `Now reports to ${d.to}` : "No longer reports to anyone";
    case "employment_type_changed":
      return `Employment type changed to ${EMPLOYMENT_TYPES[d.to as EmploymentType] ?? d.to}`;
    case "details_updated":
      return "Contact or job details updated";
    case "private_details_updated":
      return "Private details updated";
    case "document_added":
      return `Document added: ${d.name}`;
    case "document_archived":
      return `Document archived: ${d.name}`;
    case "portal_linked":
      return "Joined the staff portal";
    default:
      return "Record updated";
  }
}
