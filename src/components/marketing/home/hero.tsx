import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  FileSignatureIcon,
  FingerprintIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { PRIMARY_FEATURES } from "@/lib/copy/features";
import { Reveal } from "./motion";

const delay = (ms: number) => ({ "--wk-delay": `${ms}ms` }) as React.CSSProperties;

/**
 * Homepage hero: an art-directed walnut and gold composition with a phone
 * showing WOHKAH. The section ends at the call to action.
 *
 * The phone shows sample data and says so. Modules that aren't live yet carry
 * the automatic "Soon" label from src/lib/copy/features.ts.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-walnut relative isolate -mt-16 overflow-hidden pt-16 text-white"
    >
      <HeroArt />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pt-12 pb-16 sm:px-8 sm:pt-16 md:pb-20 lg:max-h-[860px] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.08fr_0.92fr] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-6 lg:gap-y-10 lg:px-6 lg:pt-10 lg:pb-24">
        <Reveal className="relative z-10 max-w-[34rem] lg:col-start-1 lg:row-start-1 lg:self-end">
          <p
            data-reveal
            className="text-sand/90 flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase sm:text-xs"
          >
            <span className="bg-primary h-4 w-[3px] rounded-full" aria-hidden />
            Staff management made simple
          </p>

          <h1
            id="hero-heading"
            data-reveal
            style={delay(80)}
            className="font-heading mt-7 text-[2.55rem] leading-[1.04] tracking-[-0.025em] text-balance sm:text-[3.4rem] lg:text-[3.85rem]"
          >
            <span className="text-ivory block font-semibold">
              Running a business is already hard.
            </span>
            <span className="text-primary mt-1 block font-extrabold [text-shadow:0_0_40px_rgba(214,158,0,0.25)]">
              Managing your staff shouldn&rsquo;t make it harder.
            </span>
          </h1>

          <p
            data-reveal
            style={delay(160)}
            className="text-sand/75 mt-6 max-w-[30rem] text-[15px] leading-7 sm:text-base sm:leading-7"
          >
            From tracking attendance and managing leave to working out salaries and keeping your
            team organised, WOHKAH takes the stress out of managing your staff.
          </p>
        </Reveal>

        {/* One phone: between the words and the button on phones, on the right on desktop. */}
        <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <PhonePreview />
        </div>

        <Reveal className="relative z-10 lg:col-start-1 lg:row-start-2 lg:self-start">
          <div data-reveal style={delay(240)}>
            <Link
              href="/register"
              className="group bg-primary text-walnut hover:bg-primary/90 focus-visible:ring-primary/50 focus-visible:ring-offset-walnut inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-8 text-base font-bold shadow-[0_18px_40px_-12px_rgba(214,158,0,0.55)] transition-[transform,background-color] outline-none hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-offset-2 sm:w-auto"
            >
              Create your free account
              <ArrowRightIcon
                className="size-5 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Background: walnut and espresso gradients, golden light, flowing shapes
// ---------------------------------------------------------------------------
function HeroArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Depth: espresso to walnut, lit from the top right. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_10%,#5a3d1e_0%,#42332b_32%,#2b1d18_62%,#1e1411_100%)]" />
      {/* Warm golden light. */}
      <div className="absolute -top-40 right-[-20%] size-[46rem] rounded-full bg-[radial-gradient(circle,rgba(214,158,0,0.55)_0%,rgba(214,158,0,0.18)_35%,transparent_70%)] blur-2xl sm:right-[-8%]" />
      <div className="absolute bottom-[-30%] left-[-25%] size-[38rem] rounded-full bg-[radial-gradient(circle,rgba(214,158,0,0.28)_0%,transparent_65%)] blur-3xl" />
      {/* Flowing shapes. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wk-arc-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5b818" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#d69e00" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d69e00" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wk-arc-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d69e00" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d69e00" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wk-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4e8cf" stopOpacity="0" />
            <stop offset="50%" stopColor="#f4e8cf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f4e8cf" stopOpacity="0" />
          </linearGradient>
          <filter id="wk-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <path
          d="M1200 140 C 980 170, 760 330, 700 560 C 650 760, 760 900, 860 900 L 1200 900 Z"
          fill="url(#wk-arc-a)"
          opacity="0.55"
          filter="url(#wk-soft)"
        />
        <path
          d="M1200 300 C 1020 330, 880 470, 860 640 C 845 780, 920 900, 960 900 L 1200 900 Z"
          fill="url(#wk-arc-b)"
          opacity="0.7"
        />
        <path
          d="M-40 760 C 260 640, 520 700, 760 860"
          stroke="url(#wk-line)"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M-40 820 C 300 700, 600 760, 900 900"
          stroke="url(#wk-line)"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M620 -20 C 760 120, 980 160, 1220 110"
          stroke="url(#wk-line)"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </svg>
      {/* Fine grain so the gradients don't band. */}
      <div className="[background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      {/* Settle into the next section. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#1e1411]/40" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The phone
// ---------------------------------------------------------------------------
const live = (key: string) => PRIMARY_FEATURES.find((f) => f.key === key)?.available === true;

function PhonePreview() {
  const rows = [
    { label: "People", icon: UsersIcon, soon: false },
    { label: "Contracts", icon: FileSignatureIcon, soon: false },
    { label: "Attendance", icon: FingerprintIcon, soon: !live("attendance") },
    { label: "Salaries", icon: WalletIcon, soon: !live("salaries") },
  ];
  return (
    <figure className="relative mx-auto w-[min(100%,252px)] sm:w-[290px] lg:w-[316px]">
      {/* Glow and floor reflection. */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle,rgba(214,158,0,0.45)_0%,transparent_65%)] blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-8 left-1/2 h-10 w-[85%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(245,184,24,0.55)_0%,transparent_70%)] blur-md"
      />

      <div className="wk-float">
        <div className="[transform:perspective(1400px)_rotateY(-16deg)_rotateX(6deg)_rotate(5deg)] motion-reduce:[transform:rotate(3deg)]">
          {/* Frame */}
          <div className="rounded-[2.9rem] bg-[linear-gradient(145deg,#6b5442,#2b1d18_35%,#120c0a_70%,#5a4434)] p-[3px] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)]">
            <div className="rounded-[2.75rem] bg-[#0d0907] p-[9px]">
              {/* Screen */}
              <div
                className="relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(180deg,#3a2a20_0%,#241812_45%,#1a120e_100%)] px-4 pt-3 pb-5 text-[#faf8f2]"
                role="img"
                aria-label="WOHKAH on a phone, showing sample data: 12 staff working, 3 on leave, and links to People, Contracts, Attendance and Salaries."
              >
                <div aria-hidden>
                  {/* Status bar and island */}
                  <div className="flex items-center justify-between px-2 text-[10px] font-semibold">
                    <span>9:41</span>
                    <span className="h-[18px] w-[76px] rounded-full bg-black" />
                    <span className="flex items-center gap-0.5">
                      <span className="h-2 w-[2px] rounded-sm bg-current" />
                      <span className="h-2.5 w-[2px] rounded-sm bg-current" />
                      <span className="h-3 w-[2px] rounded-sm bg-current" />
                      <span className="ml-1 h-2.5 w-4 rounded-[3px] border border-current" />
                    </span>
                  </div>

                  {/* App bar */}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="bg-primary text-walnut font-heading flex size-6 items-center justify-center rounded-md text-[13px] font-extrabold">
                        W
                      </span>
                      <span className="font-heading text-[13px] font-extrabold tracking-wide">
                        WOHKAH
                      </span>
                    </span>
                    <BellIcon className="size-4 opacity-80" />
                  </div>

                  <div className="mt-6 flex items-baseline justify-between">
                    <p className="font-heading text-[17px] font-bold">Team overview</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/70">
                      Sample data
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="from-primary rounded-2xl bg-gradient-to-br to-[#f5c64a] p-3 text-[#2b1d18] shadow-[0_10px_24px_-10px_rgba(214,158,0,0.8)]">
                      <UsersIcon className="size-4" />
                      <p className="font-heading mt-2 text-[28px] leading-none font-extrabold">
                        12
                      </p>
                      <p className="mt-1 text-[10px] font-semibold">Working</p>
                    </div>
                    <div className="rounded-2xl bg-[linear-gradient(145deg,#6b4f3a,#42332b)] p-3">
                      <CalendarCheckIcon className="size-4 opacity-90" />
                      <p className="font-heading mt-2 text-[28px] leading-none font-extrabold">3</p>
                      <p className="mt-1 text-[10px] font-semibold opacity-90">On leave</p>
                    </div>
                  </div>

                  {/* Sections */}
                  <ul className="mt-4 grid gap-2">
                    {rows.map((r) => (
                      <li
                        key={r.label}
                        className="flex items-center gap-2.5 rounded-xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/[0.06]"
                      >
                        <r.icon className="size-4 opacity-85" />
                        <span className="flex-1 text-[12px] font-medium">{r.label}</span>
                        {r.soon ? (
                          <span className="text-primary rounded-full bg-[#d69e00]/15 px-1.5 py-0.5 text-[8.5px] font-semibold">
                            Soon
                          </span>
                        ) : (
                          <ChevronRightIcon className="size-3.5 opacity-60" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Glass reflection */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_38%)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-sand/55 mt-9 text-center text-[11px]">
        Preview with sample data.
      </figcaption>
    </figure>
  );
}
