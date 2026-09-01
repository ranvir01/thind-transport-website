import Link from "next/link"
import { ArrowRight, CalendarDays, Home, Route } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Local Kent ads lead with home time (M–F / home daily). Mega-carrier
 * recruiting sites (Schneider, Knight, Werner) put Local / Regional / OTR
 * job cards with pay + home time in the first scroll. This band is both:
 * three lanes, numbers from PAY_RATES, no extra primary CTA — the cards
 * use the same text-link pattern as AudienceSelector so the hero's
 * orange Apply stays the one red button in view.
 */

function homeTimeLabel(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === "daily") return "Home daily"
  if (lower === "weekly") return "Home weekly"
  return `${raw} out`
}

interface Lane {
  href: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  homeTime: string
  perMile: string
  annual: string
  note: string
  primary?: boolean
}

const LANES: Lane[] = [
  {
    href: "/apply?type=company&lane=local",
    icon: Home,
    title: "Local",
    homeTime: PAY_RATES.companyDriver.local.homeTime,
    perMile: PAY_RATES.companyDriver.local.perMile,
    annual: PAY_RATES.companyDriver.local.annual,
    note: `${COMPANY_INFO.location} yard. Sleep in your own bed.`,
    primary: true,
  },
  {
    href: "/apply?type=company&lane=regional",
    icon: CalendarDays,
    title: "Regional",
    homeTime: PAY_RATES.companyDriver.regional.homeTime,
    perMile: PAY_RATES.companyDriver.regional.perMile,
    annual: PAY_RATES.companyDriver.regional.annual,
    note: "Out during the week, home on the weekend.",
  },
  {
    href: "/apply?type=company&lane=otr",
    icon: Route,
    title: "OTR",
    homeTime: PAY_RATES.companyDriver.otr.homeTime,
    perMile: PAY_RATES.companyDriver.otr.perMile,
    annual: PAY_RATES.companyDriver.otr.annual,
    note: "Miles when you want them. Same rate as local.",
  },
]

export function HomeTimeLanes() {
  return (
    <section aria-labelledby="hometime-heading" className="bg-paper py-12 md:py-16">
      <div className="container px-4">
        <Reveal className="text-center">
          <h2
            id="hometime-heading"
            className="font-display text-m-h3 font-bold text-ink"
          >
            Pick the home time. Same {PAY_RATES.companyDriver.local.perMile}/mile.
          </h2>
          <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
            Home daily from the Kent yard, home weekly on regional, or OTR for
            the miles. Same {PAY_RATES.companyDriver.local.perMile}/mile on
            every lane — picking local is not a pay cut.
          </p>
        </Reveal>

        <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
          {LANES.map((lane, i) => (
            <Reveal as="li" key={lane.title} index={i}>
              <Link
                href={lane.href}
                className={[
                  "group flex h-full min-h-[44px] flex-col rounded-m-3 border p-6",
                  "transition-[transform,box-shadow,border-color] duration-base ease-entrance",
                  "hover:-translate-y-0.5 hover:shadow-m-e3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  lane.primary
                    ? "border-[rgba(196,40,32,0.4)] bg-[rgba(196,40,32,0.04)] hover:border-signal"
                    : "border-[rgba(20,22,24,0.2)] bg-paper hover:border-[rgba(20,22,24,0.4)]",
                ].join(" ")}
              >
                <lane.icon
                  className={`h-6 w-6 ${lane.primary ? "text-signal" : "text-ink-3"}`}
                  aria-hidden
                />
                <span className="mt-4 font-display text-m-h4 font-bold text-ink">
                  {lane.title}
                </span>
                <span className="mt-1 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                  {homeTimeLabel(lane.homeTime)}
                </span>
                <span className="mt-3 font-display text-m-h3 font-bold text-ink">
                  {lane.perMile}
                  <span className="ml-1 text-m-body font-semibold text-ink-2">/mile</span>
                </span>
                <span className="mt-1 text-m-body text-ink-2">{lane.annual}/year</span>
                <span className="mt-3 flex-1 text-m-body text-ink-2">{lane.note}</span>
                <span
                  className={`mt-4 inline-flex items-center gap-1.5 text-m-body font-semibold ${
                    lane.primary ? "text-signal" : "text-ink"
                  }`}
                >
                  Apply for {lane.title.toLowerCase()}
                  <ArrowRight className="h-4 w-4 transition-transform duration-base ease-entrance group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mx-auto mt-6 max-w-5xl text-center text-m-body text-ink-2">
          Running your own truck?{" "}
          <Link
            href="/owner-operators"
            className="font-semibold text-signal underline-offset-4 hover:underline"
          >
            Keep {PAY_RATES.ownerOperator.commission} of gross
          </Link>
          {" · "}
          <Link
            href="/apply?type=owner"
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Lease on
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
