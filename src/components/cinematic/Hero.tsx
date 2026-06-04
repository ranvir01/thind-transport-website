"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { MessageCircle, Phone, TrendingUp, Truck, ArrowRight } from "lucide-react"
import { HeroBackground } from "./HeroBackground"
import { COMPANY_INFO } from "@/lib/constants"

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export const CinematicHero = () => {
  return (
    <section className="relative min-h-[94vh] w-full flex items-end overflow-hidden bg-navy-800">
      <HeroBackground />

      {/* Cinematic overlays for legibility + warmth */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-navy-900/95 via-navy-900/80 to-navy-900/45" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-navy-900 via-transparent to-navy-900/40" />
      <div className="accent-orb top-10 right-10 h-80 w-80 bg-orange-600/30 z-[1] animate-pulse-glow" />

      <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 md:pt-36 md:pb-24">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl">
          <motion.div variants={item} className="fleet-badge mb-5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Family-run carrier · Kent, Washington
          </motion.div>

          <motion.h1 variants={item} className="text-left text-white drop-shadow-md mb-5">
            The truck <span className="text-gradient-accent">works.</span>
            <span className="block text-2xl sm:text-3xl md:text-4xl text-steel-200 font-bold mt-3 normal-case tracking-normal">
              And so does the team behind it.
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-lg md:text-xl text-steel-200 max-w-2xl mb-8 leading-relaxed">
            We&apos;re a {new Date().getFullYear() - COMPANY_INFO.founded}-year family carrier out of Kent, WA. Real
            dispatch that picks up the phone, 2024 Cascadias, and no forced loads. You drive, we handle the rest.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-7">
            <Link
              href="#calculator"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-orange hover:bg-orange-400 text-white font-bold rounded-fleet shadow-cta hover:shadow-cta-hover transition-all uppercase tracking-wide text-sm md:text-base font-display"
            >
              <TrendingUp className="w-5 h-5" />
              See what you&apos;d earn
            </Link>
            <Link
              href="/apply"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-steel-500 bg-steel-800/40 hover:bg-steel-700/60 hover:border-orange/50 text-white font-semibold rounded-fleet text-sm md:text-base transition-all"
            >
              Apply in 60 seconds
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-steel-200 hover:text-orange font-semibold text-sm md:text-base transition-colors"
            >
              <Phone className="w-4 h-4" />
              {COMPANY_INFO.phone}
            </a>
          </motion.div>

          <motion.a
            variants={item}
            href="sms:+12067656300?body=Hi,%20I'm%20interested%20in%20driving%20for%20Thind%20Transport."
            className="text-sm text-steel-300 hover:text-orange inline-flex items-center gap-2 mb-8"
          >
            <MessageCircle className="w-4 h-4" />
            Rather text? We&apos;ll call you right back.
          </motion.a>

          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { value: "90%", label: "Owner-op gross", highlight: true },
              { value: "$0.63", label: "Company driver / mi", gold: true },
              { value: "2024", label: "Freightliner fleet" },
              { value: "A+", label: "FMCSA safety", gold: true },
            ].map((stat) => (
              <div
                key={stat.label}
                className={stat.highlight ? "fleet-stat-card fleet-stat-card--highlight" : "fleet-stat-card"}
              >
                <div
                  className={`text-2xl md:text-3xl font-bold font-display ${
                    stat.highlight ? "text-orange" : stat.gold ? "text-gold" : "text-white"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-steel-300 font-medium mt-1 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 fleet-safety-stripe z-10" />
    </section>
  )
}
