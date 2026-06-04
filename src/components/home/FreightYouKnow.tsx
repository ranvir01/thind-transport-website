"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Package } from "lucide-react"

/**
 * Honest social-proof logo strip. These are brokers and shippers whose freight
 * moves through our lanes — framed as "freight you'll recognize," not as
 * formal endorsements or exclusive partnerships.
 */
const partners = [
  { name: "Amazon", logo: "/logos/amazon.svg" },
  { name: "Walmart", logo: "/logos/walmart.svg" },
  { name: "The Home Depot", logo: "/logos/homedepot.svg" },
  { name: "Lowe's", logo: "/logos/lowes.svg" },
  { name: "Target", logo: "/logos/target.svg" },
  { name: "PepsiCo", logo: "/logos/pepsi.svg" },
  { name: "J.B. Hunt", logo: "/logos/jbhunt.svg" },
  { name: "C.H. Robinson", logo: "/logos/chrobinson.svg" },
  { name: "Landstar", logo: "/logos/landstar.svg" },
  { name: "Schneider", logo: "/logos/schneider.svg" },
  { name: "Coyote", logo: "/logos/coyote.svg" },
  { name: "DAT", logo: "/logos/dat.svg" },
]

export function FreightYouKnow() {
  const loop = [...partners, ...partners]

  return (
    <section className="relative overflow-hidden py-14 md:py-20">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center md:mb-10"
        >
          <span className="fleet-badge fleet-badge-gold mx-auto mb-4 w-fit">
            <Package className="h-3.5 w-3.5" />
            Freight you know
          </span>
          <h2 className="mb-3 text-white">
            The loads our drivers <span className="text-orange">keep rolling</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-steel-300 md:text-lg">
            We pull steady, well-paying freight from the brokers and shippers you already recognize — so your
            wheels (and your settlements) stay moving.
          </p>
        </motion.div>
      </div>

      {/* Edge-to-edge marquee */}
      <div className="marquee-wrap relative">
        <div className="flex w-max marquee-track items-center gap-4 md:gap-6">
          {loop.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="flex h-16 w-36 flex-shrink-0 items-center justify-center rounded-fleet border border-steel-700/60 bg-white px-5 shadow-brand md:h-20 md:w-44"
              title={partner.name}
            >
              <div className="relative h-9 w-full md:h-10">
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  fill
                  sizes="176px"
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navy fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--brand-bg-soft)] to-transparent md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--brand-bg-soft)] to-transparent md:w-32" />
      </div>
    </section>
  )
}
