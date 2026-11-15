/**
 * The business navigation (owner-approved structure, 2026-11-15):
 *   Home · People · Salary Management · Settings · Work · More
 * and, for staff without management access (staff portal):
 *   Home · My Work · My Attendance · My Salary · More
 *
 * One source of truth for the desktop sidebar, the mobile bottom bar, the
 * section hub pages and their tests. Items are generated from the person's
 * permissions; modules that aren't built yet appear only as "soon" entries
 * (never as links), driven by the switches in src/lib/copy/features.ts.
 *
 * Showing or hiding an item is a convenience: every page and the database
 * check access again.
 */
import type { Permission } from "@/lib/permissions";
import { MORE_FEATURES, PRIMARY_FEATURES } from "@/lib/copy/features";

export type SectionKey =
  "home" | "people" | "salaries" | "settings" | "work" | "more" | "attendance";

export type NavChild = {
  key: string;
  label: string;
  description: string;
  /** Present when the page exists and the person can open it. */
  href?: string;
  /** Group heading inside the section (hub pages and the sidebar). */
  group?: string;
};

export type NavSection = {
  key: SectionKey;
  /** Sidebar label. */
  label: string;
  /** Bottom-bar label (short). */
  shortLabel: string;
  href: string;
  description: string;
  children: NavChild[];
};

export type NavContext = {
  slug: string;
  permissions: ReadonlySet<Permission>;
  /** The signed-in person has their own staff record here (staff portal). */
  hasStaffRecord: boolean;
};

const featureLive = (key: string) =>
  [...PRIMARY_FEATURES, ...MORE_FEATURES].find((f) => f.key === key)?.available === true;

/** A link when the feature is live and allowed, otherwise a "soon" entry (or nothing). */
function item(
  child: Omit<NavChild, "href"> & { href: string },
  opts: { allowed?: boolean; live?: boolean } = {},
): NavChild | null {
  const allowed = opts.allowed ?? true;
  const live = opts.live ?? true;
  if (!allowed) return null;
  return live ? child : { ...child, href: undefined };
}

const compact = (xs: (NavChild | null)[]) => xs.filter((x): x is NavChild => x !== null);

/** True when the person has any management access (not only the staff portal). */
export function isManager(ctx: NavContext): boolean {
  return ctx.permissions.size > 0;
}

export function navigationFor(ctx: NavContext): NavSection[] {
  const base = `/w/${ctx.slug}`;
  const can = (p: Permission) => ctx.permissions.has(p);
  const canAny = (...ps: Permission[]) => ps.some(can);
  const me = `${base}/me`;

  // -------------------------------------------------------------------------
  // Staff portal only (no management access)
  // -------------------------------------------------------------------------
  if (!isManager(ctx)) {
    return [
      { key: "home", label: "Home", shortLabel: "Home", href: base, description: "", children: [] },
      {
        key: "work",
        label: "My Work",
        shortLabel: "My Work",
        href: `${base}/work`,
        description: "What you're responsible for, and what's waiting for you.",
        children: compact([
          item(
            {
              key: "my-job",
              label: "My job description",
              description: "Read what your job involves and confirm it.",
              href: `${me}?tab=job`,
            },
            { allowed: ctx.hasStaffRecord },
          ),
          item(
            {
              key: "my-documents",
              label: "Documents to sign",
              description: "Contracts and policies from your business.",
              href: `${me}?tab=contracts`,
            },
            { allowed: ctx.hasStaffRecord },
          ),
          item(
            {
              key: "my-tasks",
              label: "My tasks",
              description: "Tasks you've been given, with deadlines.",
              href: `${base}/work/tasks`,
            },
            { live: featureLive("tasks") },
          ),
          item(
            {
              key: "my-reports",
              label: "Weekly and monthly reports",
              description: "Send your reports to your manager.",
              href: `${base}/work/reports`,
            },
            { live: false },
          ),
        ]),
      },
      {
        key: "attendance",
        label: "My Attendance",
        shortLabel: "Attendance",
        href: `${base}/attendance`,
        description: "Clock in and out, see your attendance and ask for leave.",
        children: compact([
          item(
            {
              key: "clock-in",
              label: "Clock in and out",
              description: "From an approved work location.",
              href: `${base}/attendance/clock`,
            },
            { live: featureLive("attendance") },
          ),
          item(
            {
              key: "attendance-history",
              label: "My attendance history",
              description: "Days worked, late arrivals and absences.",
              href: `${base}/attendance/history`,
            },
            { live: featureLive("attendance") },
          ),
          item(
            {
              key: "leave",
              label: "Leave requests",
              description: "Ask for leave and see your balance.",
              href: `${base}/attendance/leave`,
            },
            { live: featureLive("leave") },
          ),
        ]),
      },
      {
        key: "salaries",
        label: "My Salary",
        shortLabel: "Salary",
        href: `${base}/salaries`,
        description: "Your salary slips and payments.",
        children: compact([
          item(
            {
              key: "my-slips",
              label: "My salary slips",
              description: "Download your salary slips.",
              href: `${base}/salaries/slips`,
            },
            { live: featureLive("salaries") },
          ),
          item(
            {
              key: "my-payments",
              label: "My salary payments",
              description: "When each salary was paid.",
              href: `${base}/salaries/payments`,
            },
            { live: featureLive("salaries") },
          ),
        ]),
      },
      moreSection(ctx, base),
    ];
  }

  // -------------------------------------------------------------------------
  // Owners, administrators and managers: what their access allows
  // -------------------------------------------------------------------------
  const sections: NavSection[] = [
    { key: "home", label: "Home", shortLabel: "Home", href: base, description: "", children: [] },
  ];

  const people = compact([
    item(
      {
        key: "directory",
        label: "Staff directory",
        description: "Everyone who works for you, with their details, documents and history.",
        href: `${base}/staff`,
        group: "Staff",
      },
      { allowed: can("staff.view") },
    ),
    item(
      {
        key: "add-staff",
        label: "Add staff",
        description: "Add a staff member and invite them to the staff portal.",
        href: `${base}/staff/new`,
        group: "Staff",
      },
      { allowed: can("staff.manage") },
    ),
    item(
      {
        key: "job-descriptions",
        label: "Job descriptions",
        description: "What each job involves. Staff read and confirm them.",
        href: `${base}/documents/job-descriptions`,
        group: "Roles and responsibilities",
      },
      { allowed: can("job_descriptions.manage") },
    ),
    item(
      {
        key: "contracts",
        label: "Contracts and policies",
        description: "Contracts signed online, and policies such as your staff handbook.",
        href: `${base}/documents`,
        group: "Documents",
      },
      { allowed: canAny("contracts.manage", "contracts.sign") },
    ),
    item(
      {
        key: "templates",
        label: "Contract templates",
        description: "Your own templates and the starter templates.",
        href: `${base}/documents/templates`,
        group: "Documents",
      },
      { allowed: can("contracts.manage") },
    ),
    item(
      {
        key: "attendance",
        label: "Attendance",
        description: "Who is at work, clock-in and clock-out records.",
        href: `${base}/attendance`,
        group: "Attendance and leave",
      },
      { allowed: can("staff.view"), live: featureLive("attendance") },
    ),
    item(
      {
        key: "leave",
        label: "Leave",
        description: "Leave requests, approvals and balances.",
        href: `${base}/attendance/leave`,
        group: "Attendance and leave",
      },
      { allowed: can("staff.view"), live: featureLive("leave") },
    ),
  ]);
  if (people.length) {
    sections.push({
      key: "people",
      label: "People",
      shortLabel: "People",
      href: `${base}/people`,
      description: "Your staff, their jobs, documents, attendance and leave.",
      children: people,
    });
  }

  if (can("salaries.view")) {
    const live = featureLive("salaries");
    sections.push({
      key: "salaries",
      label: "Salary Management",
      shortLabel: "Salary",
      href: `${base}/salaries`,
      description: "Salary records, payments and salary slips, in one place.",
      children: [
        {
          key: "records",
          label: "Salary records",
          description: "Each staff member's salary, allowances and deductions.",
          group: "Salaries",
          href: live ? `${base}/salaries/records` : undefined,
        },
        {
          key: "month",
          label: "This month's salaries",
          description: "Total salary bill, and who has been paid.",
          group: "Salaries",
          href: live ? `${base}/salaries/month` : undefined,
        },
        {
          key: "payments",
          label: "Payments",
          description: "Pending and paid salaries, and payment history.",
          group: "Payments",
          href: live ? `${base}/salaries/payments` : undefined,
        },
        {
          key: "slips",
          label: "Salary slips",
          description: "Salary slips your staff can view on their phones.",
          group: "Payments",
          href: live ? `${base}/salaries/slips` : undefined,
        },
        {
          key: "adjustments",
          label: "Bonuses, allowances and deductions",
          description: "One-off and regular changes to pay.",
          group: "Salaries",
          href: live ? `${base}/salaries/adjustments` : undefined,
        },
        {
          key: "reports",
          label: "Salary reports",
          description: "Monthly totals and history.",
          group: "Payments",
          href: live ? `${base}/salaries/reports` : undefined,
        },
      ],
    });
  }

  const settings = compact([
    item({
      key: "company",
      label: "Business profile",
      description: "Name, contact details, address, working days and hours.",
      href: `${base}/settings/company`,
      group: "Company",
    }),
    item(
      {
        key: "branches",
        label: "Branches",
        description: "Your shops, offices and sites.",
        href: `${base}/settings/branches`,
        group: "Company",
      },
      { allowed: can("branches.manage") },
    ),
    item(
      {
        key: "work-locations",
        label: "Approved work locations",
        description: "Places where staff may clock in.",
        href: `${base}/settings/work-locations`,
        group: "Company",
      },
      { allowed: can("work_locations.manage") },
    ),
    item(
      {
        key: "holidays",
        label: "Public holidays",
        description: "Days your business is closed.",
        href: `${base}/settings/holidays`,
        group: "Company",
      },
      { allowed: can("holidays.manage") },
    ),
    item(
      {
        key: "access",
        label: "Team Access",
        description: "Who can sign in, their roles, and invitations.",
        href: `${base}/members`,
        group: "Team",
      },
      { allowed: can("members.view") },
    ),
    item(
      {
        key: "roles",
        label: "Roles and access",
        description: "Create roles and choose what each can do.",
        href: `${base}/roles`,
        group: "Team",
      },
      { allowed: can("roles.view") },
    ),
    item(
      {
        key: "leave-policies",
        label: "Leave policies",
        description: "Leave types and yearly allowances.",
        href: `${base}/settings/leave`,
        group: "Workplace",
      },
      { allowed: can("company.settings.manage"), live: featureLive("leave") },
    ),
    item(
      {
        key: "attendance-settings",
        label: "Attendance settings",
        description: "Clock-in rules and grace periods.",
        href: `${base}/settings/attendance`,
        group: "Workplace",
      },
      { allowed: can("company.settings.manage"), live: featureLive("attendance") },
    ),
    item(
      {
        key: "task-settings",
        label: "Task and report settings",
        description: "Report due dates and task defaults.",
        href: `${base}/settings/work`,
        group: "Workplace",
      },
      { allowed: can("company.settings.manage"), live: featureLive("tasks") },
    ),
    item(
      {
        key: "subscription",
        label: "Subscription",
        description: "Your plan, trial, add-ons and invoices.",
        href: `${base}/settings/subscription`,
        group: "Account",
      },
      { allowed: can("subscription.view") },
    ),
    item(
      {
        key: "audit",
        label: "Activity log",
        description: "A record of every change in your business account.",
        href: `${base}/settings/audit`,
        group: "Account",
      },
      { allowed: can("audit.view") },
    ),
    item({
      key: "setup",
      label: "Setup guide",
      description: "The steps to get your business ready.",
      href: `${base}/setup`,
      group: "Account",
    }),
    item({
      key: "security",
      label: "Sign-in and security",
      description: "Your password and two-step sign-in.",
      href: "/account",
      group: "Account",
    }),
  ]);
  sections.push({
    key: "settings",
    label: "Settings",
    shortLabel: "Settings",
    href: `${base}/settings`,
    description: "How your business is set up.",
    children: settings,
  });

  sections.push({
    key: "work",
    label: "Work",
    shortLabel: "Work",
    href: `${base}/work`,
    description: "What your staff are doing, and whether it's getting done.",
    children: compact([
      item(
        {
          key: "tasks",
          label: "Tasks",
          description: "Give out tasks with deadlines and priorities, and track progress.",
          href: `${base}/work/tasks`,
          group: "Tasks",
        },
        { live: featureLive("tasks") },
      ),
      item(
        {
          key: "reports",
          label: "Weekly and monthly reports",
          description: "Staff send reports; you review and reply.",
          href: `${base}/work/reports`,
          group: "Reports",
        },
        { live: false },
      ),
      item(
        {
          key: "performance",
          label: "Staff performance",
          description: "Targets, task completion and reviews.",
          href: `${base}/work/performance`,
          group: "Performance",
        },
        { live: featureLive("performance") },
      ),
    ]),
  });

  sections.push(moreSection(ctx, base));
  return sections;
}

function moreSection(ctx: NavContext, base: string): NavSection {
  const manager = isManager(ctx);
  const can = (p: Permission) => ctx.permissions.has(p);
  return {
    key: "more",
    label: "More",
    shortLabel: "More",
    href: `${base}/more`,
    description: "Everything else in WOHKAH.",
    children: compact([
      item(
        {
          key: "my-record",
          label: "My record",
          description: "Your staff record, job description and documents.",
          href: `${base}/me`,
          group: "You",
        },
        { allowed: ctx.hasStaffRecord },
      ),
      item(
        {
          key: "handbook",
          label: "Staff handbook and policies",
          description: manager
            ? "Policies your staff read and confirm."
            : "Policies to read and confirm.",
          href: manager ? `${base}/documents` : `${base}/me?tab=contracts`,
          group: "You",
        },
        {
          allowed: manager ? can("contracts.manage") || can("contracts.sign") : ctx.hasStaffRecord,
        },
      ),
      item({
        key: "account",
        label: "Account and security",
        description: "Your name, password and two-step sign-in.",
        href: "/account",
        group: "You",
      }),
      item(
        {
          key: "meetings",
          label: "Meetings and calendar",
          description: "Agendas, invitations and follow-up tasks.",
          href: `${base}/meetings`,
          group: "Communicate",
        },
        { live: featureLive("meetings") },
      ),
      item(
        {
          key: "announcements",
          label: "Announcements",
          description: "Important news for all your staff.",
          href: `${base}/announcements`,
          group: "Communicate",
        },
        { live: featureLive("messages") },
      ),
      item(
        {
          key: "messages",
          label: "Messages",
          description: "Talk to your staff, one-to-one or in groups.",
          href: `${base}/messages`,
          group: "Communicate",
        },
        { live: featureLive("messages") },
      ),
      item(
        {
          key: "events",
          label: "Company events",
          description: "Celebrations, trainings and important dates.",
          href: `${base}/events`,
          group: "Communicate",
        },
        { live: false },
      ),
      item(
        {
          key: "files",
          label: "Shared documents",
          description: "Files for everyone: forms, price lists, guides.",
          href: `${base}/files`,
          group: "Documents and learning",
        },
        { live: featureLive("documents") },
      ),
      item(
        {
          key: "training",
          label: "Training",
          description: "Learning materials for your staff.",
          href: `${base}/training`,
          group: "Documents and learning",
        },
        { live: false },
      ),
      item(
        {
          key: "insights",
          label: "Reports and charts",
          description: "How your business and staff are doing.",
          href: `${base}/insights`,
          group: "Insights",
        },
        { allowed: manager, live: false },
      ),
      item(
        {
          key: "settings",
          label: "Settings",
          description: "How your business is set up.",
          href: `${base}/settings`,
          group: "Business",
        },
        { allowed: manager },
      ),
      item({
        key: "help",
        label: "Help and support",
        description: "Questions, or something not working? Contact us.",
        href: "/contact",
        group: "Help",
      }),
    ]),
  };
}

/** The mobile bottom bar: at most five sections, Settings stays in More. */
export function bottomBarFor(sections: NavSection[]): NavSection[] {
  return sections.filter((s) => s.key !== "settings").slice(0, 5);
}

/** The section a path belongs to (for the active indicator). */
export function activeSection(sections: NavSection[], pathname: string): SectionKey | null {
  const base = sections[0]?.href ?? "";
  if (pathname === base) return "home";
  const rest = pathname.slice(base.length);
  const routes: [SectionKey, RegExp][] = [
    ["people", /^\/(people|staff|documents)(\/|$)/],
    ["salaries", /^\/salaries(\/|$)/],
    ["settings", /^\/(settings|members|roles|setup)(\/|$)/],
    ["work", /^\/work(\/|$)/],
    ["attendance", /^\/attendance(\/|$)/],
    ["more", /^\/(more|me|sign|meetings|announcements|messages|files)(\/|$)/],
  ];
  const hit = routes.find(([, re]) => re.test(rest))?.[0] ?? null;
  // Staff without People: their documents and record sit under My Work / More.
  if (hit && !sections.some((s) => s.key === hit)) {
    if (hit === "people") return sections.some((s) => s.key === "work") ? "work" : "more";
    return "more";
  }
  return hit;
}
