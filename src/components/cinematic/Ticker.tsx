"use client"

import { motion } from "framer-motion"

export const InfiniteTicker = () => {
  const items = [
    { label: "Owner Operator Split:", value: "91%", color: "text-orange" },
    { label: "Fuel Surcharge:", value: "100% Pass-through", color: "text-orange" },
    { label: "Safety Rating:", value: "A+ (FMCSA)", color: "text-green-400" },
    { label: "Equipment:", value: "2024 Cascadias", color: "text-white" },
    { label: "Hiring Nationwide:", value: "All 48 States", color: "text-green-400" },
    { label: "Popular Routes:", value: "CA → TX → FL → NY", color: "text-blue-400" },
    { label: "West Coast:", value: "WA • OR • CA • NV • AZ", color: "text-white" },
    { label: "Midwest:", value: "IL • OH • MI • IN • WI", color: "text-white" },
    { label: "South:", value: "TX • FL • GA • NC • TN", color: "text-white" },
    { label: "East Coast:", value: "NY • PA • NJ • MA • VA", color: "text-white" },
  ]

  return (
    <div className="relative w-full py-6 md:py-8 overflow-hidden bg-navy border-y border-white/5">
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-transparent to-navy z-10 pointer-events-none" />
       
      <div className="flex whitespace-nowrap">
        <motion.div 
          className="flex whitespace-nowrap items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
        >
          {/* First Copy */}
          <div className="flex items-center">
            {items.map((item, i) => (
              <div key={`first-${i}`} className="flex items-center">
                <span className="text-sm md:text-base font-semibold text-white/70 px-6 md:px-8">
                  {item.label} <span className={item.color}>{item.value}</span>
                </span>
                <span className="w-1.5 h-1.5 bg-orange/50 rounded-full" />
              </div>
            ))}
          </div>

          {/* Second Copy */}
          <div className="flex items-center">
            {items.map((item, i) => (
              <div key={`second-${i}`} className="flex items-center">
                <span className="text-sm md:text-base font-semibold text-white/70 px-6 md:px-8">
                  {item.label} <span className={item.color}>{item.value}</span>
                </span>
                <span className="w-1.5 h-1.5 bg-orange/50 rounded-full" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
