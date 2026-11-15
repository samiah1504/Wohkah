import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  FilePlus2Icon,
  FileSignatureIcon,
  PenLineIcon,
  SparklesIcon,
  UserPlusIcon,
} from "lucide-react";
import { Alert, Badge, Skeleton } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/entitlements";
import { requireTenant, type TenantContext } from "@/lib/tenancy";
import { formatDate, formatDateTime, todayIn } from "@/lib/dates";
import { PRIMARY_FEATURES, MORE_FEATURES } from "@/lib/copy/features";
import { isManager } from "@/lib/navigation";
import { getProfileName } from "@/components/shell/user-shell";
import { listHolidays } from "@/modules/workspace/server/queries";
import {
  pendingActions,
  recentActivity,
  setupSteps,
  staffOverview,
} from "@/modules/workspace/server/dashboard";
import { getMyStaffRecordId } from "@/modules/staff/server/queries";
import { listContracts, staffJobDescription } from "@/modules/documents/server/queries";
import { cn } from "@/lib/utils";

export default function WorkspaceHome(props: PageProps<"/w/[slug]">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home {...props} />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-16 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(
      new Date(),
    ),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

async function Home({ params, searchParams }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenant(slug);
  const name = (await getProfileName(ctx.user.id)).split(" ")[0] ?? "";
  const today = todayIn(ctx.company.timezone);

  const welcome =
    sp.welcome === "1" ? (
      <Alert variant="success" className="mb-6">
        Your business account is ready.{" "}
        {sp.trial === "started"
          ? "Your 7-day free trial has started. No card needed. "
          : sp.trial === "unavailable"
            ? "A free trial isn't available for this account (one trial per owner every 12 months), so you're on the Free plan. "
            : ""}
        The setup guide below shows what to do next.
      </Alert>
    ) : null;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-heading text-walnut mt-0.5 text-2xl font-extrabold sm:text-3xl">
            {greeting(ctx.company.timezone)}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-foreground font-medium">{ctx.company.name}</span>
            {ctx.roles.length ? <span aria-hidden>·</span> : null}
            {ctx.roles.map((r) => (
              <Badge key={r.roleId} variant="neutral">
                {r.name}
              </Badge>
            ))}
            {!ctx.roles.length ? <Badge variant="neutral">Staff portal</Badge> : null}
          </p>
        </div>
      </header>
      {welcome}
      {isManager({ slug, permissions: ctx.permissions, hasStaffRecord: false }) ? (
        <ManagerHome ctx={ctx} today={today} />
      ) : (
        <StaffHome ctx={ctx} today={today} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owners, administrators and managers
// ---------------------------------------------------------------------------
async function ManagerHome({ ctx, today }: { ctx: TenantContext; today: string }) {
  const base = `/w/${ctx.company.slug}`;
  const [overview, pending, activity, steps, holidays] = await Promise.all([
    staffOverview(ctx),
    pendingActions(ctx),
    recentActivity(ctx),
    setupSteps(ctx),
    listHolidays(ctx, Number(today.slice(0, 4))),
  ]);
  const upcoming = holidays.filter((h) => h.holiday_date >= today).slice(0, 4);
  const mySteps = steps.filter((s) => s.allowed);
  const done = mySteps.filter((s) => s.done).length;

  const quick = [
    can(ctx, "staff.manage") && {
      label: "Add staff",
      href: `${base}/staff/new`,
      icon: UserPlusIcon,
    },
    can(ctx, "contracts.manage") &&
      hasFeature(ctx, "digital_contracts") && {
        label: "Prepare a contract",
        href: `${base}/documents/contracts/new`,
        icon: FileSignatureIcon,
      },
    can(ctx, "job_descriptions.manage") &&
      hasFeature(ctx, "job_descriptions") && {
        label: "Write a job description",
        href: `${base}/documents/job-descriptions/new`,
        icon: ClipboardListIcon,
      },
    can(ctx, "members.invite") && {
      label: "Invite a manager",
      href: `${base}/members`,
      icon: FilePlus2Icon,
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof UserPlusIcon }[];

  const soon = [...PRIMARY_FEATURES, ...MORE_FEATURES].filter(
    (f) => !f.available && ["attendance", "leave", "tasks", "meetings", "salaries"].includes(f.key),
  );

  return (
    <>
      {mySteps.length && done < mySteps.length ? (
        <Link
          href={`${base}/setup`}
          className="bg-surface hover:border-primary/60 group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 transition-colors"
        >
          <SparklesIcon className="text-primary size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-sm">
            <span className="text-walnut font-semibold">Finish setting up your business</span>
            <span className="text-muted-foreground">
              {" "}
              · {done} of {mySteps.length} steps done
            </span>
          </span>
          <span className="bg-subtle h-1.5 w-full overflow-hidden rounded-full sm:w-40" aria-hidden>
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${(done / mySteps.length) * 100}%` }}
            />
          </span>
          <span className="text-walnut inline-flex items-center gap-1 text-sm font-semibold">
            Continue{" "}
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ) : null}

      {overview ? (
        <section aria-labelledby="team-heading">
          <h2 id="team-heading" className="sr-only">
            Your team
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Staff"
              value={overview.total}
              href={`${base}/staff`}
              hint={overview.paused ? `${overview.paused} paused (plan limit)` : "Current staff"}
            />
            <Stat
              label="Working"
              value={overview.working}
              href={`${base}/staff`}
              hint="Active staff"
              tone="success"
            />
            <Stat
              label="On leave"
              value={overview.onLeave}
              href={`${base}/staff`}
              hint="Marked as on leave"
              tone="info"
            />
            <Stat
              label="Suspended"
              value={overview.suspended}
              href={`${base}/staff`}
              hint="Not working for now"
              tone="warning"
            />
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Panel title="Needs your attention">
            {pending.length ? (
              <ul className="divide-y">
                {pending.map((p) => (
                  <li key={p.key}>
                    <Link
                      href={p.href}
                      className="hover:bg-subtle/60 -mx-5 flex items-center gap-3 px-5 py-3"
                    >
                      <span className="bg-primary/15 text-walnut flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums">
                        {p.count}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{p.label}</span>
                      <ArrowRightIcon className="text-muted-foreground size-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                <CheckCircle2Icon className="text-success size-4" aria-hidden /> Nothing needs your
                attention right now.
              </p>
            )}
          </Panel>

          {can(ctx, "staff.view") ? (
            <Panel
              title="Recent activity"
              action={
                <Link
                  href={`${base}/staff`}
                  className="text-walnut text-xs font-semibold hover:underline"
                >
                  All staff
                </Link>
              }
            >
              {activity.length ? (
                <ol className="grid gap-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span
                        className="bg-taupe/40 mt-2 size-1.5 shrink-0 rounded-full"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        {a.href ? (
                          <Link href={a.href} className="hover:underline">
                            {a.text}
                          </Link>
                        ) : (
                          a.text
                        )}
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(a.at, ctx.company.timezone)}
                          {a.who ? ` · by ${a.who}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Changes to staff records appear here.
                </p>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          {quick.length ? (
            <Panel title="Quick actions">
              <ul className="grid gap-2">
                {quick.map((q) => (
                  <li key={q.href}>
                    <Link
                      href={q.href}
                      className="hover:border-primary/60 hover:bg-subtle/40 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium"
                    >
                      <q.icon className="text-walnut size-4" aria-hidden /> {q.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          <Panel title="Coming up">
            {upcoming.length ? (
              <ul className="grid gap-2.5 text-sm">
                {upcoming.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <CalendarDaysIcon className="text-primary size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(h.holiday_date, { day: "numeric", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No public holidays coming up.{" "}
                {can(ctx, "holidays.manage") ? (
                  <Link
                    href={`${base}/settings/holidays`}
                    className="text-walnut font-medium underline"
                  >
                    Add holidays
                  </Link>
                ) : null}
              </p>
            )}
          </Panel>
          {soon.length ? (
            <Panel title="Also in WOHKAH">
              <ul className="grid gap-2 text-sm">
                {soon.map((f) => (
                  <li key={f.key} className="flex items-center justify-between gap-3">
                    <span>{f.title}</span>
                    <span className="bg-subtle text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      Coming soon
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Staff portal
// ---------------------------------------------------------------------------
async function StaffHome({ ctx, today }: { ctx: TenantContext; today: string }) {
  const base = `/w/${ctx.company.slug}`;
  const staffId = await getMyStaffRecordId(ctx);
  const [contracts, jd, holidays] = await Promise.all([
    staffId ? listContracts(ctx, "all", staffId) : Promise.resolve([]),
    staffId ? staffJobDescription(ctx, staffId) : Promise.resolve(null),
    listHolidays(ctx, Number(today.slice(0, 4))),
  ]);
  const toSign = contracts.filter(
    (c) => c.status === "awaiting_signatures" && !c.signatures.some((s) => s.party === "staff"),
  );
  const upcoming = holidays.filter((h) => h.holiday_date >= today).slice(0, 3);
  const soon = [...PRIMARY_FEATURES].filter(
    (f) => !f.available && ["attendance", "salaries", "leave", "tasks"].includes(f.key),
  );

  return (
    <>
      <Panel title="Waiting for you">
        {toSign.length || (jd && !jd.acknowledgedAt) ? (
          <ul className="divide-y">
            {toSign.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                  <PenLineIcon className="text-primary size-4 shrink-0" aria-hidden /> {c.title}
                </span>
                <Button asChild size="sm">
                  <Link href={`${base}/sign/${c.id}`}>
                    {c.kind === "contract" ? "Review and sign" : "Read and confirm"}
                  </Link>
                </Button>
              </li>
            ))}
            {jd && !jd.acknowledgedAt ? (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                  <ClipboardListIcon className="text-primary size-4 shrink-0" aria-hidden /> Your
                  job description: {jd.title}
                </span>
                <Button asChild size="sm">
                  <Link href={`${base}/me?tab=job`}>Read and confirm</Link>
                </Button>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 py-1 text-sm">
            <CheckCircle2Icon className="text-success size-4" aria-hidden /> You&apos;re all caught
            up.
          </p>
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Your things">
          <ul className="grid gap-2">
            {[
              staffId && { label: "My record", href: `${base}/me` },
              staffId && { label: "My job description", href: `${base}/me?tab=job` },
              staffId && { label: "My contracts and policies", href: `${base}/me?tab=contracts` },
              { label: "Account and security", href: "/account" },
            ]
              .filter(Boolean)
              .map((l) => {
                const link = l as { label: string; href: string };
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:bg-subtle/60 flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium"
                    >
                      {link.label}{" "}
                      <ArrowRightIcon className="text-muted-foreground size-4" aria-hidden />
                    </Link>
                  </li>
                );
              })}
          </ul>
          {!staffId ? (
            <p className="text-muted-foreground mt-3 text-xs">
              Your sign-in isn&apos;t linked to a staff record yet. Ask your manager.
            </p>
          ) : null}
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Coming up">
            {upcoming.length ? (
              <ul className="grid gap-2.5 text-sm">
                {upcoming.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <CalendarDaysIcon className="text-primary size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(h.holiday_date, { day: "numeric", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No public holidays coming up.</p>
            )}
          </Panel>
          {soon.length ? (
            <Panel title="Also in your staff portal">
              <ul className="grid gap-2 text-sm">
                {soon.map((f) => (
                  <li key={f.key} className="flex items-center justify-between gap-3">
                    <span>{f.title}</span>
                    <span className="bg-subtle text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      Coming soon
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-xl border">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-walnut text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone?: "success" | "info" | "warning";
}) {
  return (
    <li>
      <Link
        href={href}
        className="bg-surface hover:border-primary/60 block rounded-xl border px-4 py-3.5 transition-colors"
      >
        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              tone === "success" && "bg-success",
              tone === "info" && "bg-[#2d4a66]",
              tone === "warning" && "bg-warning",
              !tone && "bg-primary",
            )}
          />
          {label}
        </span>
        <span className="font-heading text-walnut mt-1 block text-3xl font-extrabold tabular-nums">
          {value}
        </span>
        <span className="text-muted-foreground block truncate text-xs">{hint}</span>
      </Link>
    </li>
  );
}
