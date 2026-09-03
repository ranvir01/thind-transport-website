import { Metadata } from "next"
import Script from "next/script"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, SERVICES, STATS } from "@/lib/constants"
import { RouteMapVisualization } from "@/components/features/RouteMapVisualization"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { AvailableTrucksStrip } from "@/components/features/AvailableTrucksStrip"
import { HomeTimeLanes } from "@/components/home/HomeTimeLanes"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

export const metadata: Metadata = {
  // The root layout appends "| Thind Transport" via its title template — a
  // second one here shipped it twice in the SERP.
  title: "Routes & lanes — local, regional and OTR",
  description: `The lanes ${COMPANY_INFO.name} actually runs out of ${COMPANY_INFO.location}: local (home daily), regional (home weekly) and OTR, at ${PAY_RATES.companyDriver.otr.perMile}/mile whichever you pick. Flatbed, reefer and dry van across ${STATS.statesCovered} states.`,
  alternates: { canonical: "/routes" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Driver route opportunities",
  description:
    "Route and lane overview for company drivers and owner operators at Thind Transport.",
  provider: {
    "@type": "Organization",
    name: COMPANY_INFO.name,
    telephone: COMPANY_INFO.phoneFormatted,
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
}

/** The three facts a driver checks before reading the lanes. Static text, not
 *  count-ups: a reach and a home yard are identifiers, not a scoreboard. */
/** Only a figure takes the mono tabular face; a trailer list and a town name
 *  are prose and read in the display face. */
const HERO_FACTS = [
  {
    label: "Reach",
    value: `${STATS.statesCovered} states`,
    note: "Freight out of the home yard",
    mono: true,
  },
  {
    label: "Trailers",
    value: SERVICES.types.join(", "),
    note: "Pick what you're set up for",
    mono: false,
  },
  {
    label: "Home yard",
    value: COMPANY_INFO.location,
    note: "Where the lanes start and end",
    mono: false,
  },
] as const

const routeFAQs = [
  {
    question: "What types of routes do you talk through with drivers?",
    answer:
      "We usually discuss local, regional, and over-the-road options based on experience, trailer type, and current freight needs.",
  },
  {
    question: "Are the lane examples on this page live dispatch offers?",
    answer:
      "No. They are market snapshots to show the kind of freight corridors we commonly discuss, not guaranteed live load postings.",
  },
  {
    question: "How do home-time options work?",
    answer:
      "Home time depends on the type of work you are interested in. Local conversations focus on shorter runs, while regional and OTR roles involve longer scheduling windows.",
  },
  {
    question: "What trailers do these lanes cover?",
    answer:
      "The site focuses on flatbed, reefer, and dry van opportunities, and the right fit depends on your endorsements, experience, and the current mix of freight.",
  },
]

export default function RoutesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <Script
        id="routes-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <AsphaltHero
        breadcrumb={
          /* The trail lives inside the asphalt band; its own bar chrome
             (opaque ground, blur, nav-clearance padding, second gutter) is
             overridden here rather than stacked above the hero. */
          <PageBreadcrumb
            pageName="Routes & Lanes"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="CDL-A route overview"
        title="Routes that match how you want to run."
        description="Local, regional, and OTR — the right fit depends on your experience, trailer background, and home-time needs. Here's how each one runs."
      >
        <dl className="rounded-m-3 border border-white/10 bg-white/5 p-6">
          {HERO_FACTS.map((fact, i) => (
            <div key={fact.label} className={i === 0 ? "" : "mt-6 border-t border-white/10 pt-5"}>
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd
                className={
                  fact.mono
                    ? "mt-1 font-mono text-m-h4 font-bold tabular-nums text-paper"
                    : "mt-1 font-display text-m-h4 font-bold text-paper"
                }
              >
                {fact.value}
              </dd>
              <dd className="text-m-body text-paper/70">{fact.note}</dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      {/* Real posted capacity, moved here when /load-board (five invented
          loads) was deleted. Renders nothing when nothing is posted. */}
      <AvailableTrucksStrip />

      {/* One owner of the lanes message. The three route-type cards that used
          to sit here repeated HomeTimeLanes with looser numbers, and the
          "example freight corridors" grid printed the same MARKET_DATA rows
          the corridor table below already prints. */}
      <HomeTimeLanes />

      <section aria-labelledby="corridors-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-5xl">
            <RouteMapVisualization />
          </Reveal>
          <p className="mx-auto mt-4 max-w-5xl text-m-body text-steel-300">
            These are market snapshots of the corridors we commonly run. They are not presented as
            guaranteed live loads.
          </p>
        </div>
      </section>

      <section aria-labelledby="routes-faq-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2
              id="routes-faq-heading"
              className="font-display text-m-h2 font-bold text-paper text-balance"
            >
              Route questions we hear most
            </h2>
            <div className="mt-8">
              <FAQAccordion items={routeFAQs} darkBackground={true} />
            </div>
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Plan the rest of it"
        intro="The lanes are half the picture — here's the pay, the clock and the equipment."
        links={driverLinks(["/routes"])}
      />

      {/* The page's ONE closing block. The navy photo band with its two pill
          buttons made the same offer the hero already makes. */}
      <section aria-labelledby="routes-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="routes-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Want to talk through your best route fit?
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              Tell us your experience level, trailer background, and home-time preferences. We&apos;ll
              help you figure out which conversations make sense.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/apply"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                <span>Start your application</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                <span>or call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </div>
            <p className="mt-4 text-m-body text-steel-300">
              {`CDL-A required · Based in ${COMPANY_INFO.location} · ${SERVICES.types.join(", ")}`}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
