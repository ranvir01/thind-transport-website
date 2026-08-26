"use client"

import { COMPANY_INFO, PAY_RATES, SERVICES, STATS } from "@/lib/constants"

export const InfiniteTicker = () => {
  const items = [
    { label: "Owner operator split:", value: PAY_RATES.ownerOperator.commission, accent: true },
    { label: "Company drivers:", value: `${PAY_RATES.companyDriver.local.perMile}/mi`, accent: true },
    { label: "Fuel surcharge:", value: `${PAY_RATES.ownerOperator.fuelSurcharge} pass-through` },
    { label: "Forced dispatch:", value: "Never" },
    { label: "Equipment:", value: "2024 Cascadias" },
    { label: "Hiring:", value: `${STATS.statesCovered} states` },
    { label: "Based in:", value: COMPANY_INFO.location },
    { label: "Freight:", value: SERVICES.types.join(" · ") },
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
