import Link from "next/link";
import {
  ArmchairIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardListIcon,
  FileSpreadsheetIcon,
  FolderLockIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  LaptopIcon,
  MessageCircleWarningIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  PackageIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  TruckIcon,
  UserCheckIcon,
  UsersIcon,
  UtensilsCrossedIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MORE_FEATURES, PRIMARY_FEATURES, type MarketingFeature } from "@/lib/copy/features";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p
          className={cn(
            "text-sm font-bold tracking-wide uppercase",
            tone === "dark" ? "text-primary" : "text-[#a77b00]",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-heading mt-2 text-3xl leading-tight font-extrabold text-balance sm:text-4xl",
          tone === "dark" ? "text-white" : "text-walnut",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-lg leading-relaxed",
            tone === "dark" ? "text-sand/80" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ComingSoon({ available }: { available: boolean }) {
  return available ? (
    <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-xs font-semibold">
      Available
    </span>
  ) : (
    <span className="bg-subtle text-walnut rounded-full px-2 py-0.5 text-xs font-semibold">
      Coming soon
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export function Hero() {
  return (
    <section className="relative pt-10 pb-6 sm:pt-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="bg-surface text-walnut inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm">
          <span className="bg-primary size-2 rounded-full" aria-hidden />
          Staff management for small businesses
        </p>
        <h1 className="font-heading text-walnut mt-5 max-w-4xl text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Running a business is hard enough.{" "}
          <span className="text-[#a77b00]">Managing your staff shouldn&apos;t be.</span>
        </h1>
        <p className="text-foreground/80 mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl">
          WOHKAH helps you manage your staff, track who comes to work, organise salaries, assign
          tasks and keep everyone connected, all from one simple platform.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/register">
              Start Managing Your Staff <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
            <Link href="#features">Explore WOHKAH</Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
          <CheckIcon className="text-success size-4" aria-hidden />
          Simple tools for small businesses. No HR department required.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Problem → solution
// ---------------------------------------------------------------------------
const PROBLEMS = [
  { icon: UserCheckIcon, text: "Not knowing who actually came to work today" },
  { icon: FileSpreadsheetIcon, text: "Working out salaries by hand every month" },
  { icon: NotebookPenIcon, text: "Staff details scattered across notebooks and phones" },
  { icon: CalendarDaysIcon, text: "Losing track of who asked for leave, and when" },
  { icon: MessageCircleWarningIcon, text: "Repeating the same instructions on WhatsApp" },
  { icon: ClipboardListIcon, text: "Not knowing whether tasks were actually done" },
  { icon: FolderLockIcon, text: "Contracts and documents spread across devices" },
];

export function ProblemSolution() {
  return (
    <section className="bg-surface border-y py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Sound familiar?"
            title="Still managing your staff with WhatsApp messages, notebooks and spreadsheets?"
          />
          <ul className="mt-8 grid gap-3">
            {PROBLEMS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-walnut relative overflow-hidden rounded-3xl p-7 text-white sm:p-10">
          <div
            aria-hidden
            className="bg-primary/25 absolute -top-16 -right-16 size-56 rounded-full blur-3xl"
          />
          <p className="text-primary text-sm font-bold tracking-wide uppercase">The WOHKAH way</p>
          <h2 className="font-heading mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">
            Bring everything together in one place.
          </h2>
          <ul className="text-sand/90 mt-6 grid gap-3">
            {[
              "Every staff member's details and documents, organised",
              "Attendance recorded when staff clock in, not remembered later",
              "Salaries calculated the same way every month",
              "Leave requests in one list, with balances kept for you",
              "Tasks with owners and deadlines you can check",
              "Announcements and messages that reach everyone",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckIcon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
const FEATURE_ICONS: Record<string, typeof UsersIcon> = {
  staff: UsersIcon,
  attendance: UserCheckIcon,
  salaries: WalletIcon,
  leave: CalendarCheckIcon,
  tasks: ClipboardListIcon,
  messages: MessageSquareIcon,
  meetings: CalendarDaysIcon,
  documents: FolderLockIcon,
  performance: TrendingUpIcon,
  assets: LaptopIcon,
  loans: HandCoinsIcon,
  shifts: CalendarDaysIcon,
};

function BigFeature({ f, index }: { f: MarketingFeature; index: number }) {
  const Icon = FEATURE_ICONS[f.key] ?? UsersIcon;
  const lead = index < 3;
  return (
    <article className={cn("bg-surface flex flex-col rounded-2xl border p-6", lead && "lg:p-7")}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            lead ? "bg-primary text-walnut" : "bg-sand text-walnut",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <ComingSoon available={f.available} />
      </div>
      <h3 className="font-heading text-walnut mt-4 text-xl font-extrabold">{f.title}</h3>
      <p className="text-muted-foreground mt-2">{f.summary}</p>
      {f.points.length ? (
        <ul className="mt-4 grid gap-2 text-sm">
          {f.points.map((pt) => (
            <li key={pt} className="flex gap-2">
              <CheckIcon className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
              {pt}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to run your team, without the paperwork"
          description="Start with the everyday things: who's at work, what they're paid, who's on leave and what needs doing. Add the rest when you need it."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRIMARY_FEATURES.map((f, i) => (
            <BigFeature key={f.key} f={f} index={i} />
          ))}
        </div>

        <h3 className="font-heading text-walnut mt-14 text-center text-xl font-extrabold">
          And when your business needs more
        </h3>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.key] ?? UsersIcon;
            return (
              <li
                key={f.key}
                className="bg-surface/70 flex items-start gap-3 rounded-xl border p-4"
              >
                <Icon className="text-walnut mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {f.title} <ComingSoon available={f.available} />
                  </p>
                  <p className="text-muted-foreground text-sm">{f.summary}</p>
                </div>
              </li>
            );
          })}
        </ul>
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
    title: "Shops and retail",
    text: "See who opened the shop on time, share the week's duty rota and keep sales staff details in one place.",
  },
  {
    icon: UtensilsCrossedIcon,
    title: "Restaurants and food businesses",
    text: "Plan kitchen and service shifts, track late arrivals and pay cooks and waiters correctly.",
  },
  {
    icon: GraduationCapIcon,
    title: "Schools and learning centres",
    text: "Keep teachers' records and certificates organised, manage leave and share staff announcements.",
  },
  {
    icon: ScissorsIcon,
    title: "Salons and beauty businesses",
    text: "Know which stylists are in today, handle commissions in salaries and keep schedules clear.",
  },
  {
    icon: ArmchairIcon,
    title: "Furniture and manufacturing",
    text: "Track workshop attendance, assign production tasks and keep record of tools given to staff.",
  },
  {
    icon: TruckIcon,
    title: "E-commerce and logistics",
    text: "Coordinate packers, riders and drivers across locations with tasks and staff messages.",
  },
  {
    icon: BriefcaseIcon,
    title: "Agencies and service businesses",
    text: "Assign client work, follow up on deadlines and keep contracts and staff documents safe.",
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="bg-sand/50 scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Who it's for"
          title="Built for businesses that have people to manage."
          description="If you have between 5 and 50 staff and no HR department, WOHKAH was made for you. It grows with you to 100 staff and beyond."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className={cn(
                "bg-surface rounded-2xl border p-5",
                i === INDUSTRIES.length - 1 && "lg:col-span-2",
              )}
            >
              <span className="bg-walnut text-primary flex size-10 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-heading text-walnut mt-4 font-extrabold">{title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------
const STEPS = [
  {
    title: "Create your business workspace",
    text: "Sign up and set up your business in a few minutes. It's free to start.",
  },
  {
    title: "Add your staff",
    text: "Invite your staff and organise them by department and branch.",
  },
  {
    title: "Set up attendance, salaries and responsibilities",
    text: "Choose your work locations, salary details and who does what.",
  },
  {
    title: "Manage everything from one place",
    text: "Keep an eye on your business from your phone or computer, wherever you are.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Get your business organised in a few simple steps."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3 md:block">
                <span className="bg-primary text-walnut font-heading flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-extrabold">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="bg-border absolute top-5 left-12 hidden h-0.5 w-[calc(100%-3rem)] md:block"
                  />
                ) : null}
              </div>
              <h3 className="font-heading text-walnut mt-4 text-lg font-extrabold">{s.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/register">
              Create your workspace <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Benefits
// ---------------------------------------------------------------------------
const BENEFITS = [
  { icon: UserCheckIcon, text: "Know who is at work" },
  { icon: BookOpenIcon, text: "Keep staff records organised" },
  { icon: WalletIcon, text: "Fewer manual salary calculations" },
  { icon: CalendarCheckIcon, text: "Easier leave management" },
  { icon: MessageSquareIcon, text: "Keep everyone informed" },
  { icon: ClipboardListIcon, text: "Track responsibilities" },
  { icon: PackageIcon, text: "Find business information when you need it" },
  { icon: SmartphoneIcon, text: "A personal portal for every staff member" },
];

export function Benefits() {
  return (
    <section className="bg-surface border-y py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why business owners choose WOHKAH"
          title="Spend less time chasing staff information. More time growing your business."
        />
        <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="bg-sand text-walnut flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-semibold">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final call to action
// ---------------------------------------------------------------------------
export function FinalCta() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="bg-walnut relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="bg-primary/20 absolute -bottom-24 left-1/2 size-80 -translate-x-1/2 rounded-full blur-3xl"
        />
        <h2 className="font-heading relative mx-auto max-w-2xl text-3xl leading-tight font-extrabold text-balance text-white sm:text-4xl">
          Ready to make managing your staff easier?
        </h2>
        <p className="text-sand/80 relative mx-auto mt-4 max-w-xl text-lg">
          Get your staff records, attendance, salaries, tasks and communication organised with
          WOHKAH.
        </p>
        <div className="relative mt-8 flex flex-col items-center gap-4">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href="/register">
              Create Your Free Workspace <ArrowRightIcon />
            </Link>
          </Button>
          <p className="text-sand/80 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
