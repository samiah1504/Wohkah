/**
 * The product's features as customers see them, with release status.
 *
 * `available: false` shows a "Coming soon" label on the public website, so we
 * never sell something that isn't built yet. Flip it to true when the phase
 * that delivers the feature ships (see DEVELOPMENT_ROADMAP.md).
 */
export type MarketingFeature = {
  key: string;
  title: string;
  summary: string;
  points: string[];
  available: boolean;
  /** Roadmap phase that delivers it (for maintainers; not shown to customers). */
  phase: number;
};

/** Everyday features, shown large on the homepage. */
export const PRIMARY_FEATURES: MarketingFeature[] = [
  {
    key: "staff",
    title: "Manage your staff",
    summary: "Every staff member's details, job role, documents and work history in one place.",
    points: [
      "Contact details, emergency contacts and bank details kept private",
      "Branches and who reports to whom",
      "Invite staff to their own portal with one link",
    ],
    available: false,
    phase: 2,
  },
  {
    key: "attendance",
    title: "Track attendance",
    summary: "Know who came to work, when they arrived and when they left.",
    points: [
      "Staff clock in and out on their phones",
      "GPS check against your approved work locations",
      "Late arrivals and absences flagged for you to review",
    ],
    available: false,
    phase: 4,
  },
  {
    key: "salaries",
    title: "Manage salaries",
    summary: "Calculate staff salaries, handle deductions and share salary slips.",
    points: [
      "Allowances, deductions, loans and salary advances",
      "Review and approve before anything is final",
      "Salary slips staff can view on their phones",
    ],
    available: false,
    phase: 5,
  },
  {
    key: "leave",
    title: "Manage leave",
    summary: "Receive leave requests, approve or decline them and see leave balances.",
    points: [
      "Annual, sick, casual and your own leave types",
      "See who is off before you approve",
      "Balances update automatically",
    ],
    available: false,
    phase: 5,
  },
  {
    key: "tasks",
    title: "Assign and track tasks",
    summary: "Give staff responsibilities, set deadlines and see what's done.",
    points: [
      "Checklists and due dates",
      "Comments and file attachments",
      "See overdue work at a glance",
    ],
    available: false,
    phase: 6,
  },
  {
    key: "messages",
    title: "Communicate with staff",
    summary:
      "Messages, group chats and announcements in one place, instead of scattered WhatsApp groups.",
    points: [
      "Direct and group messages",
      "Group channels and announcements",
      "Share files and voice notes",
    ],
    available: false,
    phase: 6,
  },
];

/** Supporting features, shown compactly. */
export const MORE_FEATURES: MarketingFeature[] = [
  {
    key: "meetings",
    title: "Organise meetings",
    summary: "Agendas, decisions and follow-up tasks.",
    points: [],
    available: false,
    phase: 6,
  },
  {
    key: "documents",
    title: "Staff documents",
    summary: "Contracts, certificates and policies stored securely.",
    points: [],
    available: false,
    phase: 7,
  },
  {
    key: "performance",
    title: "Staff performance",
    summary: "Set expectations and review progress.",
    points: [],
    available: false,
    phase: 7,
  },
  {
    key: "assets",
    title: "Company assets",
    summary: "Track equipment given to staff.",
    points: [],
    available: false,
    phase: 7,
  },
  {
    key: "loans",
    title: "Loans and advances",
    summary: "Record advances and repayment schedules.",
    points: [],
    available: false,
    phase: 7,
  },
  {
    key: "shifts",
    title: "Work schedules",
    summary: "Create shifts and weekly rosters.",
    points: [],
    available: false,
    phase: 4,
  },
];

/** What a business can do in WOHKAH today (Phase 1). Used by the FAQ and "available now" notes. */
export const AVAILABLE_NOW = [
  "Create your business account",
  "Set up branches and public holidays",
  "Invite managers and staff, with roles that control what each person can see",
  "A record of every change made in your business account",
  "Two-step sign-in for extra security",
] as const;
