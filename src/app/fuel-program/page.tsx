import { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, CreditCard, DollarSign, FileText, Fuel, MapPin, Percent, Calculator } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, SUPPORT } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { FuelSavingsCalculator } from "@/components/features/FuelSavingsCalculator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { Reveal } from "@/components/ui/Reveal"

const FUEL_LINKS = [
  {
    href: "/pay-rates",
    title: "Pay calculator",
    blurb: "Miles, rate and fuel price in — what a week actually clears, out.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/pay-breakdown",
    title: "Settlement, line by line",
    blurb: "Gross, fuel surcharge, deductions and the number that hits your account.",
    icon: DollarSign,
    kind: "Guide" as const,
  },
  {
    href: "/owner-operators",
    title: "Owner-operator terms",
    blurb: `The ${PAY_RATES.ownerOperator.commission} split, no forced dispatch, and what we don't deduct.`,
    icon: Percent,
    kind: "Page" as const,
  },
  {
    href: "/routes",
    title: "Lanes and fuel stops",
    blurb: "The corridors we run, with distances and transit times.",
    icon: MapPin,
    kind: "Page" as const,
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay on one screen — and it works with no signal.",
    icon: CreditCard,
    kind: "Tool" as const,
  },
  {
    href: "/apply",
    title: "Apply",
    blurb: "About a minute. Card and fuel network access start at orientation.",
    icon: FileText,
    kind: "Form" as const,
  },
]

export const metadata: Metadata = {
  title: "Fuel Card Program | Fleet Diesel Discounts for Owner Operators",
  description:
    "Thind Transport's fuel card program gives owner operators fleet-level diesel discounts at major truck stop chains nationwide, with 100% fuel surcharge pass-through. Run your own gallons through the calculator.",
  alternates: { canonical: "/fuel-program" },
}

/** The three things the card is. Copy unchanged from the card grid it replaces. */
const WHAT_IT_IS = [
  {
    icon: Fuel,
    title: "Fleet pricing",
    body: "Our volume discount at the pump, passed through at cost — no markup, no rebate we keep",
  },
  {
    icon: MapPin,
    title: "Major chains",
    body: "Accepted at the national truck stop chains listed below",
  },
  {
    icon: CreditCard,
    title: "No fees",
    body: "Zero transaction fees or hidden charges",
  },
] as const

const PROGRAM_FEATURES = [
  {
    title: "Weekly direct deposit",
    body: "Fuel advances available with settlements every Friday",
  },
  {
    title: `${SUPPORT.hours} support`,
    body: "Lost card? Need help? We're available around the clock",
  },
  {
    title: "Detailed reporting",
    body: "Track fuel expenses, MPG, and generate IFTA reports easily",
  },
  {
    title: "Partner perks",
    body: "Additional discounts on tires, maintenance, and truck washes",
  },
] as const

const NETWORK = [
  "Pilot Flying J",
  "Love's Travel Stops",
  "TA-Petro",
  "Speedway",
  "Casey's",
  "Kwik Trip",
  "Circle K",
  "Shell",
  "Ask dispatch for the current network list",
] as const

const HOW_IT_WORKS = [
  { step: "1", title: "Apply and get approved", body: "Apply once, with your onboarding paperwork" },
  { step: "2", title: "Receive your card", body: "Your card is mailed once the issuer approves it" },
  { step: "3", title: "Start saving", body: "Use at any participating location" },
] as const

export default function FuelProgramPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Fuel Program"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Fuel card program"
        title="Fleet diesel pricing, passed through at cost"
        description="Fleet-level diesel discounts at major truck stop chains nationwide. What it is worth to you depends on your gallons — the calculator below works it out."
      />

      <section aria-labelledby="what-it-is-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal>
            <h2
              id="what-it-is-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              What the card is
            </h2>
          </Reveal>
          <ul className="mt-8 grid list-none gap-4 md:grid-cols-3">
            {WHAT_IT_IS.map((item, i) => (
              <Reveal as="li" key={item.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <item.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{item.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-200">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The instrument: the discount, in the visitor's own numbers.
          Replaces a static "500 gal × 40¢ = $10,400" card that was true for
          exactly one truck and nobody else's. The page's paper island. */}
      <section aria-labelledby="fuel-calculator-heading" className="bg-navy-950 pb-section">
        <div className="container">
          <Reveal className="mx-auto max-w-5xl">
            <FuelSavingsCalculator />
          </Reveal>
        </div>
      </section>

      <div className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
            <section aria-labelledby="program-heading">
              <h2
                id="program-heading"
                className="font-display text-m-h2 font-bold text-paper text-balance"
              >
                Program features
              </h2>
              <dl className="mt-6 border-t border-white/10">
                {PROGRAM_FEATURES.map((feature, i) => (
                  <Reveal
                    key={feature.title}
                    index={Math.min(i, 4)}
                    className="border-b border-white/10 py-4"
                  >
                    <dt className="flex items-start gap-3 font-display text-m-h4 font-bold text-paper">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-signal-up" aria-hidden />
                      <span>{feature.title}</span>
                    </dt>
                    <dd className="mt-1 max-w-measure pl-8 text-m-body text-paper/80">{feature.body}</dd>
                  </Reveal>
                ))}
              </dl>
            </section>

            <section aria-labelledby="network-heading">
              <h2
                id="network-heading"
                className="font-display text-m-h2 font-bold text-paper text-balance"
              >
                Accepted nationwide at
              </h2>
              <ul className="mt-6 grid list-none gap-3 sm:grid-cols-2">
                {NETWORK.map((partner) => (
                  <li key={partner} className="flex items-start gap-2 text-m-body text-paper/80">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-signal-up" aria-hidden />
                    <span>{partner}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      <section aria-labelledby="how-it-works-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2
                id="how-it-works-heading"
                className="font-display text-m-h2 font-bold text-white text-balance"
              >
                How it works
              </h2>
            </Reveal>
            <ol className="mt-8 grid list-none gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((item, i) => (
                <Reveal as="li" key={item.step} index={Math.min(i, 4)}>
                  <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-m-lede font-bold tabular-nums text-orange-300">
                      {item.step}
                    </span>
                    <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{item.title}</h3>
                    <p className="mt-2 max-w-measure text-m-body text-steel-200">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* An unattributable testimonial and a 5-star rating used to sit here.
          TRUST_INDICATORS in src/lib/constants.ts is explicit: verifiable
          indicators only, no invented ratings. The calculator above makes the
          same point with the visitor's own numbers. */}

      <RelatedLinks
        tone="dark"
        title="The rest of the money picture"
        intro="Fuel is one line on the settlement. Here's every other line, and the tools behind them."
        links={FUEL_LINKS}
      />

      {/* The page's ONE closing block. The orange-gradient card that used to
          close the page carried a second Apply and a second Call. */}
      <section aria-labelledby="fuel-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="fuel-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Start saving on fuel
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              The card comes with onboarding, and the discount is passed through at cost. No hidden
              fees.
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
          </div>
        </div>
      </section>
    </div>
  )
}
