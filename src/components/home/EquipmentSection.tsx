"use client"

import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Truck, Wrench, ShieldCheck, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const trailers = [
  {
    name: "Flatbed",
    detail: "48–53 ft · steel, lumber & building materials",
    image: "/images/generated/trailer-flatbed.png",
  },
  {
    name: "Reefer",
    detail: "Temp-controlled · food-grade produce & freight",
    image: "/images/generated/trailer-reefer.png",
  },
  {
    name: "Dry Van",
    detail: "53 ft · general & palletized freight",
    image: "/images/generated/trailer-dry-van.png",
  },
]

const tractorPoints = [
  "2024 Freightliner Cascadias & Volvos",
  "APUs, inverters & modern driver comfort",
  "Collision mitigation + lane-keep safety tech",
  "Preventive maintenance on a fixed schedule",
]

const supportPoints = [
  { label: "24/7 roadside assistance", icon: Wrench },
  { label: "In-house mechanical support", icon: Wrench },
  { label: "O/O maintenance & tire discounts", icon: Truck },
  { label: "DOT-compliant, FMCSA safety-rated fleet", icon: ShieldCheck },
]

export function EquipmentSection() {
  return (
    <section className="relative overflow-hidden border-t-0 py-12 brand-section-panel sm:py-16 md:py-24">
      <div className="accent-orb -left-10 top-10 h-72 w-72 bg-orange-600/12" />
      <div className="container relative px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 max-w-3xl md:mb-14"
        >
          <div className="fleet-badge mb-4 w-fit">
            <Truck className="h-3.5 w-3.5" />
            Our fleet
          </div>
          <h2 className="mb-3 text-white">
            Drive a truck that&apos;s <span className="text-gradient-accent">actually new</span>
          </h2>
          <p className="max-w-2xl text-base text-steel-300 md:text-lg">
            15 trucks and growing — multiple trailer types, all DOT-compliant. No 10-year-old hand-me-downs.
          </p>
        </motion.div>

        {/* Feature row: big tractor photo + spec list */}
        <div className="mb-10 grid items-center gap-8 md:mb-16 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-fleet-lg border border-steel-700/70 shadow-2xl"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/generated/truck-cascadia.png"
                alt="2024 Freightliner Cascadia tractor from the Thind Transport fleet"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
              <span className="fleet-badge fleet-badge-gold">2024 model year</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="mb-5 text-white">The tractors you&apos;ll run</h3>
            <ul className="space-y-3">
              {tractorPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <span className="text-base text-steel-200">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/fleet"
              className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-orange transition-colors hover:text-orange-400"
            >
              See the full fleet
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Trailer photo band */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3 md:mb-14 md:gap-6">
          {trailers.map((trailer, index) => (
            <motion.div
              key={trailer.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-fleet-lg border border-steel-700/70"
            >
              <div className="relative aspect-[3/2]">
                <Image
                  src={trailer.image}
                  alt={`${trailer.name} trailer in the Thind Transport fleet`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/30 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="font-display text-lg font-bold uppercase tracking-wide text-white">{trailer.name}</h4>
                <p className="text-xs text-steel-300">{trailer.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Maintenance + safety — clean inline list, not boxed cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border-t border-steel-700/60 pt-8"
        >
          <p className="mb-5 font-display text-sm font-bold uppercase tracking-[0.2em] text-steel-400">
            Maintenance &amp; support, handled
          </p>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {supportPoints.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
                  <span className="text-sm font-medium text-steel-200">{point.label}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
