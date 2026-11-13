import Link from "next/link";
import { Caveat } from "next/font/google";
import {
  ArmchairIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarCheckIcon,
  ClockAlertIcon,
  ReceiptIcon,
  UserCheckIcon,
  WalletIcon,
  BriefcaseIcon,
  CheckIcon,
  GraduationCapIcon,
  PillIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  TruckIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AVAILABLE_NOW, MORE_FEATURES, PRIMARY_FEATURES } from "@/lib/copy/features";
import { Reveal } from "./motion";
import {
  AttendanceScene,
  BranchesScene,
  HeroScene,
  LeaveScene,
  PaidScene,
  RecordsScene,
  RolesScene,
  SalaryBillScene,
  TasksScene,
} from "./scenes";

const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"] });

const delay = (ms: number) => ({ "--wk-delay": `${ms}ms` }) as React.CSSProperties;

function Status({ available, tone = "light" }: { available: boolean; tone?: "light" | "dark" }) {
  return available ? (
    <span className="bg-success inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white">
      <CheckIcon className="size-3.5" aria-hidden /> Available now
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "dark" ? "text-walnut bg-white/90" : "bg-walnut text-white",
      )}
    >
      Coming soon
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-10 pb-14 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:pb-20">
        <Reveal>
          <p
            data-reveal
            className="text-walnut inline-flex items-center gap-2 text-sm font-semibold"
          >
            <span className="bg-primary h-0.5 w-6" aria-hidden />
            Staff management for small and growing businesses
          </p>
          <h1
            data-reveal
            style={delay(80)}
            className="font-heading text-walnut mt-4 text-[2.4rem] leading-[1.04] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-[3.5rem]"
          >
            Running a business is already hard.{" "}
            <span className="bg-[linear-gradient(transparent_60%,rgba(214,158,0,0.65)_60%,rgba(214,158,0,0.65)_92%,transparent_92%)] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              Managing your staff
            </span>{" "}
            shouldn&apos;t make it harder.
          </h1>
          <p
            data-reveal
            style={delay(160)}
            className="text-foreground/80 mt-5 max-w-xl text-lg leading-relaxed sm:text-xl"
          >
            From tracking attendance and managing leave to working out salaries and keeping your
            team organised, WOHKAH takes the stress out of managing your staff.
          </p>
          <p
            data-reveal
            style={delay(200)}
            className="text-walnut mt-3 max-w-xl text-lg leading-relaxed font-semibold"
          >
            Know who is working, who is absent, what you&apos;re paying and when you&apos;re paying
            them. One place to keep your people and your business organised.
          </p>
          <div data-reveal style={delay(240)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-13 px-7 text-base">
              <Link href="/register">
                Create your free account <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-13 px-7 text-base">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <p
            data-reveal
            style={delay(320)}
            className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          >
            <span className="flex items-center gap-1.5">
              <CheckIcon className="text-success size-4" aria-hidden /> Free plan for up to 3 staff
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon className="text-success size-4" aria-hidden /> Made for businesses with
              1–50 staff
            </span>
          </p>
        </Reveal>
        <div>
          <HeroScene />
          <p className="text-muted-foreground mt-4 text-center text-xs lg:text-left">
            Preview with sample data.
            {PRIMARY_FEATURES.find((f) => f.key === "attendance")?.available
              ? ""
              : " Attendance is coming soon."}
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// A slow strip of the businesses WOHKAH is for (no claims, no logos)
// ---------------------------------------------------------------------------
const BUSINESSES = [
  "Supermarkets",
  "Restaurants",
  "Schools",
  "Salons",
  "Furniture makers",
  "Pharmacies",
  "Bakeries",
  "Logistics",
  "Fashion houses",
  "Clinics",
  "Agencies",
  "Hotels",
];

export function BusinessStrip() {
  const items = [...BUSINESSES, ...BUSINESSES];
  return (
    <div className="bg-walnut overflow-hidden py-4" aria-label="Made for businesses like yours">
      <ul className="wk-marquee flex w-max gap-8 whitespace-nowrap">
        {items.map((b, i) => (
          <li
            key={i}
            aria-hidden={i >= BUSINESSES.length}
            className="font-heading text-sand flex items-center gap-8 text-lg font-bold sm:text-xl"
          >
            {b}
            <span className="bg-primary size-2 rotate-45" aria-hidden />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story: from the exercise book to WOHKAH
// ---------------------------------------------------------------------------
const NOTEBOOK = [
  { text: "Chinedu — 7:50", strike: false },
  { text: "Halima — 8:05?", strike: false },
  { text: "Tobi — late again", strike: true },
  { text: "Grace — leave?? ask her", strike: false },
  { text: "Musa owes 20k advance", strike: true },
];

const CHATS = [
  { text: "Oga, I go reach by 9", side: "left" },
  { text: "Who has the shop key?", side: "right" },
  { text: "Sir, when is salary coming?", side: "left" },
] as const;

export function Story() {
  return (
    <Reveal as="section" className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2
            data-reveal
            className="font-heading text-walnut text-3xl leading-tight font-extrabold text-balance sm:text-5xl"
          >
            Before you deal with suppliers, customers and business expenses, you still have staff to
            manage.
          </h2>
          <div className="text-foreground/80 mt-5 grid gap-3 text-lg leading-relaxed">
            <p data-reveal style={delay(100)}>
              You have to know who showed up for work. Who came late? Who was absent? Who asked for
              leave?
            </p>
            <p data-reveal style={delay(160)}>
              At the end of the month, you still have to work out salaries, deductions and
              allowances, and figure out exactly how much you&apos;re spending on your staff. And if
              you have more than one branch, that&apos;s another level of monitoring.
            </p>
            <p data-reveal style={delay(220)} className="text-walnut font-semibold">
              You didn&apos;t start your business to spend every day chasing attendance, working out
              salaries by hand or trying to remember who you&apos;ve paid. WOHKAH takes that load
              off your shoulders.
            </p>
          </div>
        </div>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          {/* Before */}
          <div data-reveal style={delay(150)} className="relative mx-auto w-full max-w-md">
            <div
              className="relative -rotate-2 rounded-md border border-[#e3d6bd] bg-[#fffdf6] py-6 pr-6 pl-14 shadow-[0_20px_40px_-24px_rgba(43,29,24,0.5)]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, #d7e3ee 35px, #d7e3ee 36px)",
              }}
            >
              <span aria-hidden className="absolute inset-y-0 left-10 w-px bg-[#e8a3a3]" />
              <p className={cn(hand.className, "text-walnut/80 text-2xl leading-9 font-bold")}>
                Attendance — Tuesday
              </p>
              <ul className={cn(hand.className, "text-espresso text-2xl leading-9")}>
                {NOTEBOOK.map((n, i) => (
                  <li key={n.text} className="relative w-fit">
                    {n.text}
                    {n.strike ? (
                      <span
                        aria-hidden
                        className="wk-strike absolute top-1/2 left-0 h-0.5 w-full bg-[#c0392b]"
                        style={delay(700 + i * 250)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <ul aria-hidden className="mt-5 grid gap-2">
              {CHATS.map((c, i) => (
                <li
                  key={c.text}
                  data-reveal
                  style={delay(500 + i * 200)}
                  className={cn(
                    "w-fit max-w-[16rem] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    c.side === "left"
                      ? "bg-surface rounded-bl-sm border"
                      : "ml-auto rounded-br-sm bg-[#dcefd9]",
                  )}
                >
                  {c.text}
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-hidden
            data-reveal
            style={delay(400)}
            className="bg-primary text-walnut mx-auto flex size-14 rotate-90 items-center justify-center rounded-full lg:rotate-0"
          >
            <ArrowRightIcon className="size-6" />
          </div>

          {/* After */}
          <div data-reveal style={delay(600)} className="mx-auto w-full max-w-md">
            <div className="bg-surface rounded-2xl border p-5 shadow-[0_30px_60px_-28px_rgba(43,29,24,0.45)]">
              <div className="flex items-center justify-between">
                <p className="font-heading text-walnut font-extrabold">Tuesday at a glance</p>
                <span className="text-muted-foreground text-xs">Sample</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["15", "at work"],
                  ["1", "late"],
                  ["1", "on leave"],
                ].map(([n, l]) => (
                  <div key={l} className="bg-background rounded-xl border py-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="font-heading text-walnut text-2xl font-extrabold">{n}</dd>
                    <dd className="text-muted-foreground text-xs">{l}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-4 grid gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-success size-4" aria-hidden /> Shop key: Halima (opens
                  at 8am)
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-success size-4" aria-hidden /> Musa&apos;s advance:
                  ₦20,000, repaid from salary
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-success size-4" aria-hidden /> Salaries: ready for
                  review on the 25th
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Feature bands
// ---------------------------------------------------------------------------
type BandProps = {
  tone: "sand" | "walnut" | "mint" | "blush" | "sky";
  title: string;
  text: string;
  points: string[];
  available: boolean;
  scene: React.ReactNode;
  reverse?: boolean;
};

const TONES: Record<BandProps["tone"], string> = {
  sand: "bg-sand",
  walnut: "bg-walnut text-sand",
  mint: "bg-[#e4efe2]",
  blush: "bg-[#f6e4da]",
  sky: "bg-[#e5ecf4]",
};

function Band({ tone, title, text, points, available, scene, reverse }: BandProps) {
  const dark = tone === "walnut";
  return (
    <Reveal
      className={cn(
        "grid items-center gap-10 overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-14",
        TONES[tone],
      )}
    >
      <div className={cn(reverse && "lg:order-2")}>
        <div data-reveal>
          <Status available={available} tone={dark ? "dark" : "light"} />
        </div>
        <h3
          data-reveal
          style={delay(80)}
          className={cn(
            "font-heading mt-5 text-3xl leading-tight font-extrabold text-balance sm:text-4xl",
            dark ? "text-white" : "text-walnut",
          )}
        >
          {title}
        </h3>
        <p
          data-reveal
          style={delay(160)}
          className={cn(
            "mt-4 text-lg leading-relaxed",
            dark ? "text-sand/85" : "text-foreground/80",
          )}
        >
          {text}
        </p>
        <ul className="mt-6 grid gap-2.5">
          {points.map((p, i) => (
            <li
              key={p}
              data-reveal
              style={delay(220 + i * 70)}
              className="flex gap-2.5 font-medium"
            >
              <CheckIcon
                className={cn("mt-0.5 size-5 shrink-0", dark ? "text-primary" : "text-success")}
                aria-hidden
              />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal style={delay(200)} className={cn("pb-6", reverse && "lg:order-1")}>
        {scene}
      </div>
    </Reveal>
  );
}

const byKey = (key: string) => PRIMARY_FEATURES.find((f) => f.key === key)!;

// ---------------------------------------------------------------------------
// The owner's questions, and what WOHKAH gives back
// ---------------------------------------------------------------------------
const QUESTIONS = [
  {
    icon: UserCheckIcon,
    q: "Who came to work today?",
    a: "See every clock-in as it happens, with the time and the place.",
    tone: "bg-sand",
  },
  {
    icon: ClockAlertIcon,
    q: "Who resumed late? Who didn't show up?",
    a: "Late arrivals and absences are flagged for you. No more calling round.",
    tone: "bg-[#f6e4da]",
  },
  {
    icon: WalletIcon,
    q: "How much am I spending on salaries?",
    a: "Your monthly salary bill, worked out and broken down.",
    tone: "bg-[#e4efe2]",
  },
  {
    icon: ReceiptIcon,
    q: "Who is still waiting for their salary?",
    a: "See who you've paid and who you haven't, at a glance.",
    tone: "bg-[#e5ecf4]",
  },
  {
    icon: CalendarCheckIcon,
    q: "Who is on leave, and how many days are left?",
    a: "Requests, approvals and leave balances in one place.",
    tone: "bg-[#f6e4da]",
  },
  {
    icon: Building2Icon,
    q: "What's happening at my other branches?",
    a: "Every branch on one screen, even when you're not there.",
    tone: "bg-sand",
  },
];

export function OwnerQuestions() {
  return (
    <Reveal as="section" className="pb-20 sm:pb-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2
          data-reveal
          className="font-heading text-walnut max-w-2xl text-2xl leading-tight font-extrabold text-balance sm:text-4xl"
        >
          The questions you ask every day, answered in one place.
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUESTIONS.map(({ icon: Icon, q, a, tone }, i) => (
            <li
              key={q}
              data-reveal
              style={delay((i % 3) * 110)}
              className={cn("flex flex-col rounded-3xl p-6", tone)}
            >
              <Icon className="text-walnut size-6" aria-hidden />
              <p className="font-heading text-walnut mt-5 text-xl leading-snug font-extrabold">
                {q}
              </p>
              <ArrowDownIcon className="text-primary my-3 size-5" aria-hidden />
              <p className="text-foreground/85 font-medium">{a}</p>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Feature bands
// ---------------------------------------------------------------------------
export function FeatureBands() {
  const attendance = byKey("attendance");
  const salaries = byKey("salaries");
  const leave = byKey("leave");
  const tasks = byKey("tasks");
  const messages = byKey("messages");
  const staff = byKey("staff");
  return (
    <section id="features" className="scroll-mt-20 pb-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6">
        <Reveal className="mb-6 max-w-2xl">
          <h2
            data-reveal
            className="font-heading text-walnut text-3xl leading-tight font-extrabold text-balance sm:text-5xl"
          >
            Everything you need to manage your team, in one place.
          </h2>
          <p data-reveal style={delay(100)} className="text-foreground/75 mt-4 text-lg">
            Features still on the way are marked, so you always know what&apos;s ready to use today.
          </p>
        </Reveal>

        <Band
          tone="sand"
          title="Attendance without the daily chasing."
          text="Stop calling your supervisors to ask who came in. Staff clock in and out on their own phones, and WOHKAH uses GPS to check they're at an approved work location. See attendance for every branch from one screen."
          points={attendance.points}
          available={attendance.available}
          scene={<AttendanceScene />}
        />
        <Band
          tone="walnut"
          reverse
          title="Know exactly how much you're spending on salaries."
          text="WOHKAH works out each staff member's salary with their allowances, overtime and deductions, then adds it all up. See your total salary bill for the month and what next month is likely to cost."
          points={[
            "Allowances, overtime, deductions and salary advances",
            "Your total monthly salary bill, broken down",
            "Review and approve before anything is final",
          ]}
          available={salaries.available}
          scene={<SalaryBillScene />}
        />
        <Band
          tone="mint"
          title="Know who you've paid and who's still waiting."
          text="Keep a clear record of every salary payment: who has been paid, who is still waiting and when salaries are due. You pay your staff the way you already do. WOHKAH keeps the record so nothing is forgotten."
          points={[
            "Paid and awaiting payment at a glance",
            "Salary due dates in one place",
            "Salary slips staff can view on their phones",
          ]}
          available={salaries.available}
          scene={<PaidScene />}
        />
        <Band
          tone="blush"
          reverse
          title="Leave without the paperwork."
          text="Staff request leave from their phones. You see who else is off before you approve, and everyone's leave balance updates on its own. No more forms, no more guessing."
          points={leave.points}
          available={leave.available}
          scene={<LeaveScene />}
        />
        <Band
          tone="sky"
          title="Manage all your branches from one place."
          text="Whether you have two shops or branches in different cities, see what's happening at every location without being there. Know who supervises each branch and keep everyone accountable."
          points={[
            "Add your branches today",
            "Attendance for every branch side by side",
            "A supervisor for each location",
          ]}
          available={attendance.available}
          scene={<BranchesScene />}
        />
        <Band
          tone="sand"
          reverse
          title="Keep your whole team on the same page."
          text="Send announcements everyone can see, give out tasks with deadlines and keep work conversations out of scattered WhatsApp groups."
          points={[...tasks.points.slice(0, 2), messages.points[1]!]}
          available={tasks.available && messages.available}
          scene={<TasksScene />}
        />
        <Band
          tone="mint"
          title="Every staff record in one place."
          text="Stop searching through WhatsApp chats, notebooks and spreadsheets. Keep each staff member's details, salary, leave and documents together, and find them in seconds."
          points={staff.points}
          available={staff.available}
          scene={<RecordsScene />}
        />

        {/* What works today */}
        <Reveal className="bg-espresso text-sand grid items-center gap-10 rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-14">
          <div>
            <div data-reveal>
              <Status available />
            </div>
            <h3
              data-reveal
              style={delay(80)}
              className="font-heading mt-5 text-3xl leading-tight font-extrabold text-balance text-white sm:text-4xl"
            >
              Your business, your roles. Set it up today.
            </h3>
            <p data-reveal style={delay(160)} className="text-sand/85 mt-4 text-lg leading-relaxed">
              Not every business has an accountant or an operations manager. Create the roles you
              actually use, name them your way and choose what each one can see and do.
            </p>
            <ul className="mt-6 grid gap-2.5">
              {AVAILABLE_NOW.map((p, i) => (
                <li
                  key={p}
                  data-reveal
                  style={delay(220 + i * 70)}
                  className="flex gap-2.5 font-medium"
                >
                  <CheckIcon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal style={delay(200)}>
            <RolesScene />
          </div>
        </Reveal>

        {/* Later on */}
        <Reveal className="mt-8">
          <p data-reveal className="font-heading text-walnut text-xl font-extrabold">
            Also on the way
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {MORE_FEATURES.map((f, i) => (
              <li
                key={f.key}
                data-reveal
                style={delay(i * 60)}
                className="bg-surface flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                title={f.summary}
              >
                {f.title}
                <span className="text-muted-foreground text-xs font-medium">
                  {f.available ? "Available" : "Coming soon"}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Who it's for
// ---------------------------------------------------------------------------
const INDUSTRIES = [
  {
    icon: ShoppingBagIcon,
    title: "Shops and supermarkets",
    text: "Know who opened the shop on time, share the duty rota and keep sales staff accountable.",
    tone: "bg-sand",
  },
  {
    icon: UtensilsCrossedIcon,
    title: "Restaurants and kitchens",
    text: "Plan kitchen and service shifts, track late arrivals and pay cooks and waiters correctly.",
    tone: "bg-[#f6e4da]",
  },
  {
    icon: GraduationCapIcon,
    title: "Schools",
    text: "Keep teacher attendance, staff records, leave and salaries organised while you focus on running your school.",
    tone: "bg-[#e4efe2]",
  },
  {
    icon: ScissorsIcon,
    title: "Salons and spas",
    text: "Know which stylists are working, track attendance, organise shifts and manage your team.",
    tone: "bg-[#e5ecf4]",
  },
  {
    icon: ArmchairIcon,
    title: "Furniture makers and workshops",
    text: "Track workshop attendance, organise your production team and keep staff accountable.",
    tone: "bg-sand",
  },
  {
    icon: PillIcon,
    title: "Pharmacies and clinics",
    text: "Manage staff shifts, monitor attendance and keep staff records and licences organised.",
    tone: "bg-[#f6e4da]",
  },
  {
    icon: TruckIcon,
    title: "Logistics and e-commerce",
    text: "Coordinate packers, riders and drivers across locations and know who is on duty.",
    tone: "bg-[#e4efe2]",
  },
  {
    icon: BriefcaseIcon,
    title: "And many more",
    text: "Fashion houses, bakeries, hotels, agencies, churches and more. If you have staff, WOHKAH works for you.",
    tone: "bg-[#e5ecf4]",
  },
];

export function WhoItsFor() {
  return (
    <Reveal as="section" id="who-its-for" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <h2
            data-reveal
            className="font-heading text-walnut max-w-xl text-3xl leading-tight font-extrabold text-balance sm:text-5xl"
          >
            Made for businesses with 1–50 staff.
          </h2>
          <p data-reveal style={delay(100)} className="text-foreground/75 max-w-md text-lg">
            Simple to start, powerful enough to grow with you. From your first staff member to your
            third branch, WOHKAH fits the way you already work.
          </p>
        </div>
      </div>
      <ul className="mx-auto mt-10 flex w-full max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {INDUSTRIES.map(({ icon: Icon, title, text, tone }, i) => (
          <li
            key={title}
            data-reveal
            style={delay((i % 4) * 90)}
            className={cn(
              "flex min-h-52 w-64 shrink-0 snap-start flex-col rounded-3xl p-6 lg:w-auto",
              tone,
            )}
          >
            <Icon className="text-walnut size-7" aria-hidden />
            <h3 className="font-heading text-walnut mt-auto pt-8 text-xl font-extrabold">
              {title}
            </h3>
            <p className="text-foreground/75 mt-1.5 text-sm leading-relaxed">{text}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------
const STEPS = [
  { title: "Create your business account", text: "Start free in a few minutes. No card needed." },
  {
    title: "Add your staff and branches",
    text: "Invite your team with a link and set up each branch.",
  },
  {
    title: "Set up roles and permissions",
    text: "Decide who can see and do what. Change it any time.",
  },
  {
    title: "Manage your team from your phone or computer",
    text: "Stay in control wherever you are.",
  },
];

export function HowItWorks() {
  return (
    <Reveal as="section" id="how-it-works" className="bg-walnut scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2
          data-reveal
          className="font-heading max-w-2xl text-3xl leading-tight font-extrabold text-balance text-white sm:text-5xl"
        >
          Up and running in four steps. Free to start.
        </h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal style={delay(150 + i * 150)} className="relative">
              <span className="font-heading text-primary text-6xl leading-none font-extrabold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading mt-4 text-lg font-extrabold text-white">{s.title}</h3>
              <p className="text-sand/75 mt-1.5 text-sm leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
        <div data-reveal style={delay(800)} className="mt-12">
          <Button asChild size="lg" className="h-13 px-7 text-base">
            <Link href="/register">
              Create your business account <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Final call to action
// ---------------------------------------------------------------------------
export function FinalCta() {
  return (
    <section className="px-4 pt-6 pb-20 sm:px-6 sm:pb-28">
      <Reveal className="bg-primary relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-14 sm:px-14 sm:py-20">
        <p
          aria-hidden
          className="font-heading text-walnut/10 pointer-events-none absolute -right-4 -bottom-10 text-[9rem] leading-none font-extrabold select-none sm:text-[13rem]"
        >
          WOHKAH
        </p>
        <h2
          data-reveal
          className="font-heading text-walnut relative max-w-2xl text-4xl leading-[1.05] font-extrabold text-balance sm:text-6xl"
        >
          Running a business comes with enough headaches.
        </h2>
        <p
          data-reveal
          style={delay(100)}
          className="text-walnut relative mt-4 max-w-xl text-xl font-semibold"
        >
          Managing your staff shouldn&apos;t be another one.
        </p>
        <p data-reveal style={delay(160)} className="text-walnut/80 relative mt-2 max-w-xl text-lg">
          Start free with up to 3 staff, or try any paid plan free for 7 days. No card needed.
        </p>
        <div
          data-reveal
          style={delay(200)}
          className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          <Button asChild size="lg" variant="secondary" className="h-13 px-7 text-base">
            <Link href="/register">
              Create your free account <ArrowRightIcon />
            </Link>
          </Button>
          <p className="text-walnut text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-bold underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </Reveal>
    </section>
  );
}
