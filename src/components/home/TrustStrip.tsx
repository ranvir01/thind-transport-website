"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { ShieldCheck, BadgeCheck, Shield, Truck, MapPin, ExternalLink } from "lucide-react"
import { COMPANY_INFO, FMCSA_LINKS, STATS } from "@/lib/constants"

/**
 * Editorial trust bar: a real FMCSA compliance badge paired with an inline,
 * divider-separated credential row — every figure shown here is verifiable
 * (USDOT, MC, insurance, fleet size, years in business).
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
    icon: Shield,
    value: "$1M+",
    label: "Insured",
    sub: "Liability coverage",
    highlight: true,
  },
  {
    icon: Truck,
    value: `${STATS.trucksInFleet}+`,
    label: "Trucks",
    sub: "2024 Freightliners",
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
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
          {/* Real FMCSA compliance badge */}
          <motion.a
            href={FMCSA_LINKS.safer}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="group mx-auto flex items-center gap-4 lg:mx-0"
          >
            <div className="relative h-24 w-24 flex-shrink-0 md:h-28 md:w-28">
              <Image
                src="/images/generated/fmcsa-compliance-badge.png"
                alt="FMCSA compliance badge — verified motor carrier authority"
                fill
                sizes="112px"
                className="object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="max-w-[12rem]">
              <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-steel-300 transition-colors group-hover:text-orange">
                {COMPANY_INFO.location}-Based
              </p>
              <p className="font-display text-lg font-bold leading-tight text-white">
                FMCSA-Authorized, Driver-Approved
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-steel-400 underline-offset-2 group-hover:text-orange group-hover:underline">
                Verify on SAFER
                <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </motion.a>

          {/* Inline credential row — divided, not boxed */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:flex lg:flex-1 lg:items-stretch lg:justify-between lg:divide-x lg:divide-steel-700/60">
            {credentials.map((item, index) => {
              const Icon = item.icon
              const inner = (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="h-full lg:px-5 lg:first:pl-0 lg:last:pr-0"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${item.highlight ? "text-orange" : "text-gold"}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-steel-400">
                      {item.label}
                    </span>
                  </div>
                  <div
                    className={`font-display text-2xl font-bold leading-none md:text-3xl ${
                      item.highlight ? "text-orange" : "text-white"
                    }`}
                  >
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs leading-tight text-steel-400">{item.sub}</div>
                </motion.div>
              )

              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block transition-opacity hover:opacity-80"
                  >
                    {inner}
                  </a>
                )
              }

              return <div key={item.label}>{inner}</div>
            })}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-steel-500">
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
