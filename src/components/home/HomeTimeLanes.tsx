import Link from "next/link"
import { ArrowRight, CalendarDays, Home, Route } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Local / Regional / OTR as three home-time lanes with the published numbers.
 *
 * Local Kent ads lead with home time (M–F, home daily); the mega-carrier
 * recruiting sites (Schneider, Knight, Werner) put Local / Regional / OTR
 * cards with pay + home time in the first scroll. This band is both. It
 * replaces the three-card RoutesSection (typical-day bullets nobody could
 * verify, a three-deep card stack) and absorbs EquipmentSection's one
 * load-bearing fact — what you drive — as a single line. Every figure
 * interpolates PAY_RATES / EQUIPMENT; the "same rate on every lane" copy is
 * derived from the constants and switches itself off the day the lanes stop
 * paying the same.
 *
 * Ported from cursor/driver-attraction-kit-3dc5 onto the D0 alpha tokens
 * (`border-signal/40`, not a hand-typed rgba). The referral link that branch
 * carried is gone — that page never shipped. Server component: links need no
 * JavaScript.
 */

const LOCAL = PAY_RATES.companyDriver.local
const REGIONAL = PAY_RATES.companyDriver.regional
const OTR = PAY_RATES.companyDriver.otr
const OO = PAY_RATES.ownerOperator

// Widened to string[] on purpose: comparing two distinct `as const` literals is
// a TypeScript error, so the day the rates diverge this would fail to compile
// instead of quietly switching the copy off.
const COMPANY_RATES: string[] = [LOCAL.perMile, REGIONAL.perMile, OTR.perMile]
const SAME_RATE = COMPANY_RATES.every((rate) => rate === COMPANY_RATES[0])

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
  /** How the CTA names the lane — "OTR" keeps its caps. */
  ctaName: string
  homeTime: string
  perMile: string
  annual: string
  note: string
  /** Local is what the Kent yard is hiring for first, so its card is weighted. */
  primary?: boolean
}

const LANES: Lane[] = [
  {
    href: "/apply?type=company&lane=local",
    icon: Home,
    title: "Local",
    ctaName: "local",
    homeTime: LOCAL.homeTime,
    perMile: LOCAL.perMile,
    annual: LOCAL.annual,
    note: `${COMPANY_INFO.location} yard. Sleep in your own bed.`,
    primary: true,
  },
  {
    href: "/apply?type=company&lane=regional",
    icon: CalendarDays,
    title: "Regional",
    ctaName: "regional",
    homeTime: REGIONAL.homeTime,
    perMile: REGIONAL.perMile,
    annual: REGIONAL.annual,
    note: "Out during the week, home on the weekend.",
  },
  {
    href: "/apply?type=company&lane=otr",
    icon: Route,
    title: "OTR",
    ctaName: "OTR",
    homeTime: OTR.homeTime,
    perMile: OTR.perMile,
    annual: OTR.annual,
    note: SAME_RATE ? "Miles when you want them. Same rate as local." : "Miles when you want them.",
  },
]

export function HomeTimeLanes() {
  return (
    <section id="home-time" aria-labelledby="hometime-heading" className="bg-paper py-section-tight md:py-section-loose">
      <div className="container">
        <Reveal className="text-center">
          <h2 id="hometime-heading" className="font-display text-m-h3 font-bold text-ink">
            {SAME_RATE
              ? `Pick the home time. Same ${LOCAL.perMile}/mile.`
              : "Pick the home time that fits your life."}
          </h2>
          <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
            {SAME_RATE
              ? `Home daily from the ${COMPANY_INFO.location} yard, home weekly on regional, or OTR for the miles. Same ${LOCAL.perMile}/mile on every lane — picking local is not a pay cut.`
              : `Home daily from the ${COMPANY_INFO.location} yard, home weekly on regional, or OTR for the miles. The rate for each lane is below.`}
          </p>
        </Reveal>

        {/* Phone width: a snap row with the next card peeking (the pattern the
            old RoutesSection used) so the three lanes take one screen, not
            three; a plain grid from md up. */}
        <ul className="no-scrollbar -mx-4 mt-6 flex max-w-5xl snap-x snap-mandatory list-none gap-3 overflow-x-auto px-4 pb-1 md:mx-auto md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {LANES.map((lane, i) => (
            <Reveal as="li" key={lane.title} index={i} className="min-w-[82%] snap-center md:min-w-0">
              <Link
                href={lane.href}
                className={[
                  "group flex h-full flex-col rounded-m-3 border p-5",
                  "transition-[transform,box-shadow,border-color] duration-base ease-entrance",
                  "hover:-translate-y-0.5 hover:shadow-m-e3",
                  // Border-led surfaces (DIRECTION.md §10). Never bg-white here:
                  // .brand-page-shell force-darkens it to navy on this page.
                  lane.primary
                    ? "border-signal/40 bg-signal/[0.04] hover:border-signal"
                    : "border-ink/20 bg-paper hover:border-ink/40",
                ].join(" ")}
              >
                <span className="flex items-center justify-between gap-3">
                  <lane.icon
                    className={`h-6 w-6 ${lane.primary ? "text-signal" : "text-ink-3"}`}
                    aria-hidden
                  />
                  <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                    {homeTimeLabel(lane.homeTime)}
                  </span>
                </span>
                <span className="mt-4 font-display text-m-h4 font-bold text-ink">{lane.title}</span>
                <span className="mt-2 font-mono text-m-h3 font-semibold tabular-nums text-ink">
                  {lane.perMile}
                  <span className="ml-1 font-sans text-m-body font-semibold text-ink-2">/mile</span>
                </span>
                <span className="mt-1 text-m-body text-ink-2">
                  <span className="font-mono tabular-nums">{lane.annual}</span>
                  <span> a year</span>
                </span>
                <span className="mt-2 flex-1 text-m-body text-ink-2">{lane.note}</span>
                <span
                  className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-m-body font-semibold ${
                    lane.primary ? "text-signal" : "text-ink"
                  }`}
                >
                  <span>Apply for {lane.ctaName}</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-base ease-entrance group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>

        {/* Owner-operators: the split, the rate, the gross — one mono row, not a
            fourth card. Landstar and Schneider lead their O/O pages with exactly
            this triple. */}
        <Reveal
          className="mx-auto mt-6 flex max-w-5xl flex-col gap-4 rounded-m-3 border border-ink/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
          index={3}
        >
          <div>
            <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Running your own truck?
            </p>
            <p className="mt-1 text-m-body text-ink-2">
              <span>Keep </span>
              <strong className="font-mono font-semibold tabular-nums text-ink">{OO.commission}</strong>
              <span> of gross · </span>
              <span className="font-mono tabular-nums text-ink">{OO.perMile}</span>
              <span>/mile · </span>
              <span className="font-mono tabular-nums text-ink">{OO.annualGross}</span>
              <span>{` gross a year · ${OO.fuelSurcharge} of the fuel surcharge passed through`}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-m-body font-semibold">
            <Link
              href="/owner-operators"
              className="inline-flex min-h-[44px] items-center text-signal underline-offset-4 hover:underline"
            >
              How the split works
            </Link>
            <Link
              href="/apply?type=owner"
              className="inline-flex min-h-[44px] items-center text-ink underline-offset-4 hover:underline"
            >
              Lease on
            </Link>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-6 max-w-5xl text-center text-m-body text-ink-2" index={4}>
          <span>{`Every lane runs ${EQUIPMENT.short} — ${EQUIPMENT.apu.toLowerCase()}. `}</span>
          <Link href="/fleet" className="font-semibold text-ink underline-offset-4 hover:underline">
            See the fleet
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
