import Link from "next/link"
import { preload } from "react-dom"
import { MessageCircle, Phone, TrendingUp, ArrowRight, ExternalLink } from "lucide-react"
import { HeroBackground } from "./HeroBackground"
import { COMPANY_INFO, EQUIPMENT, FMCSA_LINKS, PAY_RATES, STATS } from "@/lib/constants"

/**
 * Server-rendered hero with CSS-only entrance animations.
 * Keeping this out of the client bundle makes the headline paint immediately
 * (no hydration wait), which is what drives the LCP score.
 */
export const CinematicHero = () => {
  // The video poster IS the LCP element — without a high-priority preload it
  // queues behind fonts/scripts and lands ~2s late on throttled mobile.
  preload("/images/generated/hero-poster.webp", { as: "image", fetchPriority: "high" })
  return (
    // svh, not vh: on iOS the large viewport unit made the hero taller than the
    // visible area while the URL bar was showing, then jumped when it collapsed.
    <section className="relative min-h-[88svh] w-full flex items-center overflow-hidden bg-navy-800">
      <HeroBackground />

      {/* Legibility scrim: one horizontal gradient heavy under the copy and
          clearing to the right where the truck sits, plus a bottom fade into
          the next band. The old third layer (a 70px-blur orb) is gone. */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-navy-900/94 via-navy-900/85 to-navy-900/60 md:via-navy-900/70 md:to-navy-900/15" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-navy-900 via-transparent to-navy-900/20" />

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="max-w-4xl hero-stagger">
          <div className="fleet-badge mb-5">
            <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-600" />
            </span>
            Family-run since {COMPANY_INFO.founded} · Kent, WA
          </div>

          <h1 className="text-left text-white drop-shadow-md mb-5 text-m-display lg:text-m-hero">
            {/* The number comes from constants, never typed here (AGENTS.md). */}
            Keep <span className="text-gradient-accent">{PAY_RATES.ownerOperator.commission} of your gross.</span>
            <span className="block text-xl sm:text-2xl md:text-3xl text-steel-200 font-sans font-semibold mt-3 tracking-normal leading-snug text-balance">
              {`Real dispatch that answers, ${EQUIPMENT.short}, and zero forced loads — from a family that drives, too.`}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-steel-200 max-w-2xl mb-8 leading-relaxed">
            {/* One expression, no adjacent bare text — the compiler drops bare
                spaces next to expression containers (see IntegrationsPanel note). */}
            {`Owner-operators keep ${PAY_RATES.ownerOperator.commission} of the gross. Company drivers run ${EQUIPMENT.short} at ${PAY_RATES.companyDriver.otr.perMile}/mile with weekly pay. ${new Date().getFullYear() - COMPANY_INFO.founded} years out of Kent, WA — you drive, we handle the rest.`}
          </p>

          {/* One button in the first viewport. Every recruiting site that
              converts pairs it with the literal phone number as text (drivers
              in trucks call, they don't type) and a quiet second path. */}
          <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-x-6 gap-y-3 mb-6">
            <Link
              href="#calculator"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-fleet bg-orange-600 px-7 text-base font-semibold text-white transition-colors hover:bg-orange-500 active:bg-orange-700"
            >
              <TrendingUp className="h-5 w-5" aria-hidden />
              See what you&apos;d earn
            </Link>
            <Link
              href="/apply"
              className="group inline-flex min-h-[44px] items-center gap-1.5 text-base font-semibold text-white underline-offset-4 hover:underline"
            >
              Start your application
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-steel-300">
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-steel-200 hover:text-white"
            >
              <Phone className="h-4 w-4" aria-hidden />
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
            <a
              href={`sms:${COMPANY_INFO.phoneFormatted}?body=Hi,%20I'm%20interested%20in%20driving%20for%20Thind%20Transport.`}
              className="inline-flex min-h-[44px] items-center gap-2 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Rather text? We&apos;ll call you right back.
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-fleet-lg border border-white/10 bg-navy-900/60 px-5 py-4 sm:gap-x-8 sm:px-7 md:divide-x md:divide-white/10">
            {[
              { value: PAY_RATES.ownerOperator.commission, label: "Owner-op gross", tone: "text-orange" },
              { value: PAY_RATES.companyDriver.otr.perMile, label: "Company / mile", tone: "text-gold" },
              { value: EQUIPMENT.modelYears, label: "Freightliner & Volvo", tone: "text-white" },
              { value: `${STATS.statesCovered}`, label: "States covered", tone: "text-gold" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2.5 md:block md:pl-6 md:first:pl-0">
                <span className={`font-display text-2xl font-bold leading-none tabular-nums md:text-3xl ${stat.tone}`}>
                  {stat.value}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-steel-300 md:mt-1 md:block">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* The trust strip that used to be its own section, as one line: the
              three checkable facts (Maverick's pattern) with the SAFER link a
              broker or a careful driver actually clicks. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel-300">
            <span>
              <span>USDOT </span>
              <span className="font-mono tabular-nums text-steel-200">{COMPANY_INFO.dot}</span>
            </span>
            <span>
              <span>MC </span>
              <span className="font-mono tabular-nums text-steel-200">{COMPANY_INFO.mc}</span>
            </span>
            <span>{`${STATS.trucksInFleet} trucks · ${STATS.statesCovered} states`}</span>
            <a
              href={FMCSA_LINKS.safer}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[32px] items-center gap-1 underline underline-offset-2 hover:text-white"
            >
              Verify on FMCSA SAFER
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent" />
    </section>
  )
}
