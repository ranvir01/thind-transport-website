"use client"

import { useState } from "react"
import Image from "next/image"

const CARD_INFO = {
  owner: "Sukhdev Thind",
  title: "Owner & Operator",
  company: "Thind Transport",
  phone: "(206) 765-6300",
  email: "thindcarrier@gmail.com",
  website: "thindtransport.com",
  location: "Kent, WA 98064",
  dot: "USDOT #3154006",
  services: ["Flatbed Freight", "Reefer / Temperature-Controlled", "Dry Van Shipping", "Owner Operator Leasing (91% Commission)"],
  opportunities: [
    "Company Drivers — Earn $78K-$110K/yr",
    "Owner Operators — $150K-$250K/yr Gross",
    "48 States Coverage | Local, Regional & OTR",
  ],
}

function CardFront() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#001F3F] via-[#00152B] to-[#001020]">
      {/* Subtle road pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-0 w-40 h-full bg-white/[0.02] -rotate-12 -skew-x-12" />
        <div className="absolute left-20 top-0 w-24 h-full bg-white/[0.015] -rotate-12 -skew-x-12" />
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-32 h-32">
        <div className="absolute top-3 right-3 w-full h-full border-t-2 border-r-2 border-orange/40 rounded-tr-none" />
        <div className="absolute top-5 right-5 w-[calc(100%-12px)] h-[calc(100%-12px)] border-t border-r border-orange/20" />
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32">
        <div className="absolute bottom-3 left-3 w-full h-full border-b-2 border-l-2 border-orange/40" />
        <div className="absolute bottom-5 left-5 w-[calc(100%-12px)] h-[calc(100%-12px)] border-b border-l border-orange/20" />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
        {/* Top section */}
        <div>
          <div className="w-12 h-1 bg-gradient-to-r from-orange to-orange-300 rounded-full mb-3" />
          <h3 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">{CARD_INFO.owner}</h3>
          <p className="text-orange text-[10px] sm:text-xs font-medium tracking-[0.2em] mt-0.5">{CARD_INFO.title.toUpperCase()}</p>
          <div className="w-full h-px bg-white/10 mt-3" />
        </div>

        {/* Middle: Services + Opportunities */}
        <div className="flex-1 flex flex-col justify-center gap-3 py-2">
          <div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-white/40 tracking-[0.2em] mb-1.5">SERVICES</p>
            <div className="space-y-1">
              {CARD_INFO.services.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                  <span className="text-white/85 text-[10px] sm:text-xs">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-white/40 tracking-[0.2em] mb-1.5">OPPORTUNITIES</p>
            <div className="space-y-1">
              {CARD_INFO.opportunities.map((o) => (
                <div key={o} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                  <span className="text-white/85 text-[10px] sm:text-xs">{o}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Contact info + QR */}
        <div>
          <div className="w-full h-px bg-white/[0.06] mb-3" />
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              {[
                { icon: "phone", value: CARD_INFO.phone },
                { icon: "email", value: CARD_INFO.email },
                { icon: "web", value: CARD_INFO.website },
                { icon: "location", value: CARD_INFO.location },
              ].map((c) => (
                <div key={c.icon} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-orange/10 flex items-center justify-center flex-shrink-0">
                    <ContactIcon type={c.icon} />
                  </div>
                  <span className="text-white text-[10px] sm:text-xs font-semibold">{c.value}</span>
                </div>
              ))}
            </div>
            {/* QR Code area */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-lg p-1.5 shadow-lg">
                <div className="w-full h-full rounded bg-white border border-navy/10 grid grid-cols-7 grid-rows-7 gap-[1px] p-1">
                  <QRPattern />
                </div>
              </div>
              <span className="text-[7px] sm:text-[8px] text-white/40 font-semibold tracking-[0.15em] mt-1">SCAN TO VISIT</span>
            </div>
          </div>
          <p className="text-[8px] text-white/20 text-right mt-2">{CARD_INFO.dot} | FMCSA CERTIFIED</p>
        </div>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#001F3F] via-[#002B5C] to-[#003366]">
      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { x: 12, y: 8, s: 1, o: 0.4 }, { x: 25, y: 12, s: 0.8, o: 0.3 },
          { x: 38, y: 6, s: 1.2, o: 0.5 }, { x: 50, y: 11, s: 0.8, o: 0.3 },
          { x: 65, y: 7, s: 1, o: 0.4 }, { x: 78, y: 10, s: 0.7, o: 0.3 },
          { x: 90, y: 7, s: 1.1, o: 0.45 }, { x: 18, y: 16, s: 0.6, o: 0.25 },
        ].map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.s,
              height: star.s,
              opacity: star.o,
            }}
          />
        ))}
      </div>

      {/* Horizon glow */}
      <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 w-[120%] h-[30%] bg-orange/[0.08] rounded-[50%] blur-3xl" />

      <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
        {/* Top: Company name */}
        <div className="text-center pt-2">
          <h3 className="text-white text-2xl sm:text-4xl font-black tracking-tight">{CARD_INFO.company.toUpperCase()}</h3>
          <div className="mx-auto w-48 sm:w-64 h-1 bg-gradient-to-r from-orange to-orange-300 rounded-full mt-2" />
          <p className="text-white/60 text-[10px] sm:text-xs tracking-[0.3em] mt-2 font-medium">YOUR FREIGHT, OUR COMMITMENT</p>
        </div>

        {/* Center: Truck illustration */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Route chain - back */}
          <div className="absolute left-[5%] sm:left-[8%] top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            {["PICKUP", "HAUL", "LOAD"].map((label, i) => (
              <div key={label} className="flex items-center gap-1 sm:gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] sm:text-[7px] font-bold text-orange/60 mb-0.5">{label}</span>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-orange/50 flex items-center justify-center">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-orange" />
                  </div>
                </div>
                {i < 2 && <div className="w-2 sm:w-4 h-[1px] bg-orange/40 mt-2" />}
              </div>
            ))}
            <div className="w-2 sm:w-4 h-[1px] bg-orange/40 mt-2" />
          </div>

          {/* Truck */}
          <div className="relative mx-auto">
            <TruckIllustration />
          </div>

          {/* Route chain - front */}
          <div className="absolute right-[5%] sm:right-[8%] top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            <div className="w-2 sm:w-4 h-[1px] bg-orange/40 mt-2" />
            {["ROUTE", "DELIVER", "SETTLE"].map((label, i) => (
              <div key={label} className="flex items-center gap-1 sm:gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] sm:text-[7px] font-bold text-orange/60 mb-0.5">{label}</span>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-orange/50 flex items-center justify-center">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-orange" />
                  </div>
                </div>
                {i < 2 && <div className="w-2 sm:w-4 h-[1px] bg-orange/40 mt-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Road surface */}
        <div className="absolute bottom-[20%] left-0 right-0 h-[25%] bg-gradient-to-b from-transparent via-[#2a2a2a]/80 to-[#1a1a1a]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-orange/40" />
          <div className="absolute top-1/2 left-0 right-0 flex justify-center">
            <div className="w-[80%] h-[2px] bg-orange-300/30" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 20px, #FFB34080 20px, #FFB34080 40px)" }} />
          </div>
        </div>

        {/* Bottom: Service badges */}
        <div className="relative z-10">
          <div className="flex justify-center gap-2 sm:gap-3 flex-wrap mb-2">
            {["FLATBED", "REEFER", "DRY VAN", "48 STATES"].map((badge) => (
              <div
                key={badge}
                className="px-3 sm:px-4 py-1 rounded-full border border-orange/30 bg-orange/10 text-orange text-[8px] sm:text-[10px] font-bold tracking-wider"
              >
                {badge}
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-[9px] sm:text-[10px] tracking-[0.15em] font-semibold">THINDTRANSPORT.COM</p>
        </div>
      </div>
    </div>
  )
}

function TruckIllustration() {
  return (
    <svg viewBox="0 0 280 100" className="w-40 sm:w-56 md:w-64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trailer */}
      <rect x="0" y="15" width="185" height="55" rx="2" fill="#FF9500"/>
      <rect x="0" y="15" width="185" height="55" rx="2" stroke="#E68600" strokeWidth="1"/>
      {/* Trailer ridges */}
      {[25, 50, 75, 100, 125, 150].map((x) => (
        <line key={x} x1={x} y1="17" x2={x} y2="68" stroke="#E68600" strokeWidth="0.5" opacity="0.5"/>
      ))}
      {/* Text on trailer */}
      <text x="92" y="40" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#001F3F" textAnchor="middle">THIND</text>
      <text x="92" y="55" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#001F3F" textAnchor="middle" letterSpacing="3">TRANSPORT</text>
      {/* Cab */}
      <path d="M185 18 H225 Q245 18 255 30 L268 52 Q272 60 272 65 V73 Q272 75 270 75 H185 V18Z" fill="#FF9500" stroke="#E68600" strokeWidth="1"/>
      {/* Windshield */}
      <path d="M200 21 H230 Q242 21 250 32 L260 52 V58 Q260 60 258 60 H200 V21Z" fill="#001F3F" opacity="0.7"/>
      {/* Headlight */}
      <rect x="270" y="55" width="5" height="8" rx="1" fill="#FFE5BF" opacity="0.9"/>
      <rect x="270" y="66" width="5" height="5" rx="1" fill="#FF4444" opacity="0.7"/>
      {/* Exhaust */}
      <rect x="195" y="4" width="3" height="14" rx="1.5" fill="#888"/>
      <rect x="201" y="6" width="3" height="12" rx="1.5" fill="#888"/>
      {/* Wheels */}
      {[30, 55, 150, 175, 245].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="78" r={i === 4 ? 10 : 9} fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
          <circle cx={cx} cy="78" r={i === 4 ? 5 : 4.5} fill="#333"/>
          <circle cx={cx} cy="78" r="2" fill="#888"/>
        </g>
      ))}
    </svg>
  )
}

function ContactIcon({ type }: { type: string }) {
  const cls = "w-2.5 h-2.5 text-orange"
  switch (type) {
    case "phone":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
        </svg>
      )
    case "email":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
        </svg>
      )
    case "web":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
        </svg>
      )
    case "location":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
        </svg>
      )
    default:
      return null
  }
}

function QRPattern() {
  const filled = [
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
      {filled.flat().map((v, i) => (
        <div
          key={i}
          className={`rounded-[1px] ${v ? "bg-navy" : "bg-white"}`}
        />
      ))}
    </>
  )
}

export function BusinessCardShowcase() {
  const [activeView, setActiveView] = useState<"front" | "back">("front")

  return (
    <section className="min-h-screen bg-gradient-to-b from-neutral-50 to-white py-16 sm:py-24">
      <div className="container px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-4">
            Brand Assets
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-navy mb-4">
            Business Card <span className="text-orange">Design</span>
          </h1>
          <p className="text-steel/70 text-lg max-w-2xl mx-auto">
            Professional MOO-format business card for Thind Transport. Designed for the long-haul trucking industry with a focus on clarity, professionalism, and brand recognition.
          </p>
        </div>

        {/* Card Toggle */}
        <div className="flex justify-center gap-2 mb-8">
          {(["front", "back"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeView === view
                  ? "bg-navy text-white shadow-brand"
                  : "bg-white text-steel border border-steel/20 hover:border-orange/40 hover:text-orange"
              }`}
            >
              {view === "front" ? "Front (Contact Side)" : "Back (Brand Side)"}
            </button>
          ))}
        </div>

        {/* Card Display */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="transition-all duration-500">
            {activeView === "front" ? <CardFront /> : <CardBack />}
          </div>
          <p className="text-center text-steel/50 text-sm mt-4">
            MOO Standard: 3.46&quot; x 2.32&quot; (Bleed) &mdash; 3.30&quot; x 2.16&quot; (Trim) &mdash; 3.14&quot; x 2.02&quot; (Safe)
          </p>
        </div>

        {/* Both cards side by side on larger screens */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-navy text-center mb-6">Full Preview</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div>
              <p className="text-sm font-semibold text-steel/60 text-center mb-3 tracking-wider">FRONT &mdash; CONTACT SIDE</p>
              <CardFront />
            </div>
            <div>
              <p className="text-sm font-semibold text-steel/60 text-center mb-3 tracking-wider">BACK &mdash; BRAND SIDE</p>
              <CardBack />
            </div>
          </div>
        </div>

        {/* Design specifications */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-navy text-center mb-8">Design Specifications</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Format", value: "MOO Standard (Landscape)" },
              { label: "Bleed Size", value: '3.46" x 2.32"' },
              { label: "Trim Size", value: '3.30" x 2.16"' },
              { label: "Safe Area", value: '3.14" x 2.02"' },
              { label: "Primary Color", value: "#001F3F (Navy)" },
              { label: "Secondary Color", value: "#FF9500 (Safety Orange)" },
              { label: "Font", value: "Inter (800/600/500)" },
              { label: "Minimum Font Size", value: "8pt (print)" },
              { label: "Color Mode", value: "CMYK for Print / RGB for Web" },
            ].map((spec) => (
              <div key={spec.label} className="bg-white rounded-lg border border-steel/10 p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-steel/50 tracking-widest mb-1">{spec.label.toUpperCase()}</p>
                <p className="text-sm font-semibold text-navy">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card Content Checklist */}
        <div className="max-w-3xl mx-auto mt-12 bg-navy/[0.03] rounded-2xl p-6 sm:p-8">
          <h3 className="text-lg font-bold text-navy mb-4">What&apos;s Included</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              "Owner name & title",
              "Company name & logo",
              "Phone number",
              "Email address",
              "Website URL",
              "Physical location",
              "QR code to website",
              "Service types (Flatbed, Reefer, Dry Van)",
              "Hiring opportunities & pay ranges",
              "USDOT & FMCSA certification",
              "48-state coverage badge",
              "Long-haul truck illustration",
              "Load route chain visualization",
              "Brand-consistent color palette",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-steel/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download SVG Links */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-bold text-navy mb-4">Print-Ready Assets</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/branding/business-card-front.svg"
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-600 transition-colors shadow-brand"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Download Front (SVG)
            </a>
            <a
              href="/branding/business-card-back.svg"
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-600 transition-colors shadow-brand"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Download Back (SVG)
            </a>
            <a
              href="/branding/thind-transport-logo.svg"
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-cta"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Download Logo (SVG)
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
