import {
  BellIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HomeIcon,
  MapPinIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  ReceiptIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product preview for the marketing site.
 *
 * Built from the app's design system so it looks like the real product. It
 * shows SAMPLE data and includes modules that are still being built, so it is
 * always labelled as a preview (PRODUCT_LANGUAGE_AND_POSITIONING.md §7).
 * Decorative: hidden from screen readers, with a text summary instead.
 */
export function ProductPreview() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        Preview of the WOHKAH staff management dashboard and the staff portal on a phone, showing
        sample data: staff at work today, absences, leave requests, salaries, tasks and
        announcements.
      </figcaption>
      <div aria-hidden className="relative mx-auto max-w-6xl">
        {/* Desktop leaves room on the right so the phone only overlaps its edge. */}
        <div className="sm:mr-28 md:mr-40 lg:mr-48">
          <DesktopPreview />
        </div>
        <div className="absolute right-0 -bottom-8 hidden w-48 sm:block md:w-56 lg:w-60">
          <PhonePreview />
        </div>
      </div>
      <div className="mx-auto mt-6 w-56 sm:hidden" aria-hidden>
        <PhonePreview />
      </div>
      <p className="text-muted-foreground mt-6 text-center text-xs sm:mt-14">
        Preview with sample data. Some modules shown are still being built and are marked “Coming
        soon” below.
      </p>
    </figure>
  );
}

function DesktopPreview() {
  return (
    <div className="bg-surface overflow-hidden rounded-xl border shadow-[0_24px_60px_-20px_rgba(43,29,24,0.35)]">
      {/* window bar */}
      <div className="bg-subtle/60 flex items-center gap-2 border-b px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#e2c9a6]" />
        <span className="size-2.5 rounded-full bg-[#e2c9a6]" />
        <span className="size-2.5 rounded-full bg-[#e2c9a6]" />
        <span className="bg-surface text-muted-foreground ml-3 hidden rounded-md px-3 py-0.5 text-[11px] sm:block">
          wohkah.com/w/adeola-furniture
        </span>
      </div>
      <div className="flex">
        {/* sidebar */}
        <div className="bg-sidebar hidden w-44 shrink-0 flex-col gap-1 p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <span className="bg-primary text-walnut flex size-6 items-center justify-center rounded text-[11px] font-extrabold">
              A
            </span>
            <span className="truncate text-xs font-bold text-white">Adeola Furniture</span>
          </div>
          {[
            [HomeIcon, "Home", true],
            [UsersIcon, "Staff", false],
            [UserCheckIcon, "Attendance", false],
            [WalletIcon, "Salaries", false],
            [CalendarDaysIcon, "Leave", false],
            [ClipboardListIcon, "Tasks", false],
            [MessageSquareIcon, "Messages", false],
          ].map(([Icon, label, active]) => {
            const I = Icon as typeof HomeIcon;
            return (
              <div
                key={label as string}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium",
                  active ? "bg-sidebar-active text-white" : "text-sidebar-muted",
                )}
              >
                <I className={cn("size-3.5", active && "text-primary")} />
                {label as string}
              </div>
            );
          })}
        </div>

        {/* main */}
        <div className="bg-background min-w-0 flex-1 p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-heading text-walnut text-sm font-extrabold sm:text-base">
                Good morning, Adeola
              </p>
              <p className="text-muted-foreground text-[10px] sm:text-[11px]">
                Tuesday · Ikeja showroom and workshop
              </p>
            </div>
            <BellIcon className="text-muted-foreground size-4" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4 sm:gap-3">
            <Stat label="Total staff" value="18" />
            <Stat label="At work today" value="15" tone="success" />
            <Stat label="Absent" value="2" tone="warning" />
            <Stat label="Leave requests" value="3" tone="primary" />
          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 lg:grid-cols-5">
            <Panel title="Attendance today" className="lg:col-span-3">
              <ul className="grid gap-1.5">
                {[
                  ["Chinedu O.", "Workshop", "7:52 am", "On time"],
                  ["Halima B.", "Showroom", "8:04 am", "On time"],
                  ["Tobi A.", "Delivery", "8:41 am", "Late"],
                  ["Grace E.", "Showroom", "—", "On leave"],
                ].map(([name, place, time, status]) => (
                  <li
                    key={name}
                    className="bg-surface flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[10px] sm:text-[11px]"
                  >
                    <span className="font-semibold">{name}</span>
                    <span className="text-muted-foreground hidden sm:inline">{place}</span>
                    <span className="text-muted-foreground">{time}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        status === "On time" && "bg-success/10 text-success",
                        status === "Late" && "bg-warning/10 text-warning",
                        status === "On leave" && "bg-subtle text-walnut",
                      )}
                    >
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid gap-3 lg:col-span-2">
              <Panel title="November salaries">
                <p className="font-heading text-walnut text-base font-extrabold">₦2,840,000</p>
                <p className="text-muted-foreground text-[10px]">
                  18 staff · ready for your review
                </p>
                <div className="bg-subtle mt-2 h-1.5 overflow-hidden rounded-full">
                  <div className="bg-primary h-full w-3/4 rounded-full" />
                </div>
              </Panel>
              <Panel title="Tasks">
                <ul className="grid gap-1 text-[10px] sm:text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2Icon className="text-success size-3" /> Deliver Lekki order
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2Icon className="text-success size-3" /> Count showroom stock
                  </li>
                  <li className="text-muted-foreground flex items-center gap-1.5">
                    <span className="size-3 rounded-full border" /> Polish dining sets (due Fri)
                  </li>
                </ul>
              </Panel>
            </div>
          </div>

          <div className="bg-sand/70 mt-3 flex items-start gap-2 rounded-lg p-2 text-[10px] sm:mt-4 sm:text-[11px]">
            <MegaphoneIcon className="text-walnut mt-0.5 size-3.5 shrink-0" />
            <p>
              <span className="font-semibold">Announcement:</span> The workshop closes early on
              Friday for the staff end-of-year lunch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "primary";
}) {
  return (
    <div className="bg-surface rounded-lg border p-2 sm:p-3">
      <p className="text-muted-foreground text-[10px] sm:text-[11px]">{label}</p>
      <p
        className={cn(
          "font-heading mt-0.5 text-lg font-extrabold sm:text-2xl",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "primary" && "text-[#a77b00]",
          !tone && "text-walnut",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface rounded-lg border p-2.5 sm:p-3", className)}>
      <p className="mb-2 text-[11px] font-bold sm:text-xs">{title}</p>
      {children}
    </div>
  );
}

export function PhonePreview() {
  return (
    <div className="border-walnut bg-walnut rounded-[2rem] border-[6px] shadow-[0_24px_50px_-18px_rgba(43,29,24,0.55)]">
      <div className="bg-background overflow-hidden rounded-[1.6rem]">
        <div className="flex justify-center pt-1.5">
          <span className="bg-walnut h-1.5 w-14 rounded-full" />
        </div>
        <div className="px-3 pt-2 pb-3">
          <p className="text-muted-foreground text-[10px]">Staff portal</p>
          <p className="font-heading text-walnut text-sm font-extrabold">Hi, Chinedu</p>

          <div className="bg-surface mt-2 rounded-xl border p-3 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1 text-[10px]">
              <MapPinIcon className="text-success size-3" /> At an approved work location
            </p>
            <div className="bg-primary text-walnut mt-2 rounded-lg py-2 text-xs font-bold">
              Clock in
            </div>
            <p className="text-muted-foreground mt-1.5 text-[9px]">
              Location is only checked when you clock in or out.
            </p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-lg border p-2">
              <CalendarDaysIcon className="text-walnut size-3.5" />
              <p className="mt-1 text-[10px] font-semibold">Leave left</p>
              <p className="font-heading text-walnut text-sm font-extrabold">12 days</p>
            </div>
            <div className="bg-surface rounded-lg border p-2">
              <ReceiptIcon className="text-walnut size-3.5" />
              <p className="mt-1 text-[10px] font-semibold">Salary slip</p>
              <p className="text-muted-foreground text-[10px]">October · View</p>
            </div>
          </div>

          <div className="bg-sand/60 mt-2 rounded-lg border p-2 text-[10px]">
            <p className="font-semibold">Today&apos;s tasks</p>
            <p className="text-muted-foreground">Polish dining sets · due Friday</p>
          </div>
        </div>
      </div>
    </div>
  );
}
