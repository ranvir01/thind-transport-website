"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MAJOR_CLIENTS, PREMIER_BROKERS } from "@/lib/constants"
import { Star } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

function duplicateList<T>(list: readonly T[]): T[] {
  return [...list, ...list]
}

const BROKER_LOGOS: Record<string, string> = {
  "Landstar Inway": "/logos/landstar.svg",
  "JB Hunt": "/logos/jbhunt.svg",
  "C.H. Robinson": "/logos/chrobinson.svg",
  "Schneider National": "/logos/schneider.svg",
  "Coyote Logistics": "/logos/coyote.svg",
  "DAT Power Network": "/logos/dat.svg",
}

const CLIENT_LOGOS: Record<string, string> = {
  "Amazon Logistics": "/logos/amazon.svg",
  "Walmart Supply Chain": "/logos/walmart.svg",
  "Lowe's Home Improvement": "/logos/lowes.svg",
  "Target Corporation": "/logos/target.svg",
  "PepsiCo Beverages": "/logos/pepsi.svg",
  "The Home Depot": "/logos/homedepot.svg",
}

function PartnerLogo({
  name,
  logoPath,
  className = "",
  variant = "dark",
}: {
  name: string
  logoPath: string
  className?: string
  variant?: "light" | "dark"
}) {
  return (
    <div
      className={`flex-shrink-0 relative h-16 w-16 overflow-hidden rounded-xl shadow-sm ${
        variant === "dark" 
          ? "bg-white/5 backdrop-blur-sm border border-white/10" 
          : "bg-gray-50 border border-gray-100"
      } ${className}`}
    >
      <Image
        src={logoPath}
        alt={`${name} logo`}
        fill
        priority={false}
        sizes="80px"
        className="object-contain p-2 opacity-90 hover:opacity-100 transition-opacity"
      />
    </div>
  )
}

export function PartnersShowcase() {
  const brokerItems = duplicateList(PREMIER_BROKERS)
  const clientItems = duplicateList(MAJOR_CLIENTS)

  return (
    <section aria-label="Partner network" className="relative bg-[#020617] py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      <div className="container relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-6 py-2.5 text-sm font-bold text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] mb-6">
            <Star className="h-4 w-4 fill-blue-400 text-blue-400" />
            <span>Trusted Logistics Network</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            Premier Brokers & Fortune 500 Shippers
          </h3>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto font-medium">
            The brands that keep our drivers rolling with premium, consistent freight
          </p>
        </motion.div>

        <div className="space-y-10">
          {/* Premier Brokers Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative pt-4"
          >
            <div className="absolute top-0 left-6 -translate-y-1/2 px-4 py-1.5 bg-blue-950 rounded-full border border-blue-500/30 shadow-lg shadow-blue-900/20 z-20">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-3 h-3 fill-blue-400 text-blue-400" />
                Premier Brokers
              </span>
            </div>
            <div className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-transparent to-[#020617] z-10 pointer-events-none" />
              <div className="flex gap-6 whitespace-nowrap [animation-duration:30s] hover:[animation-play-state:paused] marquee-track">
                {brokerItems.map((broker, index) => {
                  const logoPath = BROKER_LOGOS[broker.name]
                  if (!logoPath) return null
                  return (
                    <Card
                      key={`${broker.name}-${index}`}
                      className="inline-flex min-w-[280px] items-center gap-4 border border-white/10 bg-white/5 px-6 py-5 shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 rounded-xl"
                    >
                      <PartnerLogo
                        name={broker.name}
                        logoPath={logoPath}
                        variant="dark"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-base font-bold text-white truncate tracking-tight mb-2">
                          {broker.name}
                        </p>
                        <Badge className="text-xs font-semibold px-3 py-1 bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                          {broker.tier}
                        </Badge>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Fortune 500 Clients Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative pt-4"
          >
            <div className="absolute top-0 left-6 -translate-y-1/2 px-4 py-1.5 bg-blue-950 rounded-full border border-blue-500/30 shadow-lg shadow-blue-900/20 z-20">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-3 h-3 fill-blue-400 text-blue-400" />
                Fortune 500 Shippers
              </span>
            </div>
            <div className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-transparent to-[#020617] z-10 pointer-events-none" />
              <div className="flex gap-6 whitespace-nowrap [animation-duration:35s] hover:[animation-play-state:paused] marquee-track-reverse">
                {clientItems.map((client, index) => {
                  const logoPath = CLIENT_LOGOS[client.name]
                  if (!logoPath) return null
                  return (
                    <Card
                      key={`${client.name}-${index}`}
                      className="inline-flex min-w-[300px] items-center gap-4 border border-white/10 bg-white/5 px-6 py-5 shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 hover:border-green-500/30 rounded-xl"
                    >
                      <PartnerLogo
                        name={client.name}
                        logoPath={logoPath}
                        variant="dark"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-base font-bold truncate leading-tight mb-2 text-white">{client.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-md">
                            {client.duration}
                          </span>
                          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-md">
                            {client.category}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}


