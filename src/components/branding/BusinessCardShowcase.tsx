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
    { label: "Since", value: "2014" },
  ],
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H14a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  )
}

function FlatbedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="14" width="18" height="2" rx="0.5" />
      <path d="M19 14h2.5a1.5 1.5 0 011.5 1.5V18h-4" />
      <circle cx="6" cy="19" r="2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="19" r="2" fill="currentColor" stroke="none" />
      <path d="M1 14V11l3-5h5" />
      <line x1="4" y1="8" x2="7" y2="8" />
    </svg>
  )
}

function ReeferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="15" height="10" rx="1" />
      <path d="M16 8h4.5a1.5 1.5 0 011.5 1.5V18h-6" />
      <circle cx="6" cy="19" r="2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="19" r="2" fill="currentColor" stroke="none" />
      <path d="M8.5 9v4M6.5 11h4" />
    </svg>
  )
}

function DryVanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="15" height="12" rx="1" />
      <path d="M16 9h4.5a1.5 1.5 0 011.5 1.5V18h-6" />
      <circle cx="6" cy="19" r="2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="19" r="2" fill="currentColor" stroke="none" />
      <path d="M4 5v12M8 5v12M12 5v12" opacity="0.35" />
    </svg>
  )
}

function StatesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l3-3 4 2 4-2 4 2 3-3v13l-3 3-4-2-4 2-4-2-3 3V7z" />
      <line x1="7" y1="4" x2="7" y2="18" opacity="0.3" />
      <line x1="11" y1="6" x2="11" y2="20" opacity="0.3" />
      <line x1="15" y1="4" x2="15" y2="18" opacity="0.3" />
    </svg>
  )
}

function CardFront() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#001F3F] via-[#001A35] to-[#00101F]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="absolute top-0 right-0 w-[55%] h-[55%] bg-gradient-to-bl from-orange/[0.035] to-transparent rounded-bl-full" />
      </div>

      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange via-orange-300 to-orange" />

      <div className="relative z-10 h-full grid grid-cols-[1fr_auto] gap-3 sm:gap-5 p-5 sm:p-7">
        {/* LEFT */}
        <div className="flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-white text-sm sm:text-base font-black tracking-tight leading-none">THIND</span>
              <span className="text-orange text-sm sm:text-base font-black tracking-tight leading-none">TRANSPORT</span>
            </div>
            <div className="w-14 h-[2px] bg-gradient-to-r from-orange to-transparent rounded-full" />
          </div>

          <div className="mt-2 sm:mt-3">
            <h3 className="text-white text-xl sm:text-[28px] font-black tracking-tight leading-none">{CARD.owner}</h3>
            <p className="text-orange/80 text-[9px] sm:text-[11px] font-semibold tracking-[0.25em] mt-0.5">{CARD.title.toUpperCase()}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 sm:gap-4 mt-2.5 sm:mt-3">
            {CARD.stats.map((s) => (
              <div key={s.label} className="bg-white/[0.04] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 border border-white/[0.06]">
                <p className="text-orange text-base sm:text-xl font-black leading-none">{s.value}</p>
                <p className="text-white/35 text-[6px] sm:text-[8px] font-bold tracking-wider mt-0.5">{s.label.toUpperCase()}</p>
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-white/[0.08] mt-2.5 sm:mt-3" />

          {/* Services */}
          <div className="flex gap-1 sm:gap-1.5 mt-2 sm:mt-2.5 flex-wrap">
            {[
              { label: "Flatbed", Icon: FlatbedIcon },
              { label: "Reefer", Icon: ReeferIcon },
              { label: "Dry Van", Icon: DryVanIcon },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex items-center gap-1 px-2 sm:px-2.5 py-[3px] sm:py-1 rounded-md bg-orange/[0.08] border border-orange/15">
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange" />
                <span className="text-orange text-[7px] sm:text-[9px] font-bold tracking-wide">{label.toUpperCase()}</span>
              </div>
            ))}
          </div>

          {/* Hiring */}
          <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
            {CARD.hiring.map((h) => (
              <div key={h.role} className="flex items-center gap-1.5">
                <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${h.highlight ? "bg-orange" : "bg-white/30"}`} />
                <span className="text-white/60 text-[8px] sm:text-[10px]">{h.role}</span>
                <span className={`text-[8px] sm:text-[10px] font-bold ${h.highlight ? "text-orange" : "text-white/85"}`}>{h.pay}</span>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-auto pt-2 sm:pt-3 grid grid-cols-2 gap-x-2 gap-y-1 sm:gap-y-1.5">
            <ContactRow Icon={PhoneIcon} val={CARD.phone} />
            <ContactRow Icon={EmailIcon} val={CARD.email} />
            <ContactRow Icon={GlobeIcon} val={CARD.website} />
            <ContactRow Icon={PinIcon} val={CARD.location} />
          </div>

          <p className="text-[6px] sm:text-[7px] text-white/15 mt-1 font-medium tracking-wide">{CARD.dot} &middot; FMCSA CERTIFIED</p>
        </div>

        {/* RIGHT - QR */}
        <div className="flex flex-col items-center justify-end">
          <div className="w-[68px] h-[68px] sm:w-[96px] sm:h-[96px] bg-white rounded-lg p-1 sm:p-1.5 shadow-xl shadow-black/40 ring-1 ring-white/10">
            <div className="w-full h-full rounded bg-white grid grid-cols-7 grid-rows-7 gap-[0.5px] sm:gap-[1px] p-0.5 sm:p-1">
              <QRPattern />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 text-center">
            <p className="text-orange text-[6px] sm:text-[8px] font-bold tracking-[0.12em] leading-tight">SCAN TO</p>
            <p className="text-orange text-[6px] sm:text-[8px] font-bold tracking-[0.12em] leading-tight">APPLY NOW</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactRow({ Icon, val }: { Icon: React.FC<{ className?: string }>; val: string }) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-orange/[0.08] flex items-center justify-center flex-shrink-0 border border-orange/10">
        <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-orange" />
      </div>
      <span className="text-white/85 text-[7px] sm:text-[9px] font-medium truncate">{val}</span>
    </div>
  )
}

function CardBack() {
  return (
    <div className="relative w-full aspect-[3.46/2.32] rounded-xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0f2744] to-[#1a3a5c]" />

      <div className="absolute bottom-[26%] left-0 right-0 h-[20%] bg-gradient-to-t from-[#2a4a6a]/30 to-transparent" />
      <div className="absolute bottom-[24%] left-1/2 -translate-x-1/2 w-[140%] h-[6%] bg-orange/[0.05] rounded-[50%] blur-2xl" />

      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { x: 6, y: 4, o: 0.5 }, { x: 14, y: 11, o: 0.25 }, { x: 21, y: 3, o: 0.45 },
          { x: 33, y: 7, o: 0.35 }, { x: 44, y: 3, o: 0.6 }, { x: 54, y: 9, o: 0.25 },
          { x: 61, y: 2, o: 0.4 }, { x: 71, y: 6, o: 0.35 }, { x: 79, y: 4, o: 0.5 },
          { x: 87, y: 10, o: 0.25 }, { x: 92, y: 3, o: 0.4 }, { x: 27, y: 14, o: 0.15 },
          { x: 67, y: 13, o: 0.2 }, { x: 49, y: 5, o: 0.3 },
        ].map((s, i) => (
          <div key={i} className="absolute w-[1px] h-[1px] bg-white rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o }} />
        ))}
      </div>

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%]">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0 L1000 300 L0 300Z" fill="#1c1c1c" />
          <path d="M0 80 Q250 40 500 30 Q750 20 1000 0" stroke="#FF9500" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M0 170 Q250 140 500 130 Q750 120 1000 105" stroke="#FFB340" strokeWidth="2" strokeDasharray="40 25" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-7">
        {/* Top */}
        <div className="text-center">
          <h3 className="text-white text-2xl sm:text-[38px] font-black tracking-tight leading-none">
            THIND <span className="text-orange">TRANSPORT</span>
          </h3>
          <div className="mx-auto w-28 sm:w-44 h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent rounded-full mt-2 sm:mt-2.5" />
          <p className="text-white/40 text-[7px] sm:text-[10px] tracking-[0.4em] mt-1.5 font-medium">{CARD.tagline}</p>
        </div>

        {/* Center: Truck scene with business silhouettes */}
        <div className="flex-1 flex items-center justify-center relative -mb-3 sm:-mb-5">
          <TruckScene />
        </div>

        {/* Bottom: Service badges */}
        <div className="relative z-20">
          <div className="flex justify-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
            {[
              { label: "FLATBED", Icon: FlatbedIcon },
              { label: "REEFER", Icon: ReeferIcon },
              { label: "DRY VAN", Icon: DryVanIcon },
              { label: "48 STATES", Icon: StatesIcon },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm">
                <Icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-orange/70" />
                <span className="text-white/55 text-[6px] sm:text-[9px] font-bold tracking-wider">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/20 text-[7px] sm:text-[9px] tracking-[0.2em] font-semibold">THINDTRANSPORT.COM</p>
        </div>
      </div>
    </div>
  )
}

function TruckScene() {
  return (
    <svg viewBox="0 0 600 220" className="w-[92%] sm:w-[88%] max-w-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <linearGradient id="sceneVignette" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="85%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.03" />
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

      {/* === LEFT SIDE: WAREHOUSE & OPERATIONS === */}

      {/* Warehouse building */}
      <g opacity="0.12">
        <rect x="8" y="72" width="80" height="68" rx="2" fill="white" />
        <path d="M2 72 L48 48 L94 72" fill="white" opacity="0.7" />
        {/* Windows */}
        <rect x="14" y="78" width="14" height="16" rx="1" fill="white" opacity="0.3" />
        <rect x="34" y="78" width="14" height="16" rx="1" fill="white" opacity="0.3" />
        <rect x="54" y="78" width="14" height="16" rx="1" fill="white" opacity="0.3" />
        {/* Loading bay doors */}
        <rect x="10" y="110" width="24" height="30" rx="1" fill="white" opacity="0.5" />
        <rect x="38" y="110" width="24" height="30" rx="1" fill="white" opacity="0.5" />
        <rect x="66" y="110" width="18" height="30" rx="1" fill="white" opacity="0.5" />
        {/* Door lines */}
        <line x1="22" y1="112" x2="22" y2="140" stroke="white" strokeWidth="0.5" opacity="0.3" />
        <line x1="50" y1="112" x2="50" y2="140" stroke="white" strokeWidth="0.3" opacity="0.3" />
      </g>

      {/* Forklift at warehouse */}
      <g opacity="0.13" transform="translate(96, 112)">
        {/* Forklift body */}
        <rect x="0" y="10" width="18" height="14" rx="2" fill="white" />
        <rect x="-4" y="8" width="6" height="18" rx="1" fill="white" />
        {/* Forklift mast */}
        <rect x="16" y="-2" width="3" height="28" rx="0.5" fill="white" />
        <rect x="14" y="0" width="8" height="3" rx="0.5" fill="white" />
        {/* Pallet on forks */}
        <rect x="12" y="-6" width="14" height="8" rx="1" fill="white" opacity="0.5" />
        {/* Wheels */}
        <circle cx="5" cy="26" r="3" fill="white" />
        <circle cx="14" cy="26" r="3" fill="white" />
        {/* Driver on forklift */}
        <circle cx="8" cy="4" r="3.5" fill="white" />
        <rect x="5" y="7" width="6" height="5" rx="2" fill="white" />
      </g>

      {/* Dispatcher/office scene (upper left) */}
      <g opacity="0.10" transform="translate(18, 35)">
        {/* Desk */}
        <rect x="0" y="20" width="30" height="3" rx="0.5" fill="white" />
        <rect x="2" y="23" width="3" height="10" rx="0.5" fill="white" />
        <rect x="25" y="23" width="3" height="10" rx="0.5" fill="white" />
        {/* Monitor */}
        <rect x="5" y="8" width="16" height="12" rx="1.5" fill="white" />
        <rect x="7" y="10" width="12" height="8" rx="0.5" fill="white" opacity="0.3" />
        <rect x="11" y="20" width="4" height="2" rx="0.5" fill="white" />
        {/* Person at desk */}
        <circle cx="35" cy="12" r="4.5" fill="white" />
        <rect x="31" y="17" width="8" height="8" rx="2.5" fill="white" />
        {/* Arm reaching to keyboard */}
        <line x1="31" y1="20" x2="24" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Headset */}
        <path d="M31 10 Q28 6 31 4" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Worker with hand truck / loading cargo */}
      <g opacity="0.11" transform="translate(140, 108)">
        {/* Person */}
        <circle cx="8" cy="2" r="4" fill="white" />
        <rect x="5" y="6" width="6" height="14" rx="2" fill="white" />
        {/* Legs */}
        <line x1="7" y1="20" x2="4" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="20" x2="13" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms pushing */}
        <line x1="11" y1="10" x2="20" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Hand truck */}
        <line x1="20" y1="2" x2="20" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="24" x2="26" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="19" cy="27" r="2.5" fill="white" />
        <circle cx="25" cy="27" r="2.5" fill="white" />
        {/* Boxes on hand truck */}
        <rect x="17" y="-2" width="10" height="8" rx="1" fill="white" opacity="0.6" />
        <rect x="18" y="-10" width="8" height="8" rx="1" fill="white" opacity="0.4" />
      </g>

      {/* Mechanic under truck area */}
      <g opacity="0.09" transform="translate(180, 140)">
        {/* Person bending */}
        <circle cx="8" cy="2" r="3.5" fill="white" />
        <path d="M5 6 Q5 14 12 16" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Wrench */}
        <line x1="14" y1="10" x2="24" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="25" cy="5" r="3" fill="none" stroke="white" strokeWidth="1.5" />
        {/* Toolbox */}
        <rect x="-4" y="12" width="12" height="7" rx="1" fill="white" opacity="0.5" />
        <line x1="-4" y1="15" x2="8" y2="15" stroke="white" strokeWidth="0.5" opacity="0.3" />
      </g>

      {/* Headlight beams */}
      <ellipse cx="510" cy="140" rx="65" ry="9" fill="url(#headlightGlow)" filter="url(#softGlow)" />

      {/* === TRUCK (centered) === */}
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

        <text x="78" y="31" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fontWeight="900" fill="#001F3F" textAnchor="middle" letterSpacing="0.5">THIND</text>
        <rect x="44" y="34" width="68" height="1.5" rx="0.75" fill="#001F3F" opacity="0.2" />
        <text x="78" y="48" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="700" fill="#001F3F" textAnchor="middle" letterSpacing="3">TRANSPORT</text>

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

      {/* === RIGHT SIDE: BROKERS, CLIENTS, DESTINATION === */}

      {/* Distant city skyline */}
      <g opacity="0.07">
        <rect x="500" y="55" width="10" height="55" rx="1" fill="white" />
        <rect x="513" y="40" width="12" height="70" rx="1" fill="white" />
        <rect x="528" y="50" width="15" height="60" rx="1" fill="white" />
        <rect x="546" y="60" width="10" height="50" rx="1" fill="white" />
        <rect x="559" y="48" width="8" height="62" rx="1" fill="white" />
        <rect x="570" y="58" width="12" height="52" rx="1" fill="white" />
        {/* Windows on tallest building */}
        {[46, 52, 58, 64, 70, 76, 82, 88, 94].map((y) => (
          <g key={y}>
            <rect x="515" y={y} width="3" height="2" rx="0.3" fill="white" opacity="0.3" />
            <rect x="520" y={y} width="3" height="2" rx="0.3" fill="white" opacity="0.3" />
          </g>
        ))}
      </g>

      {/* Broker handshake deal */}
      <g opacity="0.12" transform="translate(508, 105)">
        {/* Person 1 - suit */}
        <circle cx="10" cy="4" r="5" fill="white" />
        <rect x="6" y="9" width="8" height="16" rx="2.5" fill="white" />
        <line x1="8" y1="25" x2="5" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="25" x2="16" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arm reaching to shake */}
        <line x1="14" y1="14" x2="26" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />

        {/* Person 2 */}
        <circle cx="40" cy="4" r="5" fill="white" />
        <rect x="36" y="9" width="8" height="16" rx="2.5" fill="white" />
        <line x1="38" y1="25" x2="34" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="42" y1="25" x2="46" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="36" y1="14" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />

        {/* Handshake point */}
        <circle cx="25" cy="16" r="3" fill="white" opacity="0.5" />
      </g>

      {/* Person with tablet/phone (operations coordinator) */}
      <g opacity="0.10" transform="translate(555, 96)">
        <circle cx="8" cy="4" r="4.5" fill="white" />
        <rect x="4" y="9" width="8" height="14" rx="2.5" fill="white" />
        <line x1="6" y1="23" x2="3" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="23" x2="14" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Holding tablet */}
        <rect x="14" y="10" width="7" height="10" rx="1" fill="white" opacity="0.6" />
        <line x1="12" y1="14" x2="14" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        {/* Signal lines from tablet */}
        <path d="M19 7 Q22 5 21 2" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M21 8 Q25 5 24 1" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" />
      </g>

      {/* Loading dock worker at trailer back */}
      <g opacity="0.10" transform="translate(236, 108)">
        <circle cx="8" cy="2" r="4" fill="white" />
        <rect x="5" y="6" width="6" height="12" rx="2" fill="white" />
        <line x1="7" y1="18" x2="4" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="18" x2="13" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Clipboard in hand */}
        <rect x="13" y="6" width="6" height="8" rx="1" fill="white" opacity="0.5" />
        <line x1="14" y1="9" x2="18" y2="9" stroke="white" strokeWidth="0.6" opacity="0.4" />
        <line x1="14" y1="11" x2="17" y2="11" stroke="white" strokeWidth="0.6" opacity="0.4" />
        <line x1="11" y1="8" x2="13" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Fuel pump / gas station element */}
      <g opacity="0.08" transform="translate(95, 68)">
        <rect x="0" y="10" width="12" height="24" rx="2" fill="white" />
        <rect x="2" y="14" width="8" height="6" rx="1" fill="white" opacity="0.3" />
        {/* Nozzle */}
        <path d="M12 18 Q20 18 20 12 L20 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="-2" y="34" width="16" height="3" rx="1" fill="white" />
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
