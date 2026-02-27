"use client"

import { useState } from "react"

const CARD = {
  owner: "Sukhdev Thind",
  title: "Owner",
  company: "THIND TRANSPORT",
  tagline: "YOUR FREIGHT, OUR COMMITMENT",
  phone: "(206) 765-6300",
  email: "thindcarrier@gmail.com",
  website: "thindtransport.com",
  location: "Kent, WA 98064",
  dot: "USDOT #3154006",
  services: ["Flatbed", "Reefer", "Dry Van"],
  hiring: [
    { role: "Company Drivers", pay: "$78K–$110K/yr" },
    { role: "Owner Operators", pay: "$150K–$250K/yr", highlight: true },
  ],
  stats: [
    { label: "Commission", value: "91%" },
    { label: "States", value: "48" },
    { label: "Since", value: "2016" },
  ],
}

function CardFront() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#001F3F] via-[#001A35] to-[#00101F]">
      {/* Background texture */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-orange/[0.04] to-transparent rounded-bl-full" />
      </div>

      {/* Orange top edge accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange via-orange-300 to-orange" />

      <div className="relative z-10 h-full grid grid-cols-[1fr_auto] gap-4 p-5 sm:p-7">
        {/* LEFT COLUMN */}
        <div className="flex flex-col justify-between min-w-0">
          {/* Company name */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-base sm:text-lg font-black tracking-tight leading-none">THIND</span>
              <span className="text-orange text-base sm:text-lg font-black tracking-tight leading-none">TRANSPORT</span>
            </div>
            <div className="w-16 h-[2px] bg-gradient-to-r from-orange to-transparent rounded-full" />
          </div>

          {/* Owner */}
          <div className="mt-3 sm:mt-4">
            <h3 className="text-white text-xl sm:text-3xl font-black tracking-tight leading-none">{CARD.owner}</h3>
            <p className="text-orange/80 text-[9px] sm:text-[11px] font-semibold tracking-[0.25em] mt-1">{CARD.title.toUpperCase()}</p>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 sm:gap-5 mt-3 sm:mt-4">
            {CARD.stats.map((s) => (
              <div key={s.label}>
                <p className="text-orange text-lg sm:text-2xl font-black leading-none">{s.value}</p>
                <p className="text-white/40 text-[7px] sm:text-[9px] font-semibold tracking-wider mt-0.5">{s.label.toUpperCase()}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/10 mt-3 sm:mt-4" />

          {/* Services */}
          <div className="mt-2 sm:mt-3">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {CARD.services.map((s) => (
                <span key={s} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-orange/10 border border-orange/20 text-orange text-[8px] sm:text-[10px] font-bold tracking-wider">
                  {s.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Hiring / Opportunities */}
          <div className="mt-2 sm:mt-3 space-y-1">
            {CARD.hiring.map((h) => (
              <div key={h.role} className="flex items-center gap-1.5">
                <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${h.highlight ? "bg-orange" : "bg-white/40"}`} />
                <span className="text-white/70 text-[9px] sm:text-[11px]">{h.role}</span>
                <span className={`text-[9px] sm:text-[11px] font-bold ${h.highlight ? "text-orange" : "text-white/90"}`}>{h.pay}</span>
              </div>
            ))}
          </div>

          {/* Contact row */}
          <div className="mt-auto pt-3 sm:pt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[
              { icon: "phone", val: CARD.phone },
              { icon: "email", val: CARD.email },
              { icon: "web", val: CARD.website },
              { icon: "location", val: CARD.location },
            ].map((c) => (
              <div key={c.icon} className="flex items-center gap-1.5 min-w-0">
                <CIcon type={c.icon} />
                <span className="text-white/90 text-[8px] sm:text-[10px] font-medium truncate">{c.val}</span>
              </div>
            ))}
          </div>

          {/* DOT */}
          <p className="text-[7px] sm:text-[8px] text-white/20 mt-1.5 font-medium">{CARD.dot} &middot; FMCSA CERTIFIED</p>
        </div>

        {/* RIGHT COLUMN - QR */}
        <div className="flex flex-col items-center justify-end">
          <div className="w-[72px] h-[72px] sm:w-[100px] sm:h-[100px] bg-white rounded-lg p-1 sm:p-1.5 shadow-xl shadow-black/30">
            <div className="w-full h-full rounded-[3px] bg-white grid grid-cols-7 grid-rows-7 gap-[0.5px] sm:gap-[1px] p-0.5 sm:p-1">
              <QRPattern />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-center">
            <p className="text-orange text-[7px] sm:text-[9px] font-bold tracking-[0.1em] leading-tight">SCAN TO</p>
            <p className="text-orange text-[7px] sm:text-[9px] font-bold tracking-[0.1em] leading-tight">APPLY NOW</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0f2744] to-[#1a3a5c]" />

      {/* Atmospheric haze near horizon */}
      <div className="absolute bottom-[28%] left-0 right-0 h-[18%] bg-gradient-to-t from-[#2a4a6a]/40 to-transparent" />
      <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-[130%] h-[8%] bg-orange/[0.06] rounded-[50%] blur-2xl" />

      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { x: 8, y: 5, o: 0.6 }, { x: 15, y: 12, o: 0.3 }, { x: 22, y: 3, o: 0.5 },
          { x: 35, y: 8, o: 0.4 }, { x: 45, y: 4, o: 0.7 }, { x: 55, y: 10, o: 0.3 },
          { x: 62, y: 3, o: 0.5 }, { x: 72, y: 7, o: 0.4 }, { x: 80, y: 5, o: 0.6 },
          { x: 88, y: 11, o: 0.3 }, { x: 93, y: 4, o: 0.5 }, { x: 28, y: 15, o: 0.2 },
          { x: 68, y: 14, o: 0.25 }, { x: 50, y: 6, o: 0.35 },
        ].map((s, i) => (
          <div key={i} className="absolute w-[1px] h-[1px] bg-white rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o }} />
        ))}
      </div>

      {/* Road surface */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%]">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0 L1000 300 L0 300Z" fill="#1c1c1c" />
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0" stroke="#FF9500" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M0 170 Q250 140 500 130 Q750 120 1000 105" stroke="#FFB340" strokeWidth="2" strokeDasharray="40 25" fill="none" opacity="0.35" />
          <path d="M0 300 L1000 300" stroke="#FF9500" strokeWidth="1.5" fill="none" opacity="0.15" />
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-7">
        {/* Top: Company name + tagline */}
        <div className="text-center">
          <h3 className="text-white text-2xl sm:text-4xl font-black tracking-tight leading-none">
            THIND <span className="text-orange">TRANSPORT</span>
          </h3>
          <div className="mx-auto w-32 sm:w-48 h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent rounded-full mt-2 sm:mt-3" />
          <p className="text-white/50 text-[8px] sm:text-[11px] tracking-[0.35em] mt-1.5 sm:mt-2 font-medium">{CARD.tagline}</p>
        </div>

        {/* Center: Truck illustration on road */}
        <div className="flex-1 flex items-center justify-center relative -mb-4 sm:-mb-6">
          <TruckScene />
        </div>

        {/* Bottom: Service badges */}
        <div className="relative z-20">
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            {[
              { label: "FLATBED", icon: "M2 8h16M4 4h12l2 4H2l2-4z" },
              { label: "REEFER", icon: "M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm7 2v6m-3-3h6" },
              { label: "DRY VAN", icon: "M3 6h14l1 2v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8l1-2zm0 3h14" },
              { label: "48 STATES", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 002 2v1.93zM17 15.9A6.976 6.976 0 0019 12c0-.34-.04-.67-.09-1h-2.83l-4.17 4.17 1.42 1.42L17 15.9z" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d={b.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/70 text-[7px] sm:text-[9px] font-bold tracking-wider">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/25 text-[8px] sm:text-[10px] tracking-[0.2em] font-semibold">THINDTRANSPORT.COM</p>
        </div>
      </div>
    </div>
  )
}

function TruckScene() {
  return (
    <svg viewBox="0 0 500 200" className="w-[85%] sm:w-[80%] max-w-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Journey trail behind truck - glowing path */}
      <defs>
        <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9500" stopOpacity="0" />
          <stop offset="40%" stopColor="#FF9500" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FF9500" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="trailLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9500" stopOpacity="0" />
          <stop offset="60%" stopColor="#FF9500" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF9500" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#E07800" />
        </linearGradient>
        <linearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFa520" />
          <stop offset="100%" stopColor="#E68600" />
        </linearGradient>
        <linearGradient id="wheelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333" />
          <stop offset="100%" stopColor="#111" />
        </linearGradient>
        <linearGradient id="headlightGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFEEBB" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFEEBB" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Journey trail - wide glow */}
      <path d="M0 138 Q60 136 120 135 Q180 134 250 133" stroke="url(#trailGrad)" strokeWidth="18" fill="none" strokeLinecap="round" />

      {/* Journey trail - thin bright line */}
      <path d="M30 138 Q90 136 150 135 Q210 134 250 133" stroke="url(#trailLine)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Journey dots (waypoints fading behind) */}
      <circle cx="60" cy="137" r="2" fill="#FF9500" opacity="0.12" />
      <circle cx="100" cy="136" r="2.5" fill="#FF9500" opacity="0.2" />
      <circle cx="145" cy="135.5" r="3" fill="#FF9500" opacity="0.3" />
      <circle cx="195" cy="134.5" r="3" fill="#FF9500" opacity="0.4" />

      {/* Headlight beams from front of truck */}
      <ellipse cx="440" cy="128" rx="55" ry="8" fill="url(#headlightGlow)" filter="url(#softGlow)" />

      {/* === TRUCK === */}
      <g transform="translate(228, 78)">
        {/* Trailer shadow */}
        <ellipse cx="100" cy="80" rx="120" ry="6" fill="rgba(0,0,0,0.25)" />

        {/* Trailer undercarriage */}
        <rect x="2" y="52" width="148" height="6" rx="1" fill="#333" />

        {/* Trailer body */}
        <rect x="0" y="6" width="152" height="48" rx="3" fill="url(#bodyGrad)" />
        <rect x="0" y="6" width="152" height="48" rx="3" stroke="#CC7700" strokeWidth="0.8" fill="none" />

        {/* Trailer panel lines */}
        {[20, 40, 60, 80, 100, 120].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="52" stroke="#CC7700" strokeWidth="0.4" opacity="0.4" />
        ))}

        {/* Subtle shading on trailer top */}
        <rect x="0" y="6" width="152" height="8" rx="3" fill="white" opacity="0.08" />

        {/* THIND TRANSPORT on trailer */}
        <text x="76" y="28" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="900" fill="#001F3F" textAnchor="middle" letterSpacing="0.5">THIND</text>
        <rect x="42" y="31" width="68" height="1.5" rx="0.75" fill="#001F3F" opacity="0.3" />
        <text x="76" y="44" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="700" fill="#001F3F" textAnchor="middle" letterSpacing="3">TRANSPORT</text>

        {/* Connection plate between trailer and cab */}
        <rect x="150" y="20" width="8" height="30" rx="1" fill="#888" />
        <rect x="152" y="25" width="4" height="20" rx="1" fill="#666" />

        {/* Cab body */}
        <path d="M156 10 L180 10 Q200 10 210 24 L220 44 Q222 50 222 54 L222 58 Q222 60 220 60 L156 60 L156 10Z" fill="url(#cabGrad)" />
        <path d="M156 10 L180 10 Q200 10 210 24 L220 44 Q222 50 222 54 L222 58 Q222 60 220 60 L156 60 L156 10Z" stroke="#CC7700" strokeWidth="0.8" fill="none" />

        {/* Cab highlight / chrome strip */}
        <line x1="156" y1="56" x2="222" y2="56" stroke="#FFD080" strokeWidth="1" opacity="0.4" />

        {/* Windshield */}
        <path d="M168 13 L190 13 Q204 13 212 26 L218 42 L218 48 Q218 50 216 50 L168 50 L168 13Z" fill="#0a1628" opacity="0.85" />
        <path d="M168 13 L190 13 Q204 13 212 26 L218 42" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none" />
        {/* Windshield reflection */}
        <path d="M172 16 L185 16 Q196 16 204 26 L208 34" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Headlights */}
        <rect x="221" y="38" width="4" height="10" rx="1.5" fill="#FFEEBB" opacity="0.95" filter="url(#glow)" />
        <rect x="221" y="52" width="4" height="5" rx="1" fill="#FF3333" opacity="0.8" />

        {/* Side mirror */}
        <rect x="224" y="20" width="3" height="8" rx="1" fill="#555" />
        <rect x="225" y="21" width="2" height="5" rx="0.5" fill="#888" />

        {/* Bumper */}
        <rect x="223" y="56" width="5" height="6" rx="1" fill="#888" />

        {/* Exhaust stacks */}
        <rect x="162" y="-6" width="3.5" height="18" rx="1.5" fill="#777" />
        <rect x="169" y="-3" width="3.5" height="15" rx="1.5" fill="#777" />
        {/* Exhaust smoke wisps */}
        <circle cx="164" cy="-9" r="2" fill="white" opacity="0.04" />
        <circle cx="165" cy="-13" r="3" fill="white" opacity="0.03" />
        <circle cx="171" cy="-7" r="2" fill="white" opacity="0.04" />

        {/* Fuel tank */}
        <rect x="156" y="48" width="18" height="10" rx="3" fill="#555" stroke="#666" strokeWidth="0.5" />

        {/* Trailer wheels (tandem rear) */}
        {[28, 48].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="62" r="10" fill="url(#wheelGrad)" />
            <circle cx={cx} cy="62" r="7" fill="#222" />
            <circle cx={cx} cy="62" r="4.5" fill="#333" />
            <circle cx={cx} cy="62" r="2" fill="#555" />
            {/* Lug pattern */}
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <circle key={angle} cx={cx + Math.cos(angle * Math.PI / 180) * 5.5} cy={62 + Math.sin(angle * Math.PI / 180) * 5.5} r="0.6" fill="#444" />
            ))}
            <circle cx={cx} cy="62" r="10" fill="none" stroke="#444" strokeWidth="0.5" />
          </g>
        ))}

        {/* Front trailer wheels */}
        {[118, 138].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="62" r="10" fill="url(#wheelGrad)" />
            <circle cx={cx} cy="62" r="7" fill="#222" />
            <circle cx={cx} cy="62" r="4.5" fill="#333" />
            <circle cx={cx} cy="62" r="2" fill="#555" />
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <circle key={angle} cx={cx + Math.cos(angle * Math.PI / 180) * 5.5} cy={62 + Math.sin(angle * Math.PI / 180) * 5.5} r="0.6" fill="#444" />
            ))}
            <circle cx={cx} cy="62" r="10" fill="none" stroke="#444" strokeWidth="0.5" />
          </g>
        ))}

        {/* Cab drive wheels */}
        <g>
          <circle cx="198" cy="62" r="11" fill="url(#wheelGrad)" />
          <circle cx="198" cy="62" r="8" fill="#222" />
          <circle cx="198" cy="62" r="5" fill="#333" />
          <circle cx="198" cy="62" r="2.5" fill="#555" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <circle key={angle} cx={198 + Math.cos(angle * Math.PI / 180) * 6.5} cy={62 + Math.sin(angle * Math.PI / 180) * 6.5} r="0.7" fill="#444" />
          ))}
          <circle cx="198" cy="62" r="11" fill="none" stroke="#444" strokeWidth="0.5" />
        </g>

        {/* Mud flaps */}
        <rect x="53" y="62" width="4" height="8" rx="0.5" fill="#333" />
        <rect x="143" y="62" width="4" height="8" rx="0.5" fill="#333" />
      </g>

      {/* Forward journey dots (destination ahead) */}
      <circle cx="470" cy="130" r="2.5" fill="#FF9500" opacity="0.35" />
      <circle cx="488" cy="129" r="2" fill="#FF9500" opacity="0.2" />
    </svg>
  )
}

function CIcon({ type }: { type: string }) {
  const cls = "w-2 h-2 sm:w-2.5 sm:h-2.5 text-orange flex-shrink-0"
  const paths: Record<string, string> = {
    phone: "M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z",
    email: "M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z",
    web: "M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
    location: "M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  }
  if (type === "web") {
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
      <path d={paths[type] || ""} />
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
              { label: "Primary Color", value: "#001F3F (Navy)" },
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
              { href: "/branding/thind-transport-logo.svg", label: "Logo (SVG)", style: "bg-orange" },
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
