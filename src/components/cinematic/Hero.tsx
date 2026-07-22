import Link from "next/link"
import { MessageCircle, Phone, TrendingUp, ArrowRight } from "lucide-react"
import { HeroBackground } from "./HeroBackground"
import { COMPANY_INFO, STATS } from "@/lib/constants"

/**
 * Server-rendered hero with CSS-only entrance animations.
 * Keeping this out of the client bundle makes the headline paint immediately
 * (no hydration wait), which is what drives the LCP score.
 */
export const CinematicHero = () => {
  return (
    <section className="relative min-h-[88vh] w-full flex items-center overflow-hidden bg-navy-800">
      <HeroBackground />

      {/* Cinematic overlays for legibility + warmth */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-navy-900/95 via-navy-900/80 to-navy-900/45" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-navy-900 via-transparent to-navy-900/40" />
      <div className="accent-orb top-10 right-10 h-80 w-80 bg-orange-600/30 z-[1] animate-pulse-glow" />

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="max-w-4xl hero-stagger">
          <div className="fleet-badge mb-5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Family-run since {COMPANY_INFO.founded} · Kent, WA
          </div>

          <h1 className="text-left text-white drop-shadow-md mb-5">
            Keep <span className="text-gradient-accent">90% of your gross.</span>
            <span className="block text-xl sm:text-2xl md:text-3xl text-steel-200 font-bold mt-3 normal-case tracking-normal leading-snug">
              Real dispatch that answers, 2024 Cascadias, and zero forced loads &mdash; from a family that drives, too.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-steel-200 max-w-2xl mb-8 leading-relaxed">
            Owner-operators keep 90% of the gross. Company drivers run new Freightliners at $0.63/mile with weekly
            {/* Explicit {" "} — the compiler drops bare spaces between expression
                containers and adjacent text/entities (see IntegrationsPanel note). */}
            pay. {`${new Date().getFullYear() - COMPANY_INFO.founded} years out of Kent, WA`}{" "}&mdash; you drive, we handle the rest.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-7">
            <Link
              href="#calculator"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-fleet shadow-cta hover:shadow-cta-hover transition-all uppercase tracking-wide text-sm md:text-base font-display"
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
          </div>

          <a
            href="sms:+12067656300?body=Hi,%20I'm%20interested%20in%20driving%20for%20Thind%20Transport."
            className="text-sm text-steel-300 hover:text-orange inline-flex items-center gap-2 mb-8"
          >
            <MessageCircle className="w-4 h-4" />
            Rather text? We&apos;ll call you right back.
          </a>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-fleet-lg border border-steel-700/50 bg-navy-900/55 px-5 py-4 backdrop-blur-sm sm:gap-x-8 sm:px-7 md:divide-x md:divide-steel-700/50">
            {[
              { value: "90%", label: "Owner-op gross", tone: "text-orange" },
              { value: "$0.63", label: "Company / mile", tone: "text-gold" },
              { value: "2024", label: "Freightliner fleet", tone: "text-white" },
              { value: `${STATS.statesCovered}`, label: "States covered", tone: "text-gold" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2.5 md:block md:pl-6 md:first:pl-0">
                <span className={`font-display text-2xl font-bold leading-none md:text-3xl ${stat.tone}`}>
                  {stat.value}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-steel-300 md:mt-1 md:block">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent" />
    </section>
  )
}
