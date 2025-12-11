"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MAJOR_CLIENTS, PREMIER_BROKERS } from "@/lib/constants"
import { Star, Building2, Truck } from "lucide-react"
import Image from "next/image"
import { motion, useAnimationControls } from "framer-motion"
import { useEffect, useRef, useState } from "react"

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
  type = "client"
}: {
  name: string
  logoPath?: string
  className?: string
  type?: "client" | "broker"
}) {
  return (
    <div
      className={`flex-shrink-0 relative h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 overflow-hidden rounded-lg sm:rounded-xl shadow-sm bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center ${className}`}
    >
      {logoPath ? (
        <Image
          src={logoPath}
          alt={`${name} logo`}
          fill
          priority={false}
          sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 64px"
          className="object-contain p-1.5 sm:p-2 opacity-90 hover:opacity-100 transition-opacity"
        />
      ) : (
        <div className="text-white/40">
           {type === "broker" ? <Truck className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
        </div>
      )}
    </div>
  )
}

// Seamless infinite scroll component
function InfiniteCarousel({ 
  children, 
  direction = "left",
  speed = 20,
  className = "" 
}: { 
  children: React.ReactNode
  direction?: "left" | "right"
  speed?: number
  className?: string 
}) {
  const [contentWidth, setContentWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimationControls()
  
  useEffect(() => {
    if (containerRef.current) {
      // Calculate single set width based on children count and approximate width
      // Better approach: Measure the scrollWidth of the inner container
      setContentWidth(containerRef.current.scrollWidth / 2)
    }
  }, [children])

  useEffect(() => {
    // Start animation
    controls.start({
      x: direction === "left" ? "-50%" : "0%",
      transition: {
        duration: speed,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }
    })
  }, [controls, direction, speed])

  const handleMouseEnter = () => {
    controls.stop()
  }

  const handleMouseLeave = () => {
    controls.start({
      x: direction === "left" ? "-50%" : "0%",
      transition: {
        duration: speed,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }
    })
  }

  return (
    <div 
      className="relative overflow-hidden group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      <motion.div
        ref={containerRef}
        animate={controls}
        initial={{ x: direction === "left" ? "0%" : "-50%" }}
        className={`flex gap-4 sm:gap-6 min-w-max ${className}`}
      >
        {children}
        {children}
      </motion.div>
      
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#020617] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-[#020617] to-transparent pointer-events-none z-10" />
    </div>
  )
}

export function PartnersShowcase() {
  // Use original arrays, we'll duplicate them in the carousel component
  const brokerItems = PREMIER_BROKERS
  const clientItems = MAJOR_CLIENTS

  return (
    <section aria-label="Partner network" className="relative bg-[#020617] py-12 sm:py-16 md:py-24 overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      <div className="container relative px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] mb-4 sm:mb-6">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-blue-400 text-blue-400" />
            <span>Trusted Logistics Network</span>
          </div>
          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight tracking-tight">
            Premier Brokers & Fortune 500 Shippers
          </h3>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto font-medium">
            The brands that keep our drivers rolling with premium, consistent freight
          </p>
        </motion.div>

        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          {/* Premier Brokers Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wider px-3 py-1.5 bg-blue-950 rounded-full border border-blue-500/30">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-blue-400 text-blue-400" />
                Premier Brokers
              </span>
            </div>
            
            <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 md:p-6">
              <InfiniteCarousel direction="left" speed={40}>
                {brokerItems.map((broker, index) => {
                  const logoPath = BROKER_LOGOS[broker.name]
                  return (
                    <Card
                      key={`${broker.name}-${index}`}
                      className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] flex items-center gap-2.5 sm:gap-3 md:gap-4 border border-white/10 bg-white/5 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:border-blue-500/30 rounded-lg sm:rounded-xl group cursor-default"
                    >
                      <PartnerLogo
                        name={broker.name}
                        logoPath={logoPath}
                        type="broker"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs sm:text-sm md:text-base font-bold text-white truncate tracking-tight mb-1 sm:mb-2 group-hover:text-blue-400 transition-colors">
                          {broker.name}
                        </p>
                        <Badge className="text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {broker.tier}
                        </Badge>
                      </div>
                    </Card>
                  )
                })}
              </InfiniteCarousel>
            </div>
          </motion.div>

          {/* Fortune 500 Clients Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wider px-3 py-1.5 bg-blue-950 rounded-full border border-blue-500/30">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-blue-400 text-blue-400" />
                Fortune 500 Shippers
              </span>
            </div>
            
            <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 md:p-6">
              <InfiniteCarousel direction="right" speed={50}>
                {clientItems.map((client, index) => {
                  const logoPath = CLIENT_LOGOS[client.name]
                  return (
                    <Card
                      key={`${client.name}-${index}`}
                      className="flex-shrink-0 w-[220px] sm:w-[260px] md:w-[300px] flex items-center gap-2.5 sm:gap-3 md:gap-4 border border-white/10 bg-white/5 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:border-green-500/30 rounded-lg sm:rounded-xl group cursor-default"
                    >
                      <PartnerLogo
                        name={client.name}
                        logoPath={logoPath}
                        type="client"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs sm:text-sm md:text-base font-bold truncate leading-tight mb-1 sm:mb-2 text-white group-hover:text-green-400 transition-colors">{client.name}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-[10px] sm:text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md">
                            {client.duration}
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md hidden sm:inline">
                            {client.category}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </InfiniteCarousel>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
