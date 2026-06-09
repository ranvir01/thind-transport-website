"use client"

import { motion } from "framer-motion"

export const InfiniteTicker = () => {
  const items = [
    { label: "Owner operator split:", value: "90%", accent: true },
    { label: "Company drivers:", value: "$0.63/mi", accent: true },
    { label: "Fuel surcharge:", value: "100% pass-through" },
    { label: "Forced dispatch:", value: "Never" },
    { label: "Equipment:", value: "2024 Cascadias" },
    { label: "Hiring:", value: "48 states" },
    { label: "Based in:", value: "Kent, WA" },
    { label: "Freight:", value: "Flatbed · Reefer · Dry Van" },
  ]

  const renderTrack = (keyPrefix: string) => (
    <div className="flex items-center">
      {items.map((item, i) => (
        <div key={`${keyPrefix}-${i}`} className="flex items-center">
          <span className="text-sm md:text-base font-medium text-steel-400 px-6 md:px-8 font-display uppercase tracking-wide">
            {item.label}{" "}
            <span className={item.accent ? "text-orange font-bold" : "text-steel-200"}>
              {item.value}
            </span>
          </span>
          <span className="w-1 h-1 bg-orange/60 rounded-sm rotate-45" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative w-full py-4 overflow-hidden bg-navy-800 border-y border-steel-800">
      <div className="fleet-safety-stripe absolute top-0 left-0 right-0" />
      <div className="flex whitespace-nowrap pt-1">
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
        >
          {renderTrack("a")}
          {renderTrack("b")}
        </motion.div>
      </div>
    </div>
  )
}
