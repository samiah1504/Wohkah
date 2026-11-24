import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  CalendarCheckIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  HomeIcon,
  LayoutGridIcon,
  FileSignatureIcon,
  FingerprintIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { PRIMARY_FEATURES } from "@/lib/copy/features";
import { HeroArt } from "./hero-art";
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
      className="relative isolate -mt-16 overflow-hidden bg-[#2B1D18] pt-16 text-white"
    >
      <HeroArt />
      {/*
        Each size has its own composition:
        - phones (< 768px): label across the top; headline and paragraph on the left
          with the full phone beside them on the right; then the button.
        - tablets (768–1023px): two columns, words and button left, phone right.
        - laptops and desktops (1024px+): the full side-by-side composition.
      */}
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] gap-x-0 px-6 pt-10 pb-16 sm:gap-x-8 sm:px-10 sm:pt-14 md:grid-rows-[1fr_auto_auto_auto_auto_1fr] md:gap-x-10 md:pt-12 md:pr-12 md:pb-20 md:pl-8 lg:max-h-[900px] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-x-12 lg:px-6 lg:pt-6 xl:gap-x-16">
        <Reveal className="relative z-10 col-span-2 row-start-1 md:col-span-1 md:col-start-1 md:row-start-2">
          <p
            data-reveal
            className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.16em] text-white uppercase min-[390px]:text-[10.5px] sm:gap-3 sm:text-xs sm:tracking-[0.22em]"
          >
            <span
              className="bg-primary h-3.5 w-[3px] shrink-0 rounded-full shadow-[0_0_12px_rgba(255,190,70,0.8)] sm:h-4"
              aria-hidden
            />
            Staff management made simple
          </p>
        </Reveal>

        <Reveal className="relative z-10 col-start-1 row-start-2 mt-6 md:row-start-3 md:mt-6">
          <h1
            id="hero-heading"
            data-reveal
            style={delay(80)}
            className="font-heading pr-3 text-[clamp(1.36rem,6.25vw,1.8rem)] leading-[1.13] tracking-[-0.02em] min-[420px]:pr-7 sm:pr-0 sm:text-[2.6rem] sm:leading-[1.05] md:max-w-[26rem] md:text-[2.85rem] md:text-balance lg:max-w-[34rem] lg:text-[3.2rem] xl:max-w-[36rem] xl:text-[3.6rem]"
          >
            <span className="block font-bold text-white md:font-semibold">
              Running a business is already hard.
            </span>
            <span className="mt-0.5 block font-extrabold text-[#FFC629] [text-shadow:0_0_32px_rgba(255,198,41,0.22)] md:mt-1">
              Managing your staff shouldn&rsquo;t make it harder.
            </span>
          </h1>
        </Reveal>

        <Reveal className="relative z-10 col-start-1 row-start-3 md:row-start-4">
          <p
            data-reveal
            style={delay(160)}
            className="mt-4 pr-8 text-[12.5px] leading-[1.55] text-white min-[390px]:mt-5 min-[390px]:pr-9 min-[420px]:text-[13px] sm:mt-6 sm:pr-0 sm:text-base sm:leading-7 md:max-w-[25rem] lg:max-w-[28rem] xl:max-w-[30rem] xl:text-[17px] xl:leading-8"
          >
            From tracking attendance and managing leave to working out salaries and keeping your
            team organised, WOHKAH takes the stress out of managing your staff.
          </p>
        </Reveal>

        {/* The full phone, beside the words at every size. */}
        <div className="relative col-start-2 row-span-2 row-start-2 mt-2 -ml-4 self-start justify-self-end min-[390px]:-ml-5 sm:ml-0 md:row-span-6 md:row-start-1 md:mt-0 md:self-center md:justify-self-center">
          <PhonePreview />
        </div>

        <Reveal className="relative z-20 col-span-2 row-start-4 mt-6 sm:mt-8 md:col-span-1 md:col-start-1 md:row-start-5 md:mt-9">
          <div data-reveal style={delay(240)}>
            <Link
              href="/register"
              className="group bg-primary text-walnut hover:bg-primary/90 focus-visible:ring-primary/50 inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-bold shadow-[0_18px_44px_-12px_rgba(255,170,30,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] transition-[transform,background-color] outline-none hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B1D18] min-[390px]:px-5 min-[390px]:text-[13.5px] sm:h-14 sm:rounded-2xl sm:px-8 sm:text-base"
            >
              Create your free account
              <ArrowRightIcon
                className="size-[18px] transition-transform group-hover:translate-x-1 sm:size-5"
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
    <figure className="relative [--s:0.47] [--tilt:perspective(1400px)_rotateY(-7deg)_rotateX(3deg)_rotate(3deg)] min-[375px]:[--s:0.49] min-[390px]:[--s:0.51] min-[420px]:[--s:0.55] sm:[--s:0.7] md:[--s:0.74] md:[--tilt:perspective(1400px)_rotateY(-16deg)_rotateX(6deg)_rotate(5deg)] lg:[--s:0.92] xl:[--s:1.02] 2xl:[--s:1.1]">
      {/* Golden light behind the phone: a wide haze, a warm core and a bright centre. */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -z-10 size-[calc(900px*var(--s))] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,198,41,0.26)_0%,rgba(214,158,0,0.1)_45%,transparent_100%)] blur-2xl"
      />
      <div
        aria-hidden
        className="absolute top-[46%] left-[58%] -z-10 size-[calc(420px*var(--s))] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,217,120,0.45)_0%,rgba(255,198,41,0.16)_50%,transparent_100%)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -z-10 h-[calc(760px*var(--s))] w-[calc(170px*var(--s))] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] rounded-full bg-[linear-gradient(180deg,transparent,rgba(255,200,110,0.22),transparent)] blur-2xl"
      />
      {/* Floor reflection. */}
      <div
        aria-hidden
        className="absolute bottom-[calc(-26px*var(--s))] left-1/2 h-[calc(46px*var(--s))] w-[115%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,217,120,0.6)_0%,rgba(255,198,41,0.18)_50%,transparent_100%)] blur-md"
      />

      <div className="relative h-[calc(640px*var(--s))] w-[calc(300px*var(--s))]">
        <div className="absolute top-0 left-0 w-[300px] origin-top-left [transform:scale(var(--s))]">
          <div className="wk-float">
            <div className="[transform:var(--tilt)] motion-reduce:[transform:rotate(3deg)]">
              {/* Frame */}
              <div className="rounded-[2.9rem] bg-[linear-gradient(145deg,#c89a55,#4a3526_18%,#160f0b_45%,#0e0907_70%,#8a6438)] p-[3px] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),-14px_-6px_50px_-18px_rgba(255,180,60,0.55),18px_10px_60px_-20px_rgba(255,160,40,0.35)]">
                <div className="rounded-[2.75rem] bg-[#0d0907] p-[9px]">
                  {/* Screen */}
                  <div
                    className="relative h-[612px] overflow-hidden rounded-[2.2rem] bg-[linear-gradient(180deg,#33251b_0%,#1f1610_45%,#150f0b_100%)] px-4 pt-3 pb-5 text-[#faf8f2]"
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
                          <p className="font-heading mt-2 text-[28px] leading-none font-extrabold">
                            3
                          </p>
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
                    {/* The app's own bottom bar */}
                    <div
                      aria-hidden
                      className="absolute inset-x-3 bottom-3 flex items-center justify-around rounded-2xl bg-black/35 px-2 py-2.5 ring-1 ring-white/[0.06] backdrop-blur"
                    >
                      {[
                        [HomeIcon, "Home", true],
                        [UsersIcon, "People", false],
                        [WalletIcon, "Salary", false],
                        [ClipboardCheckIcon, "Work", false],
                        [LayoutGridIcon, "More", false],
                      ].map(([Icon, label, on]) => {
                        const I = Icon as typeof HomeIcon;
                        return (
                          <span
                            key={label as string}
                            className={`flex flex-col items-center gap-1 text-[8.5px] font-semibold ${on ? "text-primary" : "text-white/55"}`}
                          >
                            <I className="size-[15px]" />
                            {label as string}
                          </span>
                        );
                      })}
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
        </div>
      </div>
      <figcaption className="relative z-10 mx-auto mt-[calc(30px*var(--s))] w-fit rounded-full bg-[#2B1D18]/80 px-2.5 py-0.5 text-center text-[9.5px] text-white/75 backdrop-blur-sm sm:text-[11px]">
        Preview with sample data.
      </figcaption>
    </figure>
  );
}
