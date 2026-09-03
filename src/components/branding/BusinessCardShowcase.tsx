import { COMPANY_INFO, SERVICES, STATS, SUPPORT } from "@/lib/constants"

/**
 * Print proof for the MOO-format business card.
 *
 * The page chrome around the proof is on the site's tokens like every other
 * marketing surface. The two card faces are NOT: they are a facsimile of what
 * the printer receives, so their colours live in one INK map below and must
 * match the artwork in /public/branding, not the marketing palette. That is
 * why this file stays out of the token-lint scope list.
 *
 * The front/back toggle is gone: it duplicated both faces in the DOM (the
 * "Full Preview" grid rendered them a second time) purely to hide one of them,
 * which is the only reason this component was a client component at all. Both
 * faces now render once, side by side, with no JavaScript.
 */

/** print artwork — exact ink */
const INK = {
  navy: "#17181B",
  orange: "#FF9500",
  cardFront: "#1a1f2e",
  skyTop: "#0a1628",
  skyMid: "#0f2744",
  skyBottom: "#1a3a5c",
  /** Horizon haze, already at its 30% print value. */
  horizonGlow: "#2a4a6a4d",
  road: "#1c1c1c",
  lane: "#FFB340",
  trailerTop: "#FF9500",
  trailerBottom: "#E07800",
  trailerEdge: "#CC7700",
  cabTop: "#FFa520",
  cabBottom: "#E68600",
  cabSheen: "#FFD080",
  headlight: "#FFEEBB",
  tailLight: "#FF3333",
  glass: "#0a1628",
  glassEdge: "#ffffff2e",
  glassSheen: "#ffffff0d",
  groundShadow: "#00000033",
  deck: "#333",
  chrome: "#777",
  chromeDark: "#555",
  chromeLight: "#888",
  tyre: "#1a1a1a",
  tyreRim: "#444",
  tyreInner: "#222",
  tyreHub: "#2a2a2a",
} as const

// Only the tagline and website are card-specific; the rest shadowed
// COMPANY_INFO with a second copy of the same three facts.
const CARD = {
  owner: COMPANY_INFO.owner,
  tagline: "THE TRUCK ROLLS. THE OFFICE NEVER SLEEPS.",
  phone: COMPANY_INFO.phone,
  email: COMPANY_INFO.email,
  website: "thindtransport.com",
}

function MiniTruck() {
  return (
    <svg viewBox="0 0 28 14" fill="currentColor" className="h-auto w-[3.2%]">
      <rect x="0" y="3" width="16" height="8" rx="1" />
      <path d="M16 5h5l3 4v2h-8V5z" />
      <circle cx="5" cy="12.5" r="1.8" />
      <circle cx="21" cy="12.5" r="1.8" />
    </svg>
  )
}

function CardFront() {
  return (
    <div
      className="relative aspect-[3.46/2.32] w-full overflow-hidden rounded-m-3 shadow-m-e5"
      style={{ containerType: "inline-size", backgroundColor: INK.cardFront }}
    >
      <div className="absolute right-0 top-0 h-[65%] w-[40%]">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `linear-gradient(to bottom left, ${INK.orange}0f, transparent)` }}
        />
        <div
          className="absolute left-0 top-0 h-full w-0.5 origin-top-left rotate-[20deg]"
          style={{ backgroundColor: `${INK.orange}33` }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Main content: left text, right QR */}
        <div className="flex flex-1 justify-between p-[6%] pb-[2%]">
          {/* Left column */}
          <div className="flex min-w-0 flex-1 flex-col justify-between pr-[5%]">
            <div>
              <p className="font-extrabold leading-tight text-white" style={{ fontSize: "clamp(1rem, 3.8cqi, 1.8rem)" }}>Owner / Dispatcher:</p>
              <h3 className="mt-[0.15em] font-black leading-none tracking-tight text-white" style={{ fontSize: "clamp(1.2rem, 5cqi, 2.4rem)" }}>[{CARD.owner}]</h3>
            </div>

            <div className="mt-auto" style={{ fontSize: "clamp(0.7rem, 2.6cqi, 1.2rem)" }}>
              <p className="leading-[1.7]">
                <span className="font-bold" style={{ color: INK.orange }}>Cell: </span>
                <span className="text-white">{CARD.phone}</span>
              </p>
              <p className="leading-[1.7]">
                <span className="font-bold" style={{ color: INK.orange }}>Email: </span>
                <span className="text-white">{CARD.email}</span>
              </p>
              <p className="leading-[1.7]">
                <span className="font-bold" style={{ color: INK.orange }}>Website: </span>
                <span className="text-white">{CARD.website}</span>
              </p>
            </div>
          </div>

          {/* Right column: QR */}
          <div className="flex w-[28%] flex-shrink-0 flex-col items-end">
            <p className="mb-[4%] text-right font-semibold tracking-wide text-white/70" style={{ fontSize: "clamp(0.5rem, 1.8cqi, 0.85rem)" }}>to website</p>
            <div className="aspect-square w-full rounded-m-1 bg-white p-[6%] shadow-m-e3">
              <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-[1px] bg-white p-[5%]">
                <QRPattern />
              </div>
            </div>
          </div>
        </div>

        {/* Orange bar */}
        <div className="px-[6%] py-[2.5%]" style={{ backgroundColor: INK.orange }}>
          <p className="text-center font-extrabold tracking-wide text-navy" style={{ fontSize: "clamp(0.55rem, 2cqi, 0.95rem)" }}>
            {`${SUPPORT.hours} Dispatch • ${SERVICES.types[2]} • ${SERVICES.types[1]} • ${SERVICES.types[0]} • Serving ${STATS.statesCovered} States`}
          </p>
          <div className="mt-[0.4%] flex items-center justify-center gap-[2%]">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="flex items-center gap-[1%]">
                <MiniTruck />
                {i < 9 && <span className="text-navy/30" style={{ fontSize: "clamp(0.35rem, 1.2cqi, 0.55rem)" }}>&rarr;</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div
      className="relative aspect-[3.46/2.32] w-full overflow-hidden rounded-m-3 shadow-m-e5"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(to bottom, ${INK.skyTop}, ${INK.skyMid}, ${INK.skyBottom})` }}
      />

      <div
        className="absolute bottom-[20%] left-0 right-0 h-[25%]"
        style={{ backgroundImage: `linear-gradient(to top, ${INK.horizonGlow}, transparent)` }}
      />
      <div
        className="absolute bottom-[18%] left-1/2 h-[6%] w-[140%] -translate-x-1/2 rounded-full blur-2xl"
        style={{ backgroundColor: `${INK.orange}0d` }}
      />

      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { x: 6, y: 4, o: 0.5 }, { x: 14, y: 9, o: 0.25 }, { x: 21, y: 2, o: 0.45 },
          { x: 33, y: 6, o: 0.35 }, { x: 44, y: 2, o: 0.6 }, { x: 54, y: 8, o: 0.25 },
          { x: 61, y: 1, o: 0.4 }, { x: 71, y: 5, o: 0.35 }, { x: 79, y: 3, o: 0.5 },
          { x: 87, y: 8, o: 0.25 }, { x: 92, y: 2, o: 0.4 }, { x: 49, y: 4, o: 0.3 },
        ].map((s, i) => (
          <div key={i} className="absolute h-[1px] w-[1px] rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o }} />
        ))}
      </div>

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[28%]">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0 L1000 300 L0 300Z" fill={INK.road} />
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0" stroke={INK.orange} strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M0 170 Q250 140 500 130 Q750 120 1000 105" stroke={INK.lane} strokeWidth="2" strokeDasharray="40 25" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Top: Company name */}
        <div className="px-[5%] pt-[4%] text-center">
          <h3 className="font-black leading-none tracking-tight text-white" style={{ fontSize: "clamp(1.3rem, 5.5cqi, 2.3rem)" }}>
            THIND <span style={{ color: INK.orange }}>TRANSPORT</span>
          </h3>
          <div
            className="mx-auto mt-[1.5%] h-0.5 w-[30%] rounded-full"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${INK.orange}, transparent)`,
            }}
          />
          <p className="mt-[1%] font-medium tracking-[0.35em] text-white/35" style={{ fontSize: "clamp(0.4rem, 1.4cqi, 0.6rem)" }}>{CARD.tagline}</p>
        </div>

        {/* Center: Truck scene */}
        <div className="relative flex flex-1 items-center justify-center">
          <TruckScene />
        </div>

        {/* Bottom: Orange bar */}
        <div
          className="flex items-center justify-between px-[5%] py-[2%]"
          style={{ backgroundColor: INK.orange }}
        >
          <div className="flex items-center gap-[2%] text-navy" style={{ fontSize: "clamp(0.4rem, 1.4cqi, 0.6rem)" }}>
            <span className="font-extrabold tracking-wider">{SERVICES.types[0].toUpperCase()}</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">{SERVICES.types[2].toUpperCase()}</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">{SERVICES.types[1].toUpperCase()}</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">{`${STATS.statesCovered} STATES`}</span>
          </div>
          <span className="font-bold tracking-wider text-navy/60" style={{ fontSize: "clamp(0.35rem, 1.2cqi, 0.55rem)" }}>{CARD.website.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}

function TruckScene() {
  return (
    <svg viewBox="0 0 600 220" className="w-[90%]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.trailerTop} />
          <stop offset="100%" stopColor={INK.trailerBottom} />
        </linearGradient>
        <linearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.cabTop} />
          <stop offset="100%" stopColor={INK.cabBottom} />
        </linearGradient>
        <linearGradient id="headlightGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={INK.headlight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={INK.headlight} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Subtle ground plane connecting all zones */}
      <line x1="0" y1="170" x2="600" y2="170" stroke="white" strokeWidth="0.5" opacity="0.06" />

      {/* === LEFT ZONE: ORIGIN / OPERATIONS === */}

      {/* Warehouse */}
      <g opacity="0.15" transform="translate(10, 70)">
        <rect x="0" y="22" width="85" height="58" rx="2" fill="white" />
        <path d="M-4 22 L42.5 0 L89 22" fill="white" />
        <rect x="8" y="50" width="28" height="30" rx="1.5" fill="white" opacity="0.35" />
        <rect x="44" y="50" width="28" height="30" rx="1.5" fill="white" opacity="0.35" />
      </g>

      {/* Forklift with operator */}
      <g opacity="0.16" transform="translate(105, 110)">
        <rect x="0" y="12" width="22" height="16" rx="3" fill="white" />
        <rect x="20" y="0" width="4" height="30" rx="1" fill="white" />
        <rect x="17" y="2" width="10" height="4" rx="1" fill="white" />
        <rect x="16" y="-6" width="12" height="10" rx="1.5" fill="white" opacity="0.5" />
        <circle cx="6" cy="32" r="4" fill="white" />
        <circle cx="17" cy="32" r="4" fill="white" />
        <circle cx="9" cy="6" r="5" fill="white" />
        <rect x="6" y="11" width="6" height="4" rx="2" fill="white" />
      </g>

      {/* Dispatcher at desk */}
      <g opacity="0.14" transform="translate(20, 32)">
        <rect x="0" y="22" width="34" height="4" rx="1" fill="white" />
        <rect x="3" y="26" width="4" height="12" rx="1" fill="white" />
        <rect x="27" y="26" width="4" height="12" rx="1" fill="white" />
        <rect x="5" y="8" width="20" height="14" rx="2" fill="white" />
        <rect x="13" y="22" width="4" height="3" rx="0.5" fill="white" />
        <circle cx="42" cy="14" r="6" fill="white" />
        <rect x="37" y="20" width="10" height="10" rx="3" fill="white" />
        <line x1="37" y1="24" x2="28" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Worker pushing hand truck */}
      <g opacity="0.14" transform="translate(150, 104)">
        <circle cx="8" cy="0" r="5.5" fill="white" />
        <rect x="4" y="6" width="8" height="16" rx="3" fill="white" />
        <line x1="6" y1="22" x2="2" y2="34" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="10" y1="22" x2="15" y2="34" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="12" x2="22" y2="10" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="20" y="0" width="3" height="28" rx="1" fill="white" />
        <rect x="18" y="28" width="10" height="3" rx="1" fill="white" />
        <circle cx="20" cy="34" r="3.5" fill="white" />
        <circle cx="27" cy="34" r="3.5" fill="white" />
        <rect x="17" y="-4" width="10" height="8" rx="1.5" fill="white" opacity="0.5" />
      </g>

      {/* Mechanic crouching with wrench */}
      <g opacity="0.13" transform="translate(195, 148)">
        <circle cx="10" cy="0" r="5" fill="white" />
        <path d="M6 5 Q4 14 14 18" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
        <line x1="16" y1="12" x2="28" y2="8" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30" cy="7" r="4" fill="none" stroke="white" strokeWidth="2.5" />
        <rect x="-2" y="14" width="14" height="8" rx="2" fill="white" opacity="0.5" />
      </g>

      {/* Headlight beams */}
      <ellipse cx="510" cy="140" rx="65" ry="9" fill="url(#headlightGlow)" filter="url(#softGlow)" />

      {/* === CENTER: THE TRUCK === */}
      <g transform="translate(260, 86)">
        <ellipse cx="100" cy="84" rx="130" ry="6" fill={INK.groundShadow} />
        <rect x="2" y="56" width="152" height="6" rx="1" fill={INK.deck} />

        {/* Trailer */}
        <rect x="0" y="6" width="156" height="52" rx="3" fill="url(#bodyGrad)" />
        <rect x="0" y="6" width="156" height="52" rx="3" stroke={INK.trailerEdge} strokeWidth="0.8" fill="none" />
        {[22, 44, 66, 88, 110, 132].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="56" stroke={INK.trailerEdge} strokeWidth="0.4" opacity="0.25" />
        ))}
        <rect x="0" y="6" width="156" height="9" rx="3" fill="white" opacity="0.06" />

        <text x="78" y="31" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fontWeight="900" fill={INK.navy} textAnchor="middle" letterSpacing="0.5">THIND</text>
        <rect x="44" y="34" width="68" height="1.5" rx="0.75" fill={INK.navy} opacity="0.2" />
        <text x="78" y="48" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="700" fill={INK.navy} textAnchor="middle" letterSpacing="3">TRANSPORT</text>

        {/* Fifth wheel */}
        <rect x="154" y="22" width="8" height="30" rx="1.5" fill={INK.chrome} />
        <rect x="156" y="27" width="4" height="20" rx="1" fill={INK.chromeDark} />

        {/* Cab */}
        <path d="M160 12 L184 12 Q204 12 214 26 L224 48 Q226 54 226 58 L226 62 Q226 64 224 64 L160 64 L160 12Z" fill="url(#cabGrad)" />
        <path d="M160 12 L184 12 Q204 12 214 26 L224 48 Q226 54 226 58 L226 62 Q226 64 224 64 L160 64 L160 12Z" stroke={INK.trailerEdge} strokeWidth="0.8" fill="none" />
        <line x1="160" y1="60" x2="226" y2="60" stroke={INK.cabSheen} strokeWidth="1" opacity="0.3" />

        {/* Windshield */}
        <path d="M172 15 L194 15 Q208 15 216 28 L222 46 L222 52 Q222 54 220 54 L172 54 L172 15Z" fill={INK.glass} opacity="0.82" />
        <path d="M172 15 L194 15 Q208 15 216 28 L222 46" stroke={INK.glassEdge} strokeWidth="0.8" fill="none" />
        <path d="M176 18 L190 18 Q200 18 208 28 L212 36" stroke={INK.glassSheen} strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Driver in cab */}
        <g opacity="0.15">
          <circle cx="188" cy="30" r="5.5" fill="white" />
          <rect x="184" y="36" width="8" height="10" rx="3" fill="white" />
          <line x1="184" y1="38" x2="178" y2="42" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Headlights */}
        <rect x="225" y="42" width="4" height="10" rx="1.5" fill={INK.headlight} opacity="0.95" filter="url(#glow)" />
        <rect x="225" y="56" width="4" height="5" rx="1" fill={INK.tailLight} opacity="0.8" />
        <rect x="228" y="60" width="5" height="6" rx="1" fill={INK.chromeLight} />

        {/* Mirror */}
        <rect x="228" y="22" width="3" height="9" rx="1" fill={INK.chromeDark} />
        <rect x="229" y="23" width="2" height="6" rx="0.5" fill={INK.chromeLight} />

        {/* Exhaust */}
        <rect x="166" y="-4" width="3.5" height="18" rx="1.5" fill={INK.chrome} />
        <rect x="173" y="-1" width="3.5" height="15" rx="1.5" fill={INK.chrome} />
        <circle cx="168" cy="-8" r="3" fill="white" opacity="0.03" />
        <circle cx="175" cy="-5" r="2.5" fill="white" opacity="0.025" />

        {/* Fuel tank */}
        <rect x="160" y="52" width="18" height="10" rx="3" fill={INK.chromeDark} stroke={INK.chrome} strokeWidth="0.5" />

        {/* Wheels */}
        {[30, 50, 122, 142].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="66" r="10" fill={INK.tyre} stroke={INK.tyreRim} strokeWidth="0.8" />
            <circle cx={cx} cy="66" r="7" fill={INK.tyreInner} />
            <circle cx={cx} cy="66" r="4.5" fill={INK.tyreHub} />
            <circle cx={cx} cy="66" r="2" fill={INK.chromeDark} />
          </g>
        ))}
        <g>
          <circle cx="202" cy="66" r="11" fill={INK.tyre} stroke={INK.tyreRim} strokeWidth="0.8" />
          <circle cx="202" cy="66" r="8" fill={INK.tyreInner} />
          <circle cx="202" cy="66" r="5" fill={INK.tyreHub} />
          <circle cx="202" cy="66" r="2.5" fill={INK.chromeDark} />
        </g>

        <rect x="55" y="66" width="4" height="7" rx="0.5" fill={INK.deck} />
        <rect x="147" y="66" width="4" height="7" rx="0.5" fill={INK.deck} />
      </g>

      {/* === RIGHT ZONE: DESTINATION / BUSINESS === */}

      {/* City skyline */}
      <g opacity="0.07">
        <rect x="504" y="55" width="11" height="55" rx="1" fill="white" />
        <rect x="518" y="38" width="14" height="72" rx="1" fill="white" />
        <rect x="535" y="48" width="16" height="62" rx="1" fill="white" />
        <rect x="554" y="58" width="11" height="52" rx="1" fill="white" />
        <rect x="568" y="44" width="9" height="66" rx="1" fill="white" />
        <rect x="580" y="56" width="13" height="54" rx="1" fill="white" />
        {[44, 52, 60, 68, 76, 84, 92].map((y) => (
          <g key={y}>
            <rect x="520" y={y} width="3.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
            <rect x="526" y={y} width="3.5" height="2.5" rx="0.5" fill="white" opacity="0.3" />
          </g>
        ))}
      </g>

      {/* Broker handshake */}
      <g opacity="0.16" transform="translate(510, 100)">
        <circle cx="10" cy="2" r="6" fill="white" />
        <rect x="5" y="8" width="10" height="18" rx="3" fill="white" />
        <line x1="7" y1="26" x2="3" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="13" y1="26" x2="18" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="14" x2="28" y2="17" stroke="white" strokeWidth="3" strokeLinecap="round" />

        <circle cx="44" cy="2" r="6" fill="white" />
        <rect x="39" y="8" width="10" height="18" rx="3" fill="white" />
        <line x1="41" y1="26" x2="36" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="47" y1="26" x2="52" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="39" y1="14" x2="26" y2="17" stroke="white" strokeWidth="3" strokeLinecap="round" />

        <circle cx="27" cy="17" r="4" fill="white" opacity="0.45" />
      </g>

      {/* Operations coordinator with tablet */}
      <g opacity="0.13" transform="translate(564, 90)">
        <circle cx="8" cy="2" r="6" fill="white" />
        <rect x="3" y="8" width="10" height="16" rx="3" fill="white" />
        <line x1="5" y1="24" x2="1" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="11" y1="24" x2="16" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="15" y="10" width="8" height="12" rx="1.5" fill="white" opacity="0.55" />
        <line x1="13" y1="15" x2="15" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function QRPattern() {
  const p = [
    [1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1],
    [1,1,1,0,1,1,1],
    [0,1,0,1,0,1,0],
    [1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1],
    [1,1,1,0,1,1,1],
  ]
  return (
    <>
      {p.flat().map((v, i) => (
        <div key={i} className={v ? "bg-navy" : "bg-white"} />
      ))}
    </>
  )
}

/** The printer's spec sheet. Ink values come from INK so the sheet and the
 *  proof above it cannot drift apart. */
const SPECS = [
  { label: "Format", value: "MOO Standard (Landscape)", mono: false },
  { label: "Bleed size", value: '3.46" x 2.32"', mono: true },
  { label: "Trim size", value: '3.30" x 2.16"', mono: true },
  { label: "Safe area", value: '3.14" x 2.02"', mono: true },
  { label: "Primary colour", value: `${INK.navy} (Navy)`, mono: true },
  { label: "Accent colour", value: `${INK.orange} (Safety Orange)`, mono: true },
  { label: "Font", value: "Inter (800/700/500)", mono: false },
  { label: "Minimum font size", value: "8pt (print)", mono: true },
  { label: "Colour mode", value: "CMYK print / RGB web", mono: false },
] as const

const DOWNLOADS = [
  { href: "/branding/business-card-front.svg", label: "Front (SVG)" },
  { href: "/branding/business-card-back.svg", label: "Back (SVG)" },
  { href: "/branding/thind-transport-logo.svg", label: "Logo (SVG)" },
] as const

const CAPTION = "font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300"

export function BusinessCardShowcase() {
  return (
    <>
      <section aria-labelledby="card-proof-heading" className="bg-navy-950 py-section">
        <div className="container">
          <h2
            id="card-proof-heading"
            className="font-display text-m-h2 font-bold text-white text-balance"
          >
            The proof, both sides
          </h2>
          <p className="mt-3 max-w-measure text-m-body text-steel-200">
            {`MOO-format card for ${COMPANY_INFO.name}, laid out for print: contact details on the front, the brand on the back.`}
          </p>

          <div className="mx-auto mt-8 grid max-w-5xl gap-8 md:grid-cols-2">
            <figure>
              <figcaption className={`${CAPTION} mb-3`}>Front (contact)</figcaption>
              <CardFront />
            </figure>
            <figure>
              <figcaption className={`${CAPTION} mb-3`}>Back (brand)</figcaption>
              <CardBack />
            </figure>
          </div>

          <p className="mx-auto mt-6 max-w-measure text-m-micro text-steel-300">
            MOO Standard: 3.46&quot; x 2.32&quot; (Bleed) &mdash; 3.30&quot; x 2.16&quot; (Trim) &mdash; 3.14&quot; x 2.02&quot; (Safe)
          </p>
        </div>
      </section>

      <section aria-labelledby="card-specs-heading" className="bg-asphalt py-section">
        <div className="container">
          <div className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2
              id="card-specs-heading"
              className="font-display text-m-h2 font-bold text-ink text-balance"
            >
              Specifications
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SPECS.map((s) => (
                <div key={s.label} className="rounded-m-2 border border-ink/15 p-4">
                  <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                    {s.label}
                  </dt>
                  <dd
                    className={`mt-1 text-m-body font-semibold text-ink ${s.mono ? "font-mono tabular-nums" : ""}`}
                  >
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="card-downloads-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure">
            <h2
              id="card-downloads-heading"
              className="font-display text-m-h3 font-bold text-white text-balance"
            >
              Source files
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              The artwork itself, for the printer or anyone laying out a new piece.
            </p>
            <ul className="mt-6 flex list-none flex-wrap gap-3">
              {DOWNLOADS.map((d) => (
                <li key={d.href}>
                  <a
                    href={d.href}
                    download
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet border border-white/20 bg-white/5 px-5 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:border-white/40 hover:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>{d.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
