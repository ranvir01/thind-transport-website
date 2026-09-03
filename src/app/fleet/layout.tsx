import { Metadata } from "next"
import { COMPANY_INFO, EQUIPMENT, STATS, SUPPORT } from "@/lib/constants"
import { INVERTER_RANGE, SCHEMA_TRACTORS } from "@/components/fleet/fleet-data"

export const metadata: Metadata = {
  title: `Fleet & equipment — ${EQUIPMENT.modelYears} Freightliners and Volvos`,
  description: `Drive the newest equipment at ${COMPANY_INFO.name}. Our fleet features ${EQUIPMENT.modelYears} Freightliner Cascadias & Volvo VNL 860s with APU, inverters, and full safety suites. ${STATS.trucksInFleet} trucks, maintained on a preventive schedule.`,
  keywords: [
    "trucking company equipment",
    "Freightliner Cascadia 2024",
    "Volvo VNL 860 trucks",
    "truck driver equipment",
    "CDL driver trucks",
    "trucking fleet",
    "APU equipped trucks",
    "truck driver jobs equipment",
    "new model trucks for drivers",
    "owner operator equipment",
    COMPANY_INFO.name,
    `${COMPANY_INFO.location} trucking`
  ],
  openGraph: {
    title: `Fleet & Equipment | ${COMPANY_INFO.name}`,
    description: `Drive ${EQUIPMENT.modelYears} Freightliner Cascadias & Volvo VNL 860s. APU, inverters, full safety suites standard. ${STATS.trucksInFleet} trucks with ${SUPPORT.hours} maintenance support.`,
    url: "https://thindtransport.com/fleet",
    siteName: COMPANY_INFO.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Fleet & Equipment | ${COMPANY_INFO.name}`,
    description: `${EQUIPMENT.modelYears} Freightliner & Volvo trucks. APU standard. ${SUPPORT.hours} maintenance support.`,
  },
  alternates: {
    canonical: "https://thindtransport.com/fleet"
  }
}

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* JSON-LD Schema for Fleet Page.
          Every model year, engine, power figure and sleeper below is read from
          the same source the spec sheet prints from (`EQUIPMENT` and
          `fleet-data.ts`), so the machine-readable fleet and the rendered one
          cannot drift. The descriptions list the equipment the page publishes
          as standard on every unit — no badge ("Driver Favorite", "Comfort
          King") and no per-truck inverter wattage the page does not state. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": `${COMPANY_INFO.name} Fleet Equipment`,
            "description": `Modern trucking fleet featuring ${EQUIPMENT.modelYears} Freightliner Cascadias and Volvo VNL trucks`,
            "numberOfItems": 2,
            "itemListElement": [
              {
                "@type": "Vehicle",
                "position": 1,
                "name": `${SCHEMA_TRACTORS.cascadia.name} ${EQUIPMENT.modelYears}`,
                "vehicleConfiguration": "Semi-Truck",
                "vehicleEngine": {
                  "@type": "EngineSpecification",
                  "name": SCHEMA_TRACTORS.cascadia.engine,
                  "enginePower": SCHEMA_TRACTORS.cascadia.power
                },
                "vehicleTransmission": "DT12 Automated 12-Speed",
                "fuelType": "Diesel",
                "description": `${EQUIPMENT.apu}, ${INVERTER_RANGE} inverter, collision mitigation, ${SCHEMA_TRACTORS.cascadia.sleeper}`
              },
              {
                "@type": "Vehicle",
                "position": 2,
                "name": `${SCHEMA_TRACTORS.volvo.name} ${EQUIPMENT.modelYears}`,
                "vehicleConfiguration": "Semi-Truck",
                "vehicleEngine": {
                  "@type": "EngineSpecification",
                  "name": SCHEMA_TRACTORS.volvo.engine,
                  "enginePower": SCHEMA_TRACTORS.volvo.power
                },
                "vehicleTransmission": "I-Shift Automated",
                "fuelType": "Diesel",
                "description": `${EQUIPMENT.apu}, ${INVERTER_RANGE} inverter, adaptive cruise, ${SCHEMA_TRACTORS.volvo.sleeper}`
              }
            ]
          })
        }}
      />

      {/* No FAQPage entity here: FAQAccordion on the page emits one from the
          same `faqs` array that renders on screen, and two top-level FAQPage
          entities on one URL is a structured-data error. Removed 2026-08-30. */}
      {children}
    </>
  )
}
