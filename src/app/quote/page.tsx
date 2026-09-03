import { Metadata } from "next"
import Link from "next/link"
import { Calculator, Clock, FileCheck, MapPin, Route, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, SERVICES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { QuoteFormWithLane } from "@/components/features/QuoteFormWithLane"
import { LaneTransitEstimator } from "@/components/features/LaneTransitEstimator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { Reveal } from "@/components/ui/Reveal"

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
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc} — with the FMCSA links.`,
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
    `Request a freight quote direct from Thind Transport's dispatch desk. Flatbed, reefer, and dry van across all ${STATS.statesCovered} states out of ${COMPANY_INFO.location}. No broker in the middle. USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}.`,
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
 *
 * The hero's one red is the phone, not a second Apply: a shipper who lands
 * here already wants the number, and the form below is the other half of the
 * page. Both instruments (form, lane estimator) are their own paper islands
 * on the dark ground; nothing else on the page is paper.
 */

const ASIDE = [
  {
    icon: Clock,
    title: "A person, not a queue",
    text: "Quotes come back from the dispatch desk during business hours — usually much faster. If it's urgent, call; that's the fastest path there is.",
  },
  {
    icon: MapPin,
    title: "Where we're strongest",
    text: `${COMPANY_INFO.location} is home. Pacific Northwest, I-5 and I-90 are our best lanes, and we run all ${STATS.statesCovered} states.`,
  },
  {
    icon: ShieldCheck,
    title: "Check us before you book",
    text: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Authority, insurance, and SAFER in one place.`,
  },
] as const

export default function QuotePage() {
  return (
    <div className="brand-page-shell overflow-x-hidden">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Get a Quote"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Direct carrier · No broker"
        title="Tell us the freight. We'll tell you the number."
        description={`You're quoting the carrier that actually hauls it — the ${STATS.trucksInFleet} trucks, the drivers, and the dispatcher are all ours. Nothing gets re-brokered and nobody takes a cut in the middle.`}
        primary="call"
        omitApply
      />

      <section aria-labelledby="quote-form-heading" className="py-section">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Reveal>
                <h2
                  id="quote-form-heading"
                  className="font-display text-m-h2 font-bold text-balance text-white"
                >
                  Tell us about the freight
                </h2>
                <p className="mt-3 max-w-measure text-m-body text-steel-300">
                  <span>
                    The more you give us up front, the closer the first number is. Prefer to talk?{" "}
                  </span>
                  <a
                    href={`tel:${COMPANY_INFO.phoneFormatted}`}
                    className="inline-flex items-center font-semibold text-white underline-offset-4 hover:underline"
                  >
                    <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                  </a>
                </p>
              </Reveal>
              {/* Prefilled from ?lane= when the visitor arrives from the
                  estimator; see QuoteFormWithLane for why that read is
                  client-side. The form is its own paper island. */}
              <div className="mt-6">
                <QuoteFormWithLane />
              </div>
            </div>

            <aside aria-label="Before you send it" className="space-y-4">
              {ASIDE.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} index={Math.min(i, 4)}>
                  <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <Icon className="h-5 w-5 text-orange-300" aria-hidden />
                    <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{title}</h3>
                    <p className="mt-2 max-w-measure text-m-body text-steel-300">{text}</p>
                  </div>
                </Reveal>
              ))}

              <Reveal index={3}>
                <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                    Equipment
                  </p>
                  <p className="mt-2 text-m-body text-steel-300">{SERVICES.types.join(" · ")}</p>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      {/* Answer the two questions the form can't: how far, and how long. */}
      <section aria-labelledby="lane-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="lane-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              How far, and how long
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 max-w-5xl">
            <LaneTransitEstimator />
          </div>
          <p className="mt-8 text-center text-m-body text-steel-300">
            <span>Shipping LTL and unsure of the class? </span>
            <Link
              href="/tools/freight-class-calculator"
              className="inline-flex min-h-[44px] items-center font-semibold text-white underline-offset-4 hover:underline"
            >
              Use our free freight class calculator
            </Link>
          </p>
        </div>
      </section>

      <RelatedLinks
        title="Before you book"
        intro="Everything a shipper usually has to ask for, already on the site."
        links={QUOTE_LINKS}
        tone="dark"
      />
    </div>
  )
}
