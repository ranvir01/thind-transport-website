"use client"

import { useState } from "react"

const CARD = {
  owner: "Sukhdev Thind",
  tagline: "THE TRUCK ROLLS. THE OFFICE NEVER SLEEPS.",
  phone: "(206) 765-6300",
  email: "thindcarrier@gmail.com",
  website: "thindtransport.com",
}

function MiniTruck() {
  return (
    <svg viewBox="0 0 28 14" fill="currentColor" className="w-[3.2%] h-auto">
      <rect x="0" y="3" width="16" height="8" rx="1" />
      <path d="M16 5h5l3 4v2h-8V5z" />
      <circle cx="5" cy="12.5" r="1.8" />
      <circle cx="21" cy="12.5" r="1.8" />
    </svg>
  )
}

function CardFront() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl bg-[#1a1f2e]" style={{ containerType: "inline-size" }}>
      <div className="absolute top-0 right-0 w-[40%] h-[65%]">
        <div className="absolute inset-0 bg-gradient-to-bl from-orange/[0.06] to-transparent" />
        <div className="absolute top-0 left-0 w-[2px] h-full bg-orange/20 rotate-[20deg] origin-top-left" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Main content: left text, right QR */}
        <div className="flex-1 flex justify-between p-[6%] pb-[2%]">
          {/* Left column */}
          <div className="flex flex-col justify-between flex-1 min-w-0 pr-[5%]">
            <div>
              <p className="text-white font-extrabold leading-tight" style={{ fontSize: "clamp(1rem, 3.8cqi, 1.8rem)" }}>Owner / Dispatcher:</p>
              <h3 className="text-white font-black tracking-tight leading-none mt-[0.15em]" style={{ fontSize: "clamp(1.2rem, 5cqi, 2.4rem)" }}>[{CARD.owner}]</h3>
            </div>

            <div className="mt-auto" style={{ fontSize: "clamp(0.7rem, 2.6cqi, 1.2rem)" }}>
              <p className="leading-[1.7]">
                <span className="text-orange font-bold">Cell: </span>
                <span className="text-white">{CARD.phone}</span>
              </p>
              <p className="leading-[1.7]">
                <span className="text-orange font-bold">Email: </span>
                <span className="text-white">{CARD.email}</span>
              </p>
              <p className="leading-[1.7]">
                <span className="text-orange font-bold">Website: </span>
                <span className="text-white">{CARD.website}</span>
              </p>
            </div>
          </div>

          {/* Right column: QR */}
          <div className="flex flex-col items-end flex-shrink-0 w-[28%]">
            <p className="text-white/70 font-semibold tracking-wide text-right mb-[4%]" style={{ fontSize: "clamp(0.5rem, 1.8cqi, 0.85rem)" }}>to website</p>
            <div className="w-full aspect-square bg-white rounded-md shadow-lg shadow-black/30 p-[6%]">
              <div className="w-full h-full bg-white grid grid-cols-7 grid-rows-7 gap-[1px] p-[5%]">
                <QRPattern />
              </div>
            </div>
          </div>
        </div>

        {/* Orange bar */}
        <div className="bg-orange-600 px-[6%] py-[2.5%]">
          <p className="text-navy font-extrabold tracking-wide text-center" style={{ fontSize: "clamp(0.55rem, 2cqi, 0.95rem)" }}>
            24/7 Dispatch &bull; Dry Van &bull; Reefer &bull; Flatbed &bull; Serving 48 States
          </p>
          <div className="flex items-center justify-center gap-[2%] mt-[0.4%]">
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
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl" style={{ containerType: "inline-size" }}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0f2744] to-[#1a3a5c]" />

      <div className="absolute bottom-[20%] left-0 right-0 h-[25%] bg-gradient-to-t from-[#2a4a6a]/30 to-transparent" />
      <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[140%] h-[6%] bg-orange/[0.05] rounded-[50%] blur-2xl" />

      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { x: 6, y: 4, o: 0.5 }, { x: 14, y: 9, o: 0.25 }, { x: 21, y: 2, o: 0.45 },
          { x: 33, y: 6, o: 0.35 }, { x: 44, y: 2, o: 0.6 }, { x: 54, y: 8, o: 0.25 },
          { x: 61, y: 1, o: 0.4 }, { x: 71, y: 5, o: 0.35 }, { x: 79, y: 3, o: 0.5 },
          { x: 87, y: 8, o: 0.25 }, { x: 92, y: 2, o: 0.4 }, { x: 49, y: 4, o: 0.3 },
        ].map((s, i) => (
          <div key={i} className="absolute w-[1px] h-[1px] bg-white rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o }} />
        ))}
      </div>

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[28%]">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0 L1000 300 L0 300Z" fill="#1c1c1c" />
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0" stroke="#FF9500" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M0 170 Q250 140 500 130 Q750 120 1000 105" stroke="#FFB340" strokeWidth="2" strokeDasharray="40 25" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Top: Company name */}
        <div className="text-center pt-[4%] px-[5%]">
          <h3 className="text-white font-black tracking-tight leading-none" style={{ fontSize: "clamp(1.3rem, 5.5cqi, 2.3rem)" }}>
            THIND <span className="text-orange">TRANSPORT</span>
          </h3>
          <div className="mx-auto w-[30%] h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent rounded-full mt-[1.5%]" />
          <p className="text-white/35 tracking-[0.35em] mt-[1%] font-medium" style={{ fontSize: "clamp(0.4rem, 1.4cqi, 0.6rem)" }}>{CARD.tagline}</p>
        </div>

        {/* Center: Truck scene */}
        <div className="flex-1 flex items-center justify-center relative">
          <TruckScene />
        </div>

        {/* Bottom: Orange bar */}
        <div className="bg-orange-600 px-[5%] py-[2%] flex items-center justify-between">
          <div className="flex items-center gap-[2%] text-navy" style={{ fontSize: "clamp(0.4rem, 1.4cqi, 0.6rem)" }}>
            <span className="font-extrabold tracking-wider">FLATBED</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">DRY VAN</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">REEFER</span>
            <span className="text-navy/40">&bull;</span>
            <span className="font-extrabold tracking-wider">48 STATES</span>
          </div>
          <span className="text-navy/60 font-bold tracking-wider" style={{ fontSize: "clamp(0.35rem, 1.2cqi, 0.55rem)" }}>THINDTRANSPORT.COM</span>
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
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#E07800" />
        </linearGradient>
        <linearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFa520" />
          <stop offset="100%" stopColor="#E68600" />
        </linearGradient>
        <linearGradient id="headlightGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFEEBB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFEEBB" stopOpacity="0" />
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
        <ellipse cx="100" cy="84" rx="130" ry="6" fill="rgba(0,0,0,0.2)" />
        <rect x="2" y="56" width="152" height="6" rx="1" fill="#333" />

        {/* Trailer */}
        <rect x="0" y="6" width="156" height="52" rx="3" fill="url(#bodyGrad)" />
        <rect x="0" y="6" width="156" height="52" rx="3" stroke="#CC7700" strokeWidth="0.8" fill="none" />
        {[22, 44, 66, 88, 110, 132].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="56" stroke="#CC7700" strokeWidth="0.4" opacity="0.25" />
        ))}
        <rect x="0" y="6" width="156" height="9" rx="3" fill="white" opacity="0.06" />

        <text x="78" y="31" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fontWeight="900" fill="#17181B" textAnchor="middle" letterSpacing="0.5">THIND</text>
        <rect x="44" y="34" width="68" height="1.5" rx="0.75" fill="#17181B" opacity="0.2" />
        <text x="78" y="48" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="700" fill="#17181B" textAnchor="middle" letterSpacing="3">TRANSPORT</text>

        {/* Fifth wheel */}
        <rect x="154" y="22" width="8" height="30" rx="1.5" fill="#777" />
        <rect x="156" y="27" width="4" height="20" rx="1" fill="#555" />

        {/* Cab */}
        <path d="M160 12 L184 12 Q204 12 214 26 L224 48 Q226 54 226 58 L226 62 Q226 64 224 64 L160 64 L160 12Z" fill="url(#cabGrad)" />
        <path d="M160 12 L184 12 Q204 12 214 26 L224 48 Q226 54 226 58 L226 62 Q226 64 224 64 L160 64 L160 12Z" stroke="#CC7700" strokeWidth="0.8" fill="none" />
        <line x1="160" y1="60" x2="226" y2="60" stroke="#FFD080" strokeWidth="1" opacity="0.3" />

        {/* Windshield */}
        <path d="M172 15 L194 15 Q208 15 216 28 L222 46 L222 52 Q222 54 220 54 L172 54 L172 15Z" fill="#0a1628" opacity="0.82" />
        <path d="M172 15 L194 15 Q208 15 216 28 L222 46" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />
        <path d="M176 18 L190 18 Q200 18 208 28 L212 36" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Driver in cab */}
        <g opacity="0.15">
          <circle cx="188" cy="30" r="5.5" fill="white" />
          <rect x="184" y="36" width="8" height="10" rx="3" fill="white" />
          <line x1="184" y1="38" x2="178" y2="42" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Headlights */}
        <rect x="225" y="42" width="4" height="10" rx="1.5" fill="#FFEEBB" opacity="0.95" filter="url(#glow)" />
        <rect x="225" y="56" width="4" height="5" rx="1" fill="#FF3333" opacity="0.8" />
        <rect x="228" y="60" width="5" height="6" rx="1" fill="#888" />

        {/* Mirror */}
        <rect x="228" y="22" width="3" height="9" rx="1" fill="#555" />
        <rect x="229" y="23" width="2" height="6" rx="0.5" fill="#888" />

        {/* Exhaust */}
        <rect x="166" y="-4" width="3.5" height="18" rx="1.5" fill="#777" />
        <rect x="173" y="-1" width="3.5" height="15" rx="1.5" fill="#777" />
        <circle cx="168" cy="-8" r="3" fill="white" opacity="0.03" />
        <circle cx="175" cy="-5" r="2.5" fill="white" opacity="0.025" />

        {/* Fuel tank */}
        <rect x="160" y="52" width="18" height="10" rx="3" fill="#555" stroke="#666" strokeWidth="0.5" />

        {/* Wheels */}
        {[30, 50, 122, 142].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="66" r="10" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
            <circle cx={cx} cy="66" r="7" fill="#222" />
            <circle cx={cx} cy="66" r="4.5" fill="#2a2a2a" />
            <circle cx={cx} cy="66" r="2" fill="#555" />
          </g>
        ))}
        <g>
          <circle cx="202" cy="66" r="11" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
          <circle cx="202" cy="66" r="8" fill="#222" />
          <circle cx="202" cy="66" r="5" fill="#2a2a2a" />
          <circle cx="202" cy="66" r="2.5" fill="#555" />
        </g>

        <rect x="55" y="66" width="4" height="7" rx="0.5" fill="#333" />
        <rect x="147" y="66" width="4" height="7" rx="0.5" fill="#333" />
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
        <div key={i} className={`rounded-[0.5px] ${v ? "bg-navy" : "bg-white"}`} />
      ))}
    </>
  )
}

export function BusinessCardShowcase() {
  const [activeView, setActiveView] = useState<"front" | "back">("front")

  return (
    <section className="min-h-screen bg-gradient-to-b from-neutral-50 to-white py-16 sm:py-24">
      <div className="container px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-4">Brand Assets</span>
          <h1 className="text-3xl sm:text-5xl font-black text-navy mb-4">
            Business Card <span className="text-orange">Design</span>
          </h1>
          <p className="text-steel/70 text-lg max-w-2xl mx-auto">
            Professional MOO-format business card for Thind Transport. Designed for print with a focus on clarity, professionalism, and brand recognition.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeView === v
                  ? "bg-navy text-white shadow-brand"
                  : "bg-white text-steel border border-steel/20 hover:border-orange/40 hover:text-orange"
              }`}
            >
              {v === "front" ? "Front (Contact)" : "Back (Brand)"}
            </button>
          ))}
        </div>

        <div className="max-w-2xl mx-auto mb-16">
          <div className="transition-all duration-500">
            {activeView === "front" ? <CardFront /> : <CardBack />}
          </div>
          <p className="text-center text-steel/50 text-sm mt-4">
            MOO Standard: 3.46&quot; x 2.32&quot; (Bleed) &mdash; 3.30&quot; x 2.16&quot; (Trim) &mdash; 3.14&quot; x 2.02&quot; (Safe)
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-xl font-bold text-navy text-center mb-6">Full Preview</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div>
              <p className="text-sm font-semibold text-steel/60 text-center mb-3 tracking-wider">FRONT</p>
              <CardFront />
            </div>
            <div>
              <p className="text-sm font-semibold text-steel/60 text-center mb-3 tracking-wider">BACK</p>
              <CardBack />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-navy text-center mb-8">Specifications</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Format", value: "MOO Standard (Landscape)" },
              { label: "Bleed Size", value: '3.46" x 2.32"' },
              { label: "Trim Size", value: '3.30" x 2.16"' },
              { label: "Safe Area", value: '3.14" x 2.02"' },
              { label: "Primary Color", value: "#17181B (Navy)" },
              { label: "Accent Color", value: "#FF9500 (Safety Orange)" },
              { label: "Font", value: "Inter (800/700/500)" },
              { label: "Min Font Size", value: "8pt (print)" },
              { label: "Color Mode", value: "CMYK Print / RGB Web" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg border border-steel/10 p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-steel/50 tracking-widest mb-1">{s.label.toUpperCase()}</p>
                <p className="text-sm font-semibold text-navy">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <h3 className="text-lg font-bold text-navy mb-4">Download Assets</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: "/branding/business-card-front.svg", label: "Front (SVG)", style: "bg-navy" },
              { href: "/branding/business-card-back.svg", label: "Back (SVG)", style: "bg-navy" },
              { href: "/branding/thind-transport-logo.svg", label: "Logo (SVG)", style: "bg-orange-600" },
            ].map((d) => (
              <a key={d.href} href={d.href} download className={`inline-flex items-center gap-2 px-5 py-2.5 ${d.style} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-brand`}>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {d.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
