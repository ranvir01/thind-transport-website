"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Phone, Search, Headphones, Wallet } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

const steps = [
  {
    icon: Search,
    title: "Pick your freight",
    body: "Loads come off the DAT board and direct from shippers you already recognize. No forced dispatch — owner-operators choose what they run.",
  },
  {
    icon: Headphones,
    title: "Run with real support",
    body: "One call reaches a dispatcher in Kent who knows your name and your lane. Days, nights, and weekends — no phone trees.",
  },
  {
    icon: Wallet,
    title: "Get paid without surprises",
    body: "Weekly settlements that match the rate confirmation, with 100% of fuel surcharges passed through to owner-operators.",
  },
]

export function OperationSection() {
  return (
    <section className="relative overflow-hidden brand-section-panel py-16 md:py-24">
      <div className="accent-orb -right-10 top-10 h-72 w-72 bg-gold-600/10" />
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 max-w-3xl md:mb-14"
        >
          <span className="fleet-badge mb-4 w-fit">
            <Headphones className="h-3.5 w-3.5" />
            The day-to-day
          </span>
          <h2 className="mb-3 text-white">
            How you&apos;ll <span className="text-gradient-accent">actually run</span>
          </h2>
          <p className="max-w-2xl text-base text-steel-300 md:text-lg">
            No mystery middle layer. Here&apos;s the loop between you, the load board, and the desk in Kent.
          </p>
        </motion.div>

        <div className="grid items-center gap-8 md:grid-cols-[6fr_6fr] md:gap-12 lg:grid-cols-[5fr_7fr]">
          {/* Dispatch desk photo */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-fleet-lg border border-steel-700/70 shadow-2xl"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/generated/dispatch-desk-kent.webp"
                alt="Dispatcher on a headset working the load board at the Thind Transport office in Kent, Washington"
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/15 to-transparent" />
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.25em] text-orange">
                The dispatch desk
              </p>
              <p className="text-sm font-semibold text-white">
                Kent, WA — a person, not a queue.
              </p>
            </div>
          </motion.div>

          {/* Numbered steps */}
          <div className="space-y-6 md:space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="flex items-start gap-4 md:gap-5"
                >
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-fleet border border-orange/30 bg-orange/10">
                    <Icon className="h-5 w-5 text-orange" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 font-display text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-white md:text-xl">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-steel-300 md:text-base">{step.body}</p>
                  </div>
                </motion.div>
              )
            })}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-steel-700/60 pt-6"
            >
              <div className="logo-chip flex h-10 items-center justify-center rounded-fleet border border-steel-700/60 px-4">
                <div className="relative h-5 w-14">
                  <Image src="/logos/dat.svg" alt="DAT load board" fill sizes="56px" className="object-contain" />
                </div>
              </div>
              <p className="text-sm text-steel-300">Verified carrier on the DAT network</p>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-orange transition-colors hover:text-orange-400"
              >
                <Phone className="h-4 w-4" />
                Talk to dispatch: {COMPANY_INFO.phone}
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
