"use client"

import { EQUIPMENT, PAY_RATES } from "@/lib/constants"

export const InfiniteTicker = () => {
  const items = [
    { label: "Owner operator split:", value: PAY_RATES.ownerOperator.commission, accent: true },
    { label: "Company drivers:", value: `${PAY_RATES.companyDriver.otr.perMile}/mi`, accent: true },
    { label: "Fuel surcharge:", value: "100% pass-through" },
    { label: "Forced dispatch:", value: "Never" },
    { label: "Equipment:", value: EQUIPMENT.short },
    { label: "Hiring:", value: "48 states" },
    { label: "Based in:", value: "Kent, WA" },
    { label: "Freight:", value: "Flatbed · Reefer · Dry Van" },
  ]

  return (
    <div className="w-full py-4 bg-navy-800 border-y border-steel-800">
      <div className="container px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {items.map((item, i) => (
          <span key={i} className="text-sm md:text-base font-medium text-steel-400 font-display uppercase tracking-wide">
            {item.label}{" "}
            <span className={item.accent ? "text-orange font-bold" : "text-steel-200"}>{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
