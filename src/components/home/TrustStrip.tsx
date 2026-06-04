"use client"

import { motion } from "framer-motion"
import { ShieldCheck, BadgeCheck, Award, Clock, MapPin, ExternalLink } from "lucide-react"
import { COMPANY_INFO, FMCSA_LINKS, STATS } from "@/lib/constants"

/**
 * Credential / trust row, inspired by the single "local · certified · approved"
 * proof line on high-trust service sites — adapted to a trucking carrier.
 *
 * Real, verifiable data is pulled from constants (USDOT, MC, location, years).
 * PLACEHOLDER stats below (on-time %, retention, safe miles) are realistic but
 * should be replaced with the carrier's actual figures before launch.
 */

const credentials = [
  {
    icon: ShieldCheck,
    value: COMPANY_INFO.dot,
    label: "USDOT #",
    sub: "Active FMCSA authority",
    href: FMCSA_LINKS.safer,
  },
  {
    icon: BadgeCheck,
    value: COMPANY_INFO.mc,
    label: "MC #",
    sub: "Verified motor carrier",
    href: FMCSA_LINKS.safer,
  },
  {
    icon: Award,
    value: "A+",
    label: "Safety rating",
    sub: "Clean CSA record", // PLACEHOLDER: confirm current FMCSA/CSA standing
    href: FMCSA_LINKS.safer,
    highlight: true,
  },
  {
    icon: Clock,
    value: "98.5%", // PLACEHOLDER: replace with real on-time delivery rate
    label: "On-time",
    sub: "Delivery performance",
  },
  {
    icon: ShieldCheck,
    value: "$1M+", // PLACEHOLDER: confirm liability coverage amount
    label: "Coverage",
    sub: "Liability insured",
  },
  {
    icon: MapPin,
    value: `${new Date().getFullYear() - COMPANY_INFO.founded}+`,
    label: "Years",
    sub: `Family-run · ${COMPANY_INFO.location}`,
  },
]

export function TrustStrip() {
  return (
    <section className="relative border-b border-steel-800 py-12 md:py-16">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-steel-400 md:text-base">
            {COMPANY_INFO.location}-Based
            <span className="mx-3 text-orange">·</span>
            FMCSA-Authorized
            <span className="mx-3 text-orange">·</span>
            Driver-Approved
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {credentials.map((item, index) => {
            const Icon = item.icon
            const card = (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`group relative h-full rounded-fleet-lg border p-4 text-center transition-transform duration-300 hover:-translate-y-1 ${
                  item.highlight
                    ? "border-orange/50 bg-gradient-to-br from-orange-500/15 to-navy-900/90"
                    : "border-steel-700/60 bg-navy-700/70"
                }`}
              >
                <Icon
                  className={`mx-auto mb-2 h-5 w-5 ${item.highlight ? "text-orange" : "text-gold"}`}
                />
                <div
                  className={`font-display text-xl font-bold leading-none md:text-2xl ${
                    item.highlight ? "text-orange" : "text-white"
                  }`}
                >
                  {item.value}
                </div>
                <div className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-steel-300">
                  {item.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-steel-400">{item.sub}</div>
                {item.href && (
                  <ExternalLink className="absolute right-2 top-2 h-3 w-3 text-steel-500 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </motion.div>
            )

            if (item.href) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  aria-label={`${item.label} ${item.value} — verify on FMCSA SAFER`}
                >
                  {card}
                </a>
              )
            }

            return <div key={item.label}>{card}</div>
          })}
        </div>

        <p className="mt-6 text-center text-xs text-steel-500">
          USDOT #{COMPANY_INFO.dot} · MC-{COMPANY_INFO.mc} — verify our authority anytime on the{" "}
          <a
            href={FMCSA_LINKS.safer}
            target="_blank"
            rel="noopener noreferrer"
            className="text-steel-300 underline underline-offset-2 hover:text-orange"
          >
            FMCSA SAFER
          </a>{" "}
          system. Fleet of {STATS.trucksInFleet}+ trucks serving {STATS.statesCovered} states.
        </p>
      </div>
    </section>
  )
}
