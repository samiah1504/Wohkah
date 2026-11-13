"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  MapPinIcon,
  MegaphoneIcon,
  NavigationIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCycle, useReducedMotion, useSeen } from "./motion";

/*
 * Small animated scenes of WOHKAH at work. They use SAMPLE data and are
 * decorative (aria-hidden); each section says in words what the scene shows.
 */

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function useCountUp(target: number, run: boolean, ms = 1200) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, reduced, target, ms]);
  return reduced ? target : value;
}

function SampleTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-surface/90 text-walnut rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      Sample business
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero: a working morning. Staff clock in; the owner sees it happen.
// ---------------------------------------------------------------------------
const ARRIVALS = [
  { name: "Chinedu O.", place: "Ikeja workshop", time: "7:52 am", initials: "CO" },
  { name: "Halima B.", place: "Showroom", time: "8:04 am", initials: "HB" },
  { name: "Tobi A.", place: "Ikeja workshop", time: "8:11 am", initials: "TA" },
  { name: "Grace E.", place: "Showroom", time: "8:19 am", initials: "GE" },
  { name: "Musa K.", place: "Lekki branch", time: "8:26 am", initials: "MK" },
] as const;

export function HeroScene() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.2);
  const step = useCycle(ARRIVALS.length + 2, 1600, seen);
  const shown = Math.min(step + 1, ARRIVALS.length);
  const recent = ARRIVALS.slice(0, shown).slice(-3).reverse();
  const atWork = 10 + shown;

  return (
    <div ref={ref} aria-hidden className="relative mx-auto w-full max-w-[34rem] pb-6">
      {/* Owner's card */}
      <div className="bg-surface relative z-10 mr-14 rounded-2xl border p-4 shadow-[0_30px_60px_-28px_rgba(43,29,24,0.45)] sm:mr-24 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium">Adeola Furniture · Tuesday</p>
          <SampleTag />
        </div>
        <div className="mt-3 flex items-end gap-3">
          <p className="font-heading text-walnut text-5xl leading-none font-extrabold tabular-nums">
            {atWork}
          </p>
          <p className="text-muted-foreground pb-1 text-sm">
            of 18 staff
            <br />
            at work so far
          </p>
        </div>
        <div className="bg-subtle mt-3 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-700"
            style={{ width: `${(atWork / 18) * 100}%` }}
          />
        </div>
        <ul className="mt-4 grid gap-2">
          {recent.map((a) => (
            <li
              key={a.name}
              className="wk-pop bg-background flex items-center gap-3 rounded-xl border px-3 py-2"
            >
              <span className="bg-sand text-walnut flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                {a.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.name} <CheckIcon className="text-success size-3.5 shrink-0" />
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  Clocked in {a.time} · {a.place}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Staff member's phone */}
      <div className="wk-float absolute -right-1 bottom-0 z-20 w-40 sm:w-48">
        <div className="bg-walnut rounded-[1.75rem] p-1.5 shadow-[0_30px_50px_-20px_rgba(43,29,24,0.6)]">
          <div className="bg-background rounded-[1.4rem] px-3 pt-3 pb-4">
            <div className="bg-walnut mx-auto mb-3 h-1.5 w-12 rounded-full" />
            <p className="text-muted-foreground text-[10px]">Staff portal</p>
            <p className="font-heading text-walnut text-sm font-extrabold">Hi, Musa</p>
            <div className="relative mx-auto mt-4 flex size-20 items-center justify-center">
              <span className="wk-ring bg-primary/40 absolute inset-0 rounded-full" />
              <span
                className="wk-ring bg-primary/30 absolute inset-0 rounded-full"
                style={{ animationDelay: "1.2s" }}
              />
              <span className="bg-primary text-walnut relative flex size-14 items-center justify-center rounded-full">
                <MapPinIcon className="size-6" />
              </span>
            </div>
            <p className="text-success mt-3 text-center text-[10px] font-semibold">
              At Lekki branch
            </p>
            <div className="bg-primary text-walnut mt-2 rounded-lg py-2 text-center text-xs font-bold">
              Clock in
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance: approved work location, clock-in, late arrival flagged.
// ---------------------------------------------------------------------------
export function AttendanceScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const step = useCycle(3, 2200, seen);
  return (
    <div ref={ref} aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="bg-surface relative overflow-hidden rounded-2xl border shadow-[0_24px_50px_-26px_rgba(43,29,24,0.45)]">
        {/* A simple street map */}
        <svg viewBox="0 0 400 220" className="block h-auto w-full bg-[#efe6d3]">
          <g stroke="#fff" strokeLinecap="round" fill="none">
            <path d="M-10 70 H420" strokeWidth="16" />
            <path d="M-10 160 C120 150 260 190 420 150" strokeWidth="12" />
            <path d="M120 -10 V230" strokeWidth="12" />
            <path d="M300 -10 C290 80 320 140 300 230" strokeWidth="10" />
          </g>
          <g fill="#e2d4b8">
            <rect x="20" y="92" width="80" height="48" rx="6" />
            <rect x="140" y="88" width="62" height="56" rx="6" />
            <rect x="220" y="10" width="64" height="44" rx="6" />
            <rect x="320" y="84" width="70" height="52" rx="6" />
            <rect x="150" y="176" width="110" height="40" rx="6" />
          </g>
          <circle
            cx="210"
            cy="112"
            r="58"
            fill="#d69e00"
            fillOpacity="0.14"
            stroke="#d69e00"
            strokeDasharray="5 5"
          />
        </svg>
        <div className="absolute top-[51%] left-[52.5%] -translate-x-1/2 -translate-y-full">
          <span className="wk-ring bg-primary/50 absolute -bottom-2 left-1/2 size-8 -translate-x-1/2 rounded-full" />
          <MapPinIcon className="fill-primary text-walnut relative size-9" />
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold">
          <ShieldCheckIcon className="text-success size-3.5" /> Ikeja workshop · approved location
        </div>
        <SampleTag className="absolute top-3 right-3" />
        <div className="grid gap-2 p-4">
          <Row name="Chinedu O." detail="Clocked in 7:52 am" tone="ok" show />
          <Row name="Tobi A." detail="Clocked in 8:41 am · late" tone="late" show={step >= 1} />
          <Row name="Grace E." detail="On leave today" tone="leave" show={step >= 2} />
        </div>
      </div>
      <p className="bg-walnut text-sand absolute -bottom-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-lg">
        <NavigationIcon className="text-primary size-3" /> Location is only checked at clock-in and
        clock-out
      </p>
    </div>
  );
}

function Row({
  name,
  detail,
  tone,
  show,
}: {
  name: string;
  detail: string;
  tone: "ok" | "late" | "leave";
  show: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-all duration-500",
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <UserCheckIcon className="text-walnut size-4" /> {name}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
          tone === "ok" && "bg-success/10 text-success",
          tone === "late" && "bg-warning/10 text-warning",
          tone === "leave" && "bg-sand text-walnut",
        )}
      >
        {detail}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salaries (B): the month's salary bill, worked out and broken down.
// ---------------------------------------------------------------------------
const BILL = [
  { label: "Basic salaries", amount: 2_310_000 },
  { label: "Allowances", amount: 412_000 },
  { label: "Overtime", amount: 96_000 },
  { label: "Deductions and advances", amount: -138_000 },
] as const;

export function SalaryBillScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const total = BILL.reduce((s, l) => s + l.amount, 0);
  const shown = useCountUp(total, seen, 1600);
  const max = Math.max(...BILL.map((l) => Math.abs(l.amount)));
  return (
    <div ref={ref} aria-hidden className="relative mx-auto w-full max-w-md">
      <div
        className={cn(
          "bg-surface text-foreground relative rounded-2xl p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] transition-all duration-1000",
          seen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs">November salary bill · 18 staff</p>
            <p className="font-heading text-walnut mt-1 text-4xl font-extrabold tabular-nums">
              {naira(shown)}
            </p>
          </div>
          <SampleTag />
        </div>
        <ul className="mt-5 grid gap-3">
          {BILL.map((l, i) => (
            <li key={l.label} className="grid gap-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-foreground/80">{l.label}</span>
                <span
                  className={cn("font-semibold tabular-nums", l.amount < 0 && "text-destructive")}
                >
                  {l.amount < 0 ? `−${naira(-l.amount)}` : naira(l.amount)}
                </span>
              </div>
              <div className="bg-subtle h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    l.amount < 0 ? "bg-destructive/70" : "bg-primary",
                  )}
                  style={{
                    width: seen ? `${(Math.abs(l.amount) / max) * 100}%` : "0%",
                    transitionDelay: `${300 + i * 200}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4 text-xs">
          <div className="bg-background rounded-xl border p-3">
            <p className="text-muted-foreground">October</p>
            <p className="font-heading text-walnut text-base font-extrabold">₦2,610,000</p>
          </div>
          <div className="bg-background rounded-xl border p-3">
            <p className="text-muted-foreground">December (estimate)</p>
            <p className="font-heading text-walnut text-base font-extrabold">₦2,760,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments (C): who has been paid and who is still waiting.
// ---------------------------------------------------------------------------
const PAYEES = [
  { name: "Chinedu O.", amount: 125_000 },
  { name: "Halima B.", amount: 98_000 },
  { name: "Tobi A.", amount: 86_500 },
  { name: "Grace E.", amount: 110_000 },
  { name: "Musa K.", amount: 92_000 },
] as const;

export function PaidScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const step = useCycle(PAYEES.length, 1400, seen);
  const paid = step + 1;
  return (
    <div ref={ref} aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="bg-surface text-foreground rounded-2xl border p-5 shadow-[0_24px_50px_-26px_rgba(43,29,24,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-walnut font-extrabold">Salary day · 25 November</p>
          <SampleTag />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
          <span className="bg-success/10 text-success rounded-full px-2.5 py-1 tabular-nums">
            {paid} paid
          </span>
          <span className="bg-warning/10 text-warning rounded-full px-2.5 py-1 tabular-nums">
            {PAYEES.length - paid} still waiting
          </span>
        </div>
        <ul className="mt-4 grid gap-2">
          {PAYEES.map((p, i) => {
            const isPaid = i < paid;
            return (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted-foreground tabular-nums">{naira(p.amount)}</span>
                <span
                  className={cn(
                    "w-28 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold transition-colors duration-500",
                    isPaid ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                  )}
                >
                  {isPaid ? "Paid" : "Awaiting payment"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-3 text-xs">
          You pay staff the way you already do. WOHKAH keeps the record.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leave: a request arrives, you check the calendar, you approve.
// ---------------------------------------------------------------------------
export function LeaveScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const step = useCycle(3, 1800, seen); // 0 pending · 1 pressing · 2 approved
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const off = new Set([12, 13, 14]);
  const others = new Set([5, 6, 22]);
  return (
    <div ref={ref} aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="bg-surface rounded-2xl border p-4 shadow-[0_24px_50px_-26px_rgba(43,29,24,0.4)]">
        <div className="flex items-center justify-between">
          <p className="font-heading text-walnut font-extrabold">November</p>
          <SampleTag />
        </div>
        <div className="text-muted-foreground mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
          {/* November starts on a Saturday in this sample. */}
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={`b${i}`} />
          ))}
          {days.map((d) => (
            <span
              key={d}
              className={cn(
                "rounded-md py-1.5 transition-colors duration-500",
                off.has(d) && (step === 2 ? "bg-success text-white" : "bg-primary/30 text-walnut"),
                others.has(d) && "bg-sand text-walnut",
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-[11px]">
          <span className="bg-sand mr-1 inline-block size-2 rounded-sm align-middle" /> Already off:
          Grace (5–6), Musa (22)
        </p>
      </div>

      <div className="bg-surface absolute -right-2 -bottom-10 w-64 rounded-2xl border p-4 shadow-[0_24px_50px_-20px_rgba(43,29,24,0.5)] sm:-right-8">
        <p className="text-sm font-semibold">Halima B. · Annual leave</p>
        <p className="text-muted-foreground text-xs">12–14 November · 3 days · 12 days left</p>
        {step < 2 ? (
          <div className="mt-3 flex gap-2">
            <span
              className={cn(
                "bg-primary text-walnut flex-1 rounded-lg py-1.5 text-center text-xs font-bold transition-transform",
                step === 1 && "scale-95",
              )}
            >
              Approve
            </span>
            <span className="flex-1 rounded-lg border py-1.5 text-center text-xs font-semibold">
              Decline
            </span>
          </div>
        ) : (
          <p className="wk-pop bg-success/10 text-success mt-3 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold">
            <CheckIcon className="size-3.5" /> Approved · 9 days left
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks and announcements: instructions given once, done, and read.
// ---------------------------------------------------------------------------
const TASKS = [
  "Open the shop by 8am",
  "Count showroom stock",
  "Deliver Lekki order",
  "Polish dining sets",
] as const;

export function TasksScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const step = useCycle(TASKS.length + 2, 1100, seen);
  const done = Math.min(step, TASKS.length);
  const readBy = useCountUp(14, seen, 2400);
  return (
    <div ref={ref} aria-hidden className="relative mx-auto grid w-full max-w-md gap-4">
      <div className="bg-surface rounded-2xl border p-4 shadow-[0_24px_50px_-26px_rgba(43,29,24,0.4)]">
        <div className="flex items-center justify-between">
          <p className="font-heading text-walnut font-extrabold">Today&apos;s tasks</p>
          <span className="text-muted-foreground text-xs tabular-nums">
            {done} of {TASKS.length} done
          </span>
        </div>
        <ul className="mt-3 grid gap-2">
          {TASKS.map((t, i) => (
            <li key={t} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-300",
                  i < done ? "border-success bg-success text-white" : "border-input",
                )}
              >
                {i < done ? <CheckIcon className="size-3.5" /> : null}
              </span>
              <span
                className={cn(
                  "transition-colors duration-300",
                  i < done && "text-muted-foreground line-through",
                )}
              >
                {t}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-walnut text-sand ml-8 rounded-2xl p-4 shadow-[0_24px_50px_-20px_rgba(43,29,24,0.6)]">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <MegaphoneIcon className="text-primary size-4" /> Announcement
        </p>
        <p className="mt-1 text-sm">We close at 2pm on Friday for the staff end-of-year lunch.</p>
        <p className="text-primary mt-2 text-xs font-semibold tabular-nums">
          Read by {Math.round(readBy)} of 18 staff
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles (available now): name your own roles and choose their access.
// ---------------------------------------------------------------------------
const ROLE_NAMES = ["Cashier", "Head Chef", "Shop Supervisor", "Store Keeper"] as const;
const ACCESS = [
  ["Add and archive branches", true],
  ["Invite people", true],
  ["See the subscription", false],
] as const;

export function RolesScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [word, setWord] = useState(0);
  const [chars, setChars] = useState(0);
  const name = ROLE_NAMES[word]!;

  useEffect(() => {
    if (!seen || reduced) return;
    const typing = chars < name.length;
    const t = setTimeout(
      () => {
        if (typing) setChars((c) => c + 1);
        else {
          setWord((w) => (w + 1) % ROLE_NAMES.length);
          setChars(0);
        }
      },
      typing ? 90 : 1500,
    );
    return () => clearTimeout(t);
  }, [seen, reduced, chars, name.length]);

  const typed = reduced ? name : name.slice(0, chars);
  const created = ROLE_NAMES.slice(0, word);

  return (
    <div ref={ref} aria-hidden className="mx-auto w-full max-w-md">
      <div className="bg-surface text-foreground rounded-2xl p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        <p className="text-muted-foreground text-xs font-medium">Create a role</p>
        <div className="border-primary mt-2 flex h-11 items-center rounded-lg border-2 px-3 text-base font-semibold">
          {typed}
          <span className="wk-caret bg-walnut ml-0.5 inline-block h-5 w-0.5" />
        </div>
        <p className="text-muted-foreground mt-4 text-xs font-medium">What can they do?</p>
        <ul className="mt-2 grid gap-2">
          {ACCESS.map(([label, on]) => (
            <li key={label} className="flex items-center justify-between gap-3 text-sm">
              {label}
              <span
                className={cn(
                  "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                  on ? "bg-primary justify-end" : "bg-subtle justify-start",
                )}
              >
                <span className="size-4 rounded-full bg-white shadow" />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex min-h-7 flex-wrap gap-1.5 border-t pt-3">
          <span className="bg-walnut rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
            Owner
          </span>
          {created.map((r) => (
            <span
              key={r}
              className="wk-pop bg-sand text-walnut rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branches (E): every location side by side.
// ---------------------------------------------------------------------------
const BRANCHES = [
  { name: "Ikeja", lead: "Halima B.", staff: 9, at: 8 },
  { name: "Lekki", lead: "Musa K.", staff: 6, at: 5 },
  { name: "Wuse, Abuja", lead: "Aisha M.", staff: 5, at: 3 },
] as const;

export function BranchesScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const step = useCycle(4, 1500, seen);
  return (
    <div ref={ref} aria-hidden className="relative mx-auto grid w-full max-w-md gap-3">
      <div className="flex items-center justify-between">
        <p className="font-heading text-walnut font-extrabold">Your branches today</p>
        <SampleTag />
      </div>
      {BRANCHES.map((b, i) => {
        const at = step === 0 ? Math.max(0, b.at - 2) : step === 1 ? b.at - 1 : b.at;
        return (
          <div
            key={b.name}
            className={cn(
              "bg-surface text-foreground rounded-2xl border p-4 shadow-[0_18px_40px_-26px_rgba(43,29,24,0.45)] transition-all duration-700",
              seen ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
            )}
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{b.name}</p>
                <p className="text-muted-foreground text-xs">Supervisor: {b.lead}</p>
              </div>
              <p className="font-heading text-walnut text-2xl font-extrabold tabular-nums">
                {at}
                <span className="text-muted-foreground text-sm font-medium">/{b.staff}</span>
              </p>
            </div>
            <div className="bg-subtle mt-3 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-700"
                style={{ width: `${(at / b.staff) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff records (G): one search, everything about a staff member.
// ---------------------------------------------------------------------------
const QUERY = "Halima";

export function RecordsScene() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (!seen || reduced || chars >= QUERY.length) return;
    const t = setTimeout(() => setChars((c) => c + 1), 160);
    return () => clearTimeout(t);
  }, [seen, reduced, chars]);
  const typed = reduced ? QUERY : QUERY.slice(0, chars);
  const found = typed.length === QUERY.length;
  return (
    <div ref={ref} aria-hidden className="mx-auto w-full max-w-md">
      <div className="bg-surface text-foreground rounded-2xl border p-5 shadow-[0_24px_50px_-26px_rgba(43,29,24,0.45)]">
        <div className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
          <span className="text-muted-foreground">Search staff:</span>
          <span className="font-semibold">{typed}</span>
          <span className="wk-caret bg-walnut inline-block h-4 w-0.5" />
        </div>
        <div
          className={cn(
            "mt-4 transition-all duration-500",
            found ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="bg-sand text-walnut flex size-12 items-center justify-center rounded-full font-bold">
              HB
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-walnut font-extrabold">Halima Bello</p>
              <p className="text-muted-foreground text-xs">
                Showroom supervisor · Ikeja · since 2021
              </p>
            </div>
            <SampleTag />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {[
              ["Phone", "0803 *** 4421"],
              ["Next of kin", "Bello Musa"],
              ["Salary", "₦98,000 / month"],
              ["Leave left", "9 days"],
            ].map(([k, v]) => (
              <div key={k} className="bg-background rounded-lg border p-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {["Employment letter.pdf", "Guarantor form.pdf", "ID card.jpg"].map((d) => (
              <li key={d} className="bg-sand text-walnut rounded-full px-2.5 py-1">
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
