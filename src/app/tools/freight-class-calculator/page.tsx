import { Metadata } from "next"
import Link from "next/link"
import { Phone, Scale, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { FreightClassCalculator } from "@/components/features/FreightClassCalculator"

export const metadata: Metadata = {
  title: "Freight Class Calculator | NMFC Density Classes 50–500",
  description:
    "Free LTL freight class calculator. Enter pallet dimensions and weight to get density in lb/ft³ and the NMFC density class, from class 50 to class 500 — plus how many pounds would move you to a cheaper class. Built by Thind Transport, an asset-based carrier in Kent, WA.",
  alternates: { canonical: "/tools/freight-class-calculator" },
}

const FAQ = [
  {
    q: "What is freight class?",
    a: "The National Motor Freight Classification sorts LTL freight into 18 classes from 50 to 500. Class 50 is dense, durable, easy-to-handle freight and costs the least to ship; class 500 is light and bulky and costs the most. The class goes on the bill of lading and drives the rate.",
  },
  {
    q: "How is freight class calculated?",
    a: "Start with density. Multiply length × width × height in inches, divide by 1,728 to get cubic feet, then divide the total weight in pounds by those cubic feet. That pounds-per-cubic-foot figure maps onto the NMFTA density table — 50 lb/ft³ and up is class 50, under 1 lb/ft³ is class 500.",
  },
  {
    q: "Is density the only thing that matters?",
    a: "No, and this is where shipments get re-classed. The NMFC weighs four characteristics: density, stowability, ease of handling, and liability (value, fragility, hazard, theft appeal). Many commodities also carry a specific NMFC item number that fixes the class regardless of density. Density is the right starting point and the wrong final word — confirm with your carrier before the BOL goes out.",
  },
  {
    q: "What happens if I get the class wrong?",
    a: "The carrier reweighs and remeasures at the terminal, re-classes the shipment, and bills the difference — usually with an inspection fee on top. Understating class is the most common source of LTL billing disputes.",
  },
  {
    q: "Do I use the pallet dimensions or the product dimensions?",
    a: "The pallet. Use outside dimensions including packaging and the pallet itself, and gross weight including both. That is what gets measured at the dock.",
  },
]

export default function FreightClassCalculatorPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageBreadcrumb pageName="Freight Class Calculator" category="Company" />

      {/* Hero */}
      <div className="bg-[#060607] text-white">
        <div className="container px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Free tool · No signup</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              Freight class calculator
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              Enter your pallet dimensions and weight. You get the density in pounds per cubic foot, the
              NMFC density class, and how many pounds it would take to reach the next class down.
            </p>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="container px-4 py-10 md:py-14">
        <FreightClassCalculator />
      </div>

      {/* Why it matters */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container px-4 py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Scale,
                title: "Density does most of the work",
                text: "Length × width × height ÷ 1,728 gives cubic feet. Weight ÷ cubic feet gives density. That number picks your class off the NMFTA table.",
              },
              {
                icon: ShieldCheck,
                title: "Getting it wrong costs real money",
                text: "Carriers reweigh and remeasure at the terminal. An understated class comes back as a re-class plus an inspection fee, usually weeks later.",
              },
              {
                icon: Truck,
                title: "Sometimes truckload is cheaper",
                text: "Multiple pallets of light, bulky freight can price out worse on LTL than a partial or full truckload. Worth a quote either way.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 p-5">
                <Icon className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-gray-200">
        <div className="container px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8">
            Freight class, answered
          </h2>
          <div className="grid gap-5 md:grid-cols-2 max-w-5xl">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-gray-200 bg-[#060607] text-white">
        <div className="container px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-3">Got the class. Need the truck?</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-7">
            Thind Transport runs {STATS.trucksInFleet} trucks — flatbed, reefer, and dry van — across all{" "}
            {STATS.statesCovered} states out of Kent, Washington. Live tracking links, POD the moment
            it&apos;s signed, and a dispatch desk that picks up.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/shippers#quote"
              className="rounded-full bg-orange-600 px-7 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-500"
            >
              Get a quote
            </Link>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Phone className="h-4 w-4" aria-hidden /> {COMPANY_INFO.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
