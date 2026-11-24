/**
 * Hero artwork: sculptural metallic-gold ribbons on deep walnut (#2B1D18).
 *
 * Drawn as SVG so it stays sharp and light (no image download). The ribbons
 * are filled with layered metallic gradients (deep amber → #D69E00 → #FFC629 →
 * #FFD978 highlights) and carry fine lit edges, light trails, glints and soft
 * cast shadows. They sweep behind the phone's lower half and along the
 * bottom/right; the top-right corner stays dark walnut.
 *
 * Two compositions: one drawn for phones (the phone sits right of the text,
 * under the label) and one for tablets and desktops (the phone in the right
 * column). Both are anchored to where the phone actually is.
 */

const GOLD = "#D69E00";
const BRIGHT = "#FFC629";
const SHINE = "#FFD978";

/** Shared gradient and filter definitions, namespaced per scene. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      {/* Across a ribbon: lit top edge, bright face, deep amber fold, darker underside. */}
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.15" y2="1">
        <stop offset="0" stopColor={SHINE} />
        <stop offset="0.1" stopColor={BRIGHT} />
        <stop offset="0.32" stopColor={GOLD} />
        <stop offset="0.55" stopColor="#7a4c00" />
        <stop offset="0.72" stopColor="#b98200" />
        <stop offset="0.86" stopColor="#5a3800" />
        <stop offset="1" stopColor="#2b1a06" />
      </linearGradient>
      <linearGradient id={`${id}-metal-soft`} x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0" stopColor={BRIGHT} />
        <stop offset="0.3" stopColor={GOLD} />
        <stop offset="0.7" stopColor="#6b4200" />
        <stop offset="1" stopColor="#2b1a06" />
      </linearGradient>
      {/* Along a ribbon: highlights that slide across the curved surface. */}
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={SHINE} stopOpacity="0" />
        <stop offset="0.38" stopColor={SHINE} stopOpacity="0" />
        <stop offset="0.5" stopColor="#FFF1C4" stopOpacity="0.75" />
        <stop offset="0.6" stopColor={SHINE} stopOpacity="0" />
        <stop offset="0.78" stopColor={SHINE} stopOpacity="0.35" />
        <stop offset="0.86" stopColor={SHINE} stopOpacity="0" />
      </linearGradient>
      {/* Ribbons fade into the walnut where they enter from the left. */}
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.28" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
      </linearGradient>
      <mask id={`${id}-fade-mask`} maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill={`url(#${id}-fade)`} />
      </mask>
      {/* Light trails: bright in the middle, gone at both ends. */}
      <linearGradient id={`${id}-trail`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={SHINE} stopOpacity="0" />
        <stop offset="0.45" stopColor="#FFF3CF" stopOpacity="0.95" />
        <stop offset="0.7" stopColor={BRIGHT} stopOpacity="0.6" />
        <stop offset="1" stopColor={BRIGHT} stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-bloom`} x="-30%" y="-60%" width="160%" height="220%">
        <feGaussianBlur stdDeviation="28" />
      </filter>
      <filter id={`${id}-soft`} x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={`${id}-glint`} x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
    </defs>
  );
}

/** A metallic ribbon: cast shadow, bloom, metal body, sheen and a lit edge. */
function Ribbon({
  id,
  d,
  edge,
  soft = false,
  bloom = 0.55,
  fade = true,
}: {
  id: string;
  d: string;
  edge?: string;
  soft?: boolean;
  bloom?: number;
  fade?: boolean;
}) {
  const mask = fade ? `url(#${id}-fade-mask)` : undefined;
  return (
    <g mask={mask}>
      {/* Shadow cast onto the walnut beneath the ribbon. */}
      <path
        d={d}
        fill="#120b08"
        opacity="0.55"
        transform="translate(0 18)"
        filter={`url(#${id}-soft)`}
      />
      {/* Light thrown by the gold onto its surroundings (follows the ribbon, not a circle). */}
      <path d={d} fill={BRIGHT} opacity={bloom} filter={`url(#${id}-bloom)`} />
      <path d={d} fill={`url(#${id}-${soft ? "metal-soft" : "metal"})`} />
      <path d={d} fill={`url(#${id}-sheen)`} style={{ mixBlendMode: "screen" }} />
      {edge ? (
        <>
          <path
            d={edge}
            fill="none"
            stroke={SHINE}
            strokeWidth="5"
            opacity="0.5"
            filter={`url(#${id}-glint)`}
          />
          <path
            d={edge}
            fill="none"
            stroke="#FFF4D6"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.95"
          />
        </>
      ) : null}
    </g>
  );
}

function Glint({ id, x, y, r = 2.4 }: { id: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 3} fill={SHINE} opacity="0.45" filter={`url(#${id}-glint)`} />
      <circle cx={x} cy={y} r={r} fill="#FFF8E6" />
      <path
        d={`M${x - r * 7} ${y} H${x + r * 7} M${x} ${y - r * 4} V${y + r * 4}`}
        stroke="#FFF1C4"
        strokeWidth="0.8"
        opacity="0.7"
      />
    </g>
  );
}

/** Tablets and desktops (designed at 1440×900; the phone sits around x 845–1210). */
function DesktopScene() {
  const id = "wkd";
  // Main ribbon: rises from the lower left, passes behind the phone's lower half,
  // and leaves the right edge at mid-height (well below the top-right corner).
  const main =
    "M180 900 C 470 770, 720 640, 930 600 C 1120 563, 1290 590, 1440 548 L 1440 640 C 1300 676, 1150 668, 975 694 C 760 726, 520 836, 380 900 Z";
  const mainEdge = "M470 770 C 720 640, 930 600, 1060 582 C 1200 562, 1320 585, 1440 548";
  // A second, deeper ribbon folding under the first, lower right.
  const under =
    "M1440 712 C 1290 700, 1130 752, 990 800 C 850 848, 760 900, 700 900 L 860 900 C 980 872, 1120 838, 1260 812 C 1350 796, 1410 790, 1440 792 Z";
  const underEdge = "M760 900 C 900 840, 1070 778, 1220 744 C 1330 718, 1400 712, 1440 712";
  // A thin blade along the bottom left, under the button.
  const blade = "M0 838 C 170 800, 330 808, 470 858 L 452 874 C 320 830, 170 826, 0 866 Z";
  return (
    <svg
      className="absolute inset-0 h-full w-full max-md:hidden"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs id={id} />
      <Ribbon id={id} d={under} edge={underEdge} soft bloom={0.35} fade={false} />
      <Ribbon id={id} d={main} edge={mainEdge} bloom={0.6} />
      <Ribbon id={id} d={blade} soft bloom={0.18} />
      {/* Light trails following the forms. */}
      <path
        d="M620 700 C 820 640, 1000 622, 1180 618 C 1300 615, 1390 600, 1440 590"
        fill="none"
        stroke={`url(#${id}-trail)`}
        strokeWidth="1.2"
        opacity="0.8"
      />
      <path
        d="M560 900 C 760 812, 980 760, 1200 742"
        fill="none"
        stroke={`url(#${id}-trail)`}
        strokeWidth="0.9"
        opacity="0.55"
      />
      {/* A reflective floor line under the phone. */}
      <path
        d="M840 852 C 960 840, 1100 842, 1240 856"
        fill="none"
        stroke={SHINE}
        strokeWidth="2"
        opacity="0.55"
        filter={`url(#${id}-soft)`}
      />
      <Glint id={id} x={1062} y={582} />
      <Glint id={id} x={1236} y={741} r={1.8} />
    </svg>
  );
}

/** Phones (designed at 390×640; the phone sits around x 205–375, y 125–485). */
function PhoneScene() {
  const id = "wkm";
  const main =
    "M-20 640 C 80 560, 190 470, 290 430 C 335 412, 370 404, 400 392 L 400 446 C 366 456, 330 466, 296 484 C 200 534, 110 600, 60 640 Z";
  const mainEdge = "M60 575 C 150 500, 220 452, 290 430 C 335 412, 370 404, 400 392";
  const under =
    "M400 520 C 330 520, 260 552, 200 590 C 168 610, 150 626, 140 640 L 210 640 C 240 610, 290 582, 340 566 C 365 558, 385 556, 400 556 Z";
  const underEdge = "M165 640 C 210 590, 280 548, 340 532 C 365 525, 385 522, 400 520";
  return (
    <svg
      className="absolute inset-0 h-full w-full md:hidden"
      viewBox="0 0 390 640"
      preserveAspectRatio="xMidYMax slice"
    >
      <Defs id={id} />
      <Ribbon id={id} d={under} edge={underEdge} soft bloom={0.3} fade={false} />
      <Ribbon id={id} d={main} edge={mainEdge} bloom={0.55} />
      <path
        d="M120 560 C 200 500, 280 468, 400 452"
        fill="none"
        stroke={`url(#${id}-trail)`}
        strokeWidth="0.8"
        opacity="0.7"
      />
      <path
        d="M206 506 C 250 500, 310 500, 372 508"
        fill="none"
        stroke={SHINE}
        strokeWidth="1.4"
        opacity="0.5"
        filter={`url(#${id}-glint)`}
      />
      <Glint id={id} x={292} y={430} r={1.6} />
    </svg>
  );
}

export function HeroArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[#2B1D18]">
      <DesktopScene />
      <PhoneScene />
      {/* Keep the top-right corner and the edges deep walnut. */}
      <div className="absolute inset-0 bg-[linear-gradient(215deg,rgba(18,11,8,0.55)_0%,rgba(18,11,8,0.15)_22%,transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(140%_100%_at_50%_45%,transparent_60%,rgba(18,11,8,0.45)_100%)]" />
      {/* Fine grain so the gold reads as a surface, not a flat fill. */}
      <div className="[background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] absolute inset-0 opacity-[0.06] mix-blend-overlay" />
    </div>
  );
}
