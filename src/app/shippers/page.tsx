import { Metadata } from "next"
import Link from "next/link"
import {
  BadgeCheck, Clock, Container, FileCheck, Layers, MapPin, Phone, Radar,
  Route, ShieldCheck, Snowflake, Truck, Calculator,
} from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { ShipperQuoteForm } from "@/components/features/ShipperQuoteForm"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { LaneTransitEstimator } from "@/components/features/LaneTransitEstimator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { Reveal } from "@/components/ui/Reveal"

const SHIPPER_LINKS = [
  {
    href: "/tools/freight-class-calculator",
    title: "Freight class calculator",
    blurb: "Work out the NMFC class from dimensions and weight before you quote LTL.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/api/carrier-packet",
    title: "Carrier snapshot PDF",
    blurb: "Authority, insurance and equipment on one page — download it now, no form.",
    icon: FileCheck,
    kind: "Tool" as const,
  },
  {
    href: "/routes",
    title: "Our lanes and frequency",
    blurb: "Where the trucks already run — matching your freight to a lane we're on costs less.",
    icon: Route,
    kind: "Page" as const,
  },
  {
    href: "/fleet",
    title: "Equipment specs",
    blurb: "Tractors, trailers, temperature ranges and deck lengths, listed truck by truck.",
    icon: Truck,
    kind: "Page" as const,
  },
  {
    href: "/trust",
    title: "Verify us on FMCSA",
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, authority and live safety record.`,
    icon: BadgeCheck,
    kind: "Verify" as const,
  },
  {
    href: "/contact",
    title: "Talk to dispatch",
    blurb: "Direct line and hours — the desk that books the load, not a call centre.",
    icon: Phone,
    kind: "Form" as const,
  },
]

export const metadata: Metadata = {
  title: "Ship With Us | Flatbed, Reefer & Dry Van Carrier — 48 States",
  description:
    `Thind Transport is an asset-based carrier in ${COMPANY_INFO.location} running flatbed, reefer, and dry van freight across all ${STATS.statesCovered} states. USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, fully insured, live shipment tracking. Request a quote direct from dispatch.`,
  alternates: { canonical: "/shippers" },
}

/**
 * The shipper door.
 *
 * Renders on the navy shell behind <AsphaltHero>, like every other subpage:
 * the night-highway photo that used to be the LCP is gone (it competed with
 * the headline and shipped a 100vw image above the fold for no information),
 * and the four credential figures are static mono rather than counting up —
 * a USDOT number is an identifier, not a quantity, and a registration that
 * spins like a slot machine reads as decoration.
 *
 * The two instruments — the lane estimator and the quote form — are the only
 * paper on the page, each its own island with dark ground between them.
 * scripts/e2e-funnel-smoke.mjs drives the form; the #quote anchor and its
 * scroll clearance are pinned by scripts/e2e-interaction-battery.mjs.
 */

const HERO_FACTS = [
  { label: "USDOT", value: COMPANY_INFO.dot },
  { label: "MC (docket)", value: COMPANY_INFO.mc },
  { label: "Years running", value: String(STATS.yearsInBusiness) },
  { label: "States covered", value: String(STATS.statesCovered) },
] as const

const EQUIPMENT_TYPES = [
  {
    icon: Layers,
    name: "Flatbed",
    text: "Steel, lumber, machinery, building materials — secured, tarped, and photographed before the wheels turn.",
  },
  {
    icon: Snowflake,
    name: "Reefer",
    text: "Temperature-controlled produce and food-grade freight with continuous monitoring, reefer-exempt IFTA done right.",
  },
  {
    icon: Container,
    name: "Dry Van",
    text: "General freight, retail, and palletized loads across every western lane and coast to coast.",
  },
] as const

const WHY = [
  {
    icon: Radar,
    title: "Live tracking, no check calls",
    text: "Every load gets a tracking link from our LoadOff system — real GPS position, status, and POD the moment it's signed. Your customer asks, you already know.",
  },
  {
    icon: Clock,
    title: "Dispatch answers the phone",
    text: "You talk to the people who talk to the drivers — one call, straight answer, no broker-carrier telephone game.",
  },
  {
    icon: ShieldCheck,
    title: "Paperwork before you ask",
    text: "W-9, COI, and authority in one carrier packet link. Clean inspections, modern equipment, drivers with years in the seat.",
  },
] as const

export default function ShippersPage() {
  return (
    <div className="brand-page-shell overflow-x-hidden">
      <PersonaRemember persona="shippers" />

      <AsphaltHero
        breadcrumb={
          /* Inside the band, so the bar's own ground, blur, nav-clearance
             padding, centred row and second container gutter come off. */
          <PageBreadcrumb
            pageName="Ship With Us"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Shippers"
        title="Your freight, our trucks, zero babysitting."
        description={`${STATS.trucksInFleet} late-model trucks running flatbed, reefer, and dry van across all ${STATS.statesCovered} states — with live tracking links your customers can watch and a dispatch desk that picks up.`}
        primary="apply"
        applyHref="#quote"
        applyLabel="Get a rate"
      >
        <dl className="grid grid-cols-2 gap-3">
          {HERO_FACTS.map((fact) => (
            <div key={fact.label} className="rounded-m-3 border border-white/10 bg-white/5 p-4">
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd className="mt-2 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <section aria-labelledby="equipment-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="equipment-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              Equipment that fits your freight
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
            {EQUIPMENT_TYPES.map((eq, i) => (
              <Reveal as="li" key={eq.name} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <eq.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{eq.name}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{eq.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="why-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Why brokers keep our number
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-x-10 gap-y-8 md:grid-cols-3">
            {WHY.map((item, i) => (
              <Reveal as="li" key={item.title} index={Math.min(i, 4)}>
                <item.icon className="h-5 w-5 text-orange-300" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{item.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-steel-300">{item.text}</p>
              </Reveal>
            ))}
          </ul>
          <p className="mx-auto mt-8 flex max-w-measure flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-m-body text-steel-300">
            <BadgeCheck className="h-4 w-4 text-orange-300" aria-hidden />
            <span>Verify us anytime on the FMCSA SAFER snapshot — USDOT</span>
            <span className="font-mono tabular-nums text-white">{COMPANY_INFO.dot}</span>
            <span>· MC</span>
            <span className="font-mono tabular-nums text-white">{COMPANY_INFO.mc}</span>
          </p>
        </div>
      </section>

      {/* The tool before the form: answer "how far, how long" without a call. */}
      <section aria-labelledby="lane-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="lane-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Check the lane first
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Driving miles and a realistic delivery window under real hours-of-service rules — then
              send the lane straight to dispatch with one click.
            </p>
          </Reveal>
          <div className="mx-auto mt-8 max-w-5xl">
            <LaneTransitEstimator />
          </div>
        </div>
      </section>

      {/* The page's one conversion block. */}
      <section id="quote" aria-labelledby="quote-heading" className="scroll-mt-24 py-section">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <h2
                id="quote-heading"
                className="font-display text-m-h2 font-bold text-balance text-white"
              >
                Get a quote from dispatch
              </h2>
              <p className="mt-3 text-m-body text-steel-300">
                <span>
                  Spot rate or dedicated lane — tell us the freight and we&apos;ll come back with a
                  number, not a runaround. Prefer the phone?{" "}
                </span>
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex items-center font-semibold text-white underline-offset-4 hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
              </p>
            </Reveal>

            <div className="mt-8">
              <ShipperQuoteForm />
            </div>

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-m-body text-steel-300">
              <MapPin className="h-4 w-4 shrink-0 text-orange-300" aria-hidden />
              <span>
                {`Based in ${COMPANY_INFO.location} — strongest on Pacific Northwest, I-5, I-90, and western lanes; running all ${STATS.statesCovered}.`}
              </span>
              <Link
                href="/routes"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                See our lanes
              </Link>
            </p>
            <p className="mt-3 text-center text-m-body text-steel-300">
              <span>Shipping LTL and not sure of the class? </span>
              <Link
                href="/tools/freight-class-calculator"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                Use our free freight class calculator
              </Link>
            </p>
            {/* Escape hatch: nobody gets trapped in the shipper lane. */}
            <p className="mt-3 text-center text-m-body text-steel-300">
              <span>Not a shipper? </span>
              <Link
                href="/drivers"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                For drivers
              </Link>
              <span> · </span>
              <Link
                href="/brokers"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                For brokers
              </Link>
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        title="Useful before you call"
        intro="The documents, specs and tools a shipper normally has to email us for."
        links={SHIPPER_LINKS}
        tone="dark"
      />
    </div>
  )
}
