import { Metadata } from "next"
import { COMPANY_INFO, STATS } from "@/lib/constants"

export const metadata: Metadata = {
  title: `Fleet & Equipment | 2023-2025 Freightliner & Volvo Trucks | ${COMPANY_INFO.name}`,
  description: `Drive the newest equipment at ${COMPANY_INFO.name}. Our fleet features 2023-2025 Freightliner Cascadias & Volvo VNL 860s with APU, inverters, and full safety suites. ${STATS.trucksInFleet}+ trucks maintained by our in-house shop. Apply today!`,
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
    description: `Drive 2023-2025 Freightliner Cascadias & Volvo VNL 860s. APU, inverters, full safety suites standard. ${STATS.trucksInFleet}+ trucks with 24/7 maintenance support.`,
    url: "https://thindtransport.com/fleet",
    siteName: COMPANY_INFO.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Fleet & Equipment | ${COMPANY_INFO.name}`,
    description: "2023-2025 Freightliner & Volvo trucks. APU standard. 24/7 maintenance support.",
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
            "description": "Modern trucking fleet featuring 2023-2025 Freightliner Cascadias and Volvo VNL trucks",
            "numberOfItems": STATS.trucksInFleet,
            "itemListElement": [
              {
                "@type": "Vehicle",
                "position": 1,
                "name": "Freightliner Cascadia 2023-2025",
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
      
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AutoDealer",
            "name": `${COMPANY_INFO.name} Fleet Services`,
            "description": "Professional trucking company with modern fleet and 24/7 maintenance support",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Kent",
              "addressRegion": "WA",
              "addressCountry": "US"
            },
            "telephone": COMPANY_INFO.phone,
            "email": COMPANY_INFO.email,
            "openingHours": "Mo-Su 00:00-23:59",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "47"
            }
          })
        }}
      />
      
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What year models are in the Thind Transport fleet?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our fleet consists exclusively of 2023-2025 model year trucks. We operate Freightliner Cascadias and Volvo VNL 860s/760s. No truck in our fleet is older than 3 years, ensuring you always drive reliable, modern equipment."
                }
              },
              {
                "@type": "Question",
                "name": "Do all trucks come with APUs and inverters?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Every truck in our fleet comes standard with an APU (Auxiliary Power Unit) and a high-power inverter (1800W-2500W). You'll never need to idle for climate control, and you can run all your devices including microwaves, TVs, and gaming systems."
                }
              },
              {
                "@type": "Question",
                "name": "What safety features are included?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "All trucks include Detroit Assurance or Volvo Active Driver Assist safety suites with: Lane Departure Warning, Collision Mitigation, Adaptive Cruise Control, Electronic Stability Control, and ABS with disc brakes."
                }
              },
              {
                "@type": "Question",
                "name": "What happens if my truck breaks down on the road?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Call our 24/7 dispatch line and we'll have roadside assistance to you within 4 hours on average. For repairs we can't do roadside, we'll get you to the nearest certified shop and cover all costs. We also provide rental equipment if repairs take longer than expected."
                }
              },
              {
                "@type": "Question",
                "name": "How often is preventive maintenance performed?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Every truck receives a full preventive maintenance inspection every 25,000 miles at our in-house shop. We also perform DOT inspections in advance of due dates. Our 98.5% uptime rate proves this system works."
                }
              }
            ]
          })
        }}
      />
      {children}
    </>
  )
}

