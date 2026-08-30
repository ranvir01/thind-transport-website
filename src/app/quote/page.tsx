import { Metadata } from "next"
import Link from "next/link"
import { Calculator, Clock, FileCheck, MapPin, Route, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, SERVICES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { QuoteFormWithLane } from "@/components/features/QuoteFormWithLane"
import { LaneTransitEstimator } from "@/components/features/LaneTransitEstimator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"

const QUOTE_LINKS = [
  {
    href: "/tools/freight-class-calculator",
    title: "Freight class calculator",
    blurb: "Density in, NMFC class out — before the LTL quote comes back wrong.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/api/carrier-packet",
    title: "Carrier snapshot PDF",
    blurb: "Authority, insurance and equipment on one page, downloadable right now.",
    icon: FileCheck,
    kind: "Tool" as const,
  },
  {
    href: "/routes",
    title: "Lanes we run weekly",
    blurb: "Where our trucks already are — the cheapest freight is a lane we're empty on.",
    icon: Route,
    kind: "Page" as const,
  },
  {
    href: "/fleet",
    title: "The equipment list",
    blurb: "Every truck and trailer spec, so you know what shows up at your dock.",
    icon: Truck,
    kind: "Page" as const,
  },
  {
    href: "/trust",
    title: "Verify our authority",
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, $1M liability — with the FMCSA links.`,
    icon: ShieldCheck,
    kind: "Verify" as const,
  },
  {
    href: "/shippers",
    title: "How we ship",
    blurb: "Tracking links, POD turnaround, and who answers when you call.",
    icon: MapPin,
    kind: "Page" as const,
  },
]

export const metadata: Metadata = {
  title: "Get a Freight Quote | Flatbed, Reefer & Dry Van — Kent, WA",
  description:
    "Request a freight quote direct from Thind Transport's dispatch desk. Flatbed, reefer, and dry van across all 48 states out of Kent, WA. No broker in the middle. USDOT 2523064, MC 876103.",
  alternates: { canonical: "/quote" },
}

/**
 * The quote form lives on /shippers too, but it deserves its own route: it is
 * the page an ad or a "freight quote kent wa" search should land on, and an
 * anchor deep in a long pitch page is a worse landing target than a page whose
 * entire job is the form.
 *
 * Deliberately NOT an instant rate estimator. Contract freight pricing moves
 * with lane, volume, accessorials, and equipment — a fixed instant number
 * either signals inflexibility or gets re-rated later, and both cost more
 * trust than the speed buys. What matters is how fast a real person answers,
 * which is what the copy promises and what dispatch can actually deliver.
 */
export default function QuotePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Get a Quote" category="Company" />

      <div className="bg-[#060607] text-white">
        <div className="container px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Direct carrier · No broker</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              Tell us the freight. We&apos;ll tell you the number.
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              You&apos;re quoting the carrier that actually hauls it — the {STATS.trucksInFleet} trucks,
              the drivers, and the dispatcher are all ours. Nothing gets re-brokered and nobody takes a
              cut in the middle.
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-xl">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Request a quote</h2>
              <p className="text-gray-600 mb-6">
                The more you give us up front, the closer the first number is. Prefer to talk?{" "}
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="font-semibold text-orange-600 hover:underline"
                >
                  {COMPANY_INFO.phone}
                </a>
                .
              </p>
              {/* Prefilled from ?lane= when the visitor arrives from the
                  estimator; see QuoteFormWithLane for why that read is
                  client-side. */}
              <QuoteFormWithLane />
            </div>
          </div>

          <aside className="space-y-5">
            {[
              {
                icon: Clock,
                title: "A person, not a queue",
                text: "Quotes come back from the dispatch desk during business hours — usually much faster. If it's urgent, call; that's the fastest path there is.",
              },
              {
                icon: MapPin,
                title: "Where we're strongest",
                text: `Kent, WA is home. Pacific Northwest, I-5 and I-90 are our best lanes, and we run all ${STATS.statesCovered} states.`,
              },
              {
                icon: ShieldCheck,
                title: "Check us before you book",
                text: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Authority, insurance, and SAFER in one place.`,
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5">
                <Icon className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-1">Equipment</p>
              <p className="text-sm text-gray-600">{SERVICES.types.join(" · ")}</p>
            </div>
          </aside>
        </div>

        {/* Answer the two questions the form can't: how far, and how long. */}
        <div className="mt-12">
          <LaneTransitEstimator />
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          Shipping LTL and unsure of the class?{" "}
          <Link
            href="/tools/freight-class-calculator"
            className="inline-flex items-center min-h-11 font-medium text-orange-600 hover:underline"
          >
            Use our free freight class calculator
          </Link>
        </p>
      </div>

      <RelatedLinks
        title="Before you book"
        intro="Everything a shipper usually has to ask for, already on the site."
        links={QUOTE_LINKS}
      />
    </div>
  )
}
