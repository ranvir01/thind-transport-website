import { Metadata } from "next"
import { COMPANY_INFO, EQUIPMENT, STATS } from "@/lib/constants"

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
    description: `Drive ${EQUIPMENT.modelYears} Freightliner Cascadias & Volvo VNL 860s. APU, inverters, full safety suites standard. ${STATS.trucksInFleet} trucks with 24/7 maintenance support.`,
    url: "https://thindtransport.com/fleet",
    siteName: COMPANY_INFO.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Fleet & Equipment | ${COMPANY_INFO.name}`,
    description: `${EQUIPMENT.modelYears} Freightliner & Volvo trucks. APU standard. 24/7 maintenance support.`,
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
      {/* JSON-LD Schema for Fleet Page */}
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
                "name": `Freightliner Cascadia ${EQUIPMENT.modelYears}`,
                "vehicleConfiguration": "Semi-Truck",
                "vehicleEngine": {
                  "@type": "EngineSpecification",
                  "name": "Detroit DD15",
                  "enginePower": "505 HP"
                },
                "vehicleTransmission": "DT12 Automated 12-Speed",
                "fuelType": "Diesel",
                "description": "Driver Favorite - Full APU, 2000W inverter, collision mitigation, 77\" sleeper"
              },
              {
                "@type": "Vehicle",
                "position": 2,
                "name": "Volvo VNL 860 2024-2025",
                "vehicleConfiguration": "Semi-Truck",
                "vehicleEngine": {
                  "@type": "EngineSpecification",
                  "name": "Volvo D13",
                  "enginePower": "500 HP"
                },
                "vehicleTransmission": "I-Shift Automated",
                "fuelType": "Diesel",
                "description": "Comfort King - Premium sleeper, 2500W inverter, adaptive cruise, 77\" Globetrotter XL"
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

