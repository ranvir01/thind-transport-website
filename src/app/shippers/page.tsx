import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  BadgeCheck, Clock, MapPin, Phone, Radar, ShieldCheck, Snowflake, Container, Layers,
  Calculator, FileCheck, Route, Truck,
} from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { ShipperQuoteForm } from "@/components/features/ShipperQuoteForm"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { LaneTransitEstimator } from "@/components/features/LaneTransitEstimator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { CountUp } from "@/components/shared/CountUp"
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
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, $1M liability, live safety record.`,
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
    "Thind Transport is an asset-based carrier in Kent, WA running flatbed, reefer, and dry van freight across all 48 states. USDOT 2523064, MC 876103, fully insured, live shipment tracking. Request a quote direct from dispatch.",
  alternates: { canonical: "/shippers" },
}

const EQUIPMENT = [
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PersonaRemember persona="shippers" />
      <PageBreadcrumb pageName="Ship With Us" category="Company" />

      {/* Hero */}
      <div className="relative overflow-hidden bg-[#060607] text-white">
        <Image
          src="/images/generated/truck-night-highway.webp"
          alt="Illustration of a tractor-trailer running a night highway lane"
          fill
          sizes="100vw"
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060607] via-[#060607]/60 to-transparent" />
        <div className="container relative px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Asset-based carrier · Kent, WA</span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
              Your freight, our trucks,{" "}
              <span className="text-orange">zero babysitting.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl">
              {STATS.trucksInFleet} late-model trucks running flatbed, reefer, and dry van across all{" "}
              {STATS.statesCovered} states — with live tracking links your customers can watch and a
              dispatch desk that picks up.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#quote"
                className="flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-500"
              >
                Get a quote
              </a>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: "USDOT", value: COMPANY_INFO.dot },
              { label: "MC", value: COMPANY_INFO.mc },
              // Counts animate; registration numbers are identifiers, not
              // quantities — counting them up would read as a slot machine.
              { label: "Years running", count: STATS.yearsInBusiness },
              { label: "States covered", count: STATS.statesCovered },
            ].map((item) => (
              <div key={item.label} className="px-4 py-5 text-center">
                <p className="text-2xl font-black text-gray-900">
                  {typeof item.count === "number" ? <CountUp value={item.count} /> : item.value}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container px-4 py-16">
        {/* Equipment */}
        <h2 className="text-3xl font-black text-gray-900 text-center mb-10">Equipment that fits your freight</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {EQUIPMENT.map((eq, i) => (
            <Reveal key={eq.name} index={Math.min(i, 3)}>
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-[transform,box-shadow] duration-fast ease-entrance hover:shadow-xl motion-safe:hover:-translate-y-1">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600/10">
                  <eq.icon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{eq.name}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{eq.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Why us */}
        <div className="mb-16 rounded-3xl bg-gradient-to-br from-[#17181B] via-[#101114] to-[#17181B] p-8 md:p-12 text-white shadow-2xl">
          <h2 className="mb-8 text-3xl font-black text-center">Why brokers keep our number</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {WHY.map((item) => (
              <div key={item.title}>
                <item.icon className="mb-3 h-7 w-7 text-orange-400" />
                <h3 className="mb-2 font-bold text-lg">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-white/60">
            <BadgeCheck className="h-4 w-4 text-green-400" />
            Verify us anytime: FMCSA SAFER snapshot, USDOT {COMPANY_INFO.dot} · MC {COMPANY_INFO.mc}
          </p>
        </div>

        {/* The tool before the form: answer "how far, how long" without a call */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Check the lane first</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Driving miles and a realistic delivery window under real hours-of-service rules — then
              send the lane straight to dispatch with one click.
            </p>
          </div>
          <LaneTransitEstimator />
        </div>

        {/* Quote form */}
        <div id="quote" className="mx-auto max-w-3xl scroll-mt-24">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Get a quote from dispatch</h2>
            <p className="text-gray-600">
              Spot rate or dedicated lane — tell us the freight and we&apos;ll come back with a number,
              not a runaround. Prefer the phone?{" "}
              <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-orange-600">
                {COMPANY_INFO.phone}
              </a>
              .
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-10 shadow-xl">
            <ShipperQuoteForm />
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            <MapPin className="mr-1 inline h-4 w-4" />
            Based in Kent, WA — strongest on Pacific Northwest, I-5, I-90, and western lanes; running all 48.{" "}
            <Link href="/routes" className="font-medium text-orange-600 hover:underline">
              See our lanes
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-gray-500">
            Shipping LTL and not sure of the class?{" "}
            <Link
              href="/tools/freight-class-calculator"
              className="font-medium text-orange-600 hover:underline"
            >
              Use our free freight class calculator
            </Link>
          </p>
          {/* Escape hatch: nobody gets trapped in the shipper lane. */}
          <p className="mt-4 text-center text-sm text-gray-500">
            Not a shipper?{" "}
            <Link href="/drivers" className="font-medium text-orange-600 hover:underline">
              For drivers
            </Link>{" "}
            ·{" "}
            <Link href="/brokers" className="font-medium text-orange-600 hover:underline">
              For brokers
            </Link>
          </p>
        </div>
      </div>

      <RelatedLinks
        title="Useful before you call"
        intro="The documents, specs and tools a shipper normally has to email us for."
        links={SHIPPER_LINKS}
      />
    </div>
  )
}
