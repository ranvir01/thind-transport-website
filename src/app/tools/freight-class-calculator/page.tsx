import { Metadata } from "next"
import Link from "next/link"
import { Scale, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { FreightClassCalculator } from "@/components/features/FreightClassCalculator"
import { Reveal } from "@/components/ui/Reveal"

export const metadata: Metadata = {
  title: "Freight Class Calculator | NMFC Density Classes 50–500",
  description:
    `Free LTL freight class calculator. Enter pallet dimensions and weight to get density in lb/ft³ and the NMFC density class, from class 50 to class 500 — plus how many pounds would move you to a cheaper class. Built by Thind Transport, an asset-based carrier in ${COMPANY_INFO.location}.`,
  alternates: { canonical: "/tools/freight-class-calculator" },
}

/**
 * The freight-class tool page.
 *
 * The tool is the page, so the hero states what it returns and then gets out
 * of the way: no Apply on a shipper's tool page, and the one filled red in the
 * band is the phone — a shipper stuck on a re-class wants a person, not a
 * form. The calculator itself is the one paper island; everything around it is
 * dark ground.
 */

const WHY = [
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
] as const

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
    <div className="brand-page-shell overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Freight Class Calculator"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Free tool · No signup"
        title="Freight class calculator"
        description="Enter your pallet dimensions and weight. You get the density in pounds per cubic foot, the NMFC density class, and how many pounds it would take to reach the next class down."
        primary="call"
        omitApply
        extraLinks={[{ href: "#calculator", label: "Jump to the calculator" }]}
      />

      <section id="calculator" aria-labelledby="calculator-heading" className="scroll-mt-24 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="calculator-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              Work out the class
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 max-w-5xl">
            <FreightClassCalculator />
          </div>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="why-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Why the class matters
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
            {WHY.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <Icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="faq-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Freight class, answered
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2">
            {FAQ.map((item, i) => (
              <Reveal as="li" key={item.q} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <h3 className="font-display text-m-h4 font-bold text-white">{item.q}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{item.a}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The page's ONE closing block. */}
      <section aria-labelledby="tool-cta-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="tool-cta-heading"
              className="font-display text-m-h3 font-bold text-balance text-white"
            >
              Got the class. Need the truck?
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              {`Thind Transport runs ${STATS.trucksInFleet} trucks — flatbed, reefer, and dry van — across all ${STATS.statesCovered} states out of ${COMPANY_INFO.location}. Live tracking links, POD the moment it's signed, and a dispatch desk that picks up.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/shippers#quote"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                Get a quote
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                <span>or call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
