import { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight, DollarSign, Shield, Truck, Calendar, CheckCircle2,
  Calculator, Fuel, MapPin, Smartphone, BadgeCheck,
  type LucideIcon,
} from "lucide-react"
import { BENEFITS, COMPANY_INFO, EQUIPMENT, PAY_RATES, SUPPORT } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"
import { RelatedLinks } from "@/components/shared/RelatedLinks"

const OO = PAY_RATES.ownerOperator
const CD = PAY_RATES.companyDriver
/** "$1,000 (First Year)" -> "$1,000" — the amount without its qualifier. */
const CD_SIGN_ON = CD.signOnBonus.split(" ")[0]

export const metadata: Metadata = {
  title: "Driver benefits — and what we don't offer",
  description: `What Thind Transport actually offers CDL drivers: ${CD.otr.perMile}/mile, weekly direct deposit, a ${CD_SIGN_ON} first-year sign-on bonus, referral and performance bonuses, home time you pick, and late-model equipment. Plus a straight answer on what we don't offer yet.`,
  keywords: [
    "truck driver benefits",
    "driver sign on bonus",
    "owner operator benefits",
    "trucking company perks",
    "driver home time",
    "fuel discount program",
    "weekly settlement trucking",
    "no forced dispatch carrier",
  ],
  alternates: { canonical: "/benefits" },
}

/**
 * Only what we actually provide today — and now read straight out of
 * `BENEFITS` in src/lib/constants.ts rather than retyped here.
 *
 * Health/dental/vision, life, disability and the 401(k) came off this page in
 * July 2026 — we do not carry those plans, and a benefit a driver first hears
 * is missing at orientation costs more than it ever won at the top of the
 * funnel. `NOT_YET` below states that outright instead of leaving a gap. If we
 * ever add a plan, it goes in `BENEFITS` first and appears here on its own.
 */
interface BenefitGroup {
  id: string
  icon: LucideIcon
  heading: string
  intro: string
  items: readonly string[]
}

const BENEFIT_GROUPS: BenefitGroup[] = [
  {
    id: "company-drivers",
    icon: Shield,
    heading: "Company drivers",
    intro: `Every line below is something we provide today, at ${CD.otr.perMile} a mile whether you run local, regional or OTR.`,
    items: BENEFITS.companyDriver,
  },
  {
    id: "home-time",
    icon: Calendar,
    heading: "Home time",
    intro: "Pick the lane that fits your life. The rate does not change when you pick the one that gets you home.",
    items: BENEFITS.homeTimeOptions,
  },
  {
    id: "owner-operators",
    icon: Truck,
    heading: "Owner operators",
    intro: `${OO.commission} of gross, no forced dispatch, and ${OO.fuelSurcharge} of the fuel surcharge passed through.`,
    items: BENEFITS.ownerOperator,
  },
]

/** Our terms, from constants. No invented "industry average" column: the
 *  numbers that used to sit there had no source and contradicted the second
 *  set on the homepage. */
const termsData = [
  { feature: "Commission rate (owner-operator)", thind: OO.commission },
  { feature: "Fuel surcharge", thind: `${OO.fuelSurcharge} to the driver` },
  { feature: "Sign-on bonus (owner-operator)", thind: OO.signOnBonus },
  { feature: "Sign-on bonus (company driver)", thind: CD.signOnBonus },
  { feature: "Company driver rate", thind: `${CD.otr.perMile}/mile, local, regional or OTR` },
  { feature: "Forced dispatch", thind: "Never" },
  { feature: "Settlements", thind: "Every Friday" },
  { feature: "Deductions we take from the split", thind: "None" },
]

/** The four published numbers, static mono text. They used to count up on
 *  scroll; a rate and a percentage are identifiers, not a scoreboard. */
const HERO_FACTS = [
  { value: OO.commission, label: "Commission", note: "Owner operators" },
  { value: CD.otr.perMile, label: "Per mile", note: "Company drivers" },
  { value: OO.fuelSurcharge, label: "Fuel surcharge", note: "Passed through" },
  { value: SUPPORT.hours, label: "Support", note: "Real people" },
] as const

/**
 * The other half of an honest benefits page. A driver comparing carriers is
 * checking for exactly these, and finding out at orientation is how a carrier
 * loses someone in week two.
 */
const NOT_YET = [
  {
    title: "No company medical, dental or vision plan",
    detail:
      "You'd be arranging your own coverage — through the marketplace, a spouse's plan, or an association plan like OOIDA's. Ask us and we'll tell you what other drivers here ended up doing.",
  },
  {
    title: "No 401(k) or company retirement match",
    detail:
      "Nothing stops you opening your own IRA or solo 401(k) — owner-operators here generally do — but there is no company plan and no match today.",
  },
  {
    title: "No company life or disability policy",
    detail:
      "Occupational accident coverage is available to owner-operators through our program, and we'll help you navigate it. That is not the same thing as company-paid life or disability insurance, and we won't call it that.",
  },
] as const

const BENEFIT_LINKS = [
  {
    href: "/pay-rates",
    title: "Pay calculator",
    blurb: "Put your own miles, rate and fuel price in and see what a week actually clears.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/pay-breakdown",
    title: "Where every dollar goes",
    blurb: "A line-by-line settlement: gross, fuel surcharge, deductions, what lands in the account.",
    icon: DollarSign,
    kind: "Guide" as const,
  },
  {
    href: "/fuel-program",
    title: "Fuel savings calculator",
    blurb: "What the fuel card takes off your cost per mile, in your own numbers.",
    icon: Fuel,
    kind: "Tool" as const,
  },
  {
    href: "/routes",
    title: "Lanes we actually run",
    blurb: "The corridors, the frequency, and the home time each one really means.",
    icon: MapPin,
    kind: "Page" as const,
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay on one screen — and it keeps working in dead zones.",
    icon: Smartphone,
    kind: "Tool" as const,
  },
  {
    href: "/trust",
    title: "Verify us first",
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, insurance and safety record — check before you apply.`,
    icon: BadgeCheck,
    kind: "Verify" as const,
  },
]

export default function BenefitsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Benefits"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Driver benefits"
        title="What we offer — and what we don't"
        description="Weekly pay, home time you choose, late-model equipment — plus a straight list of what we don't offer yet, so nothing is a surprise at orientation."
      >
        <dl className="grid grid-cols-2 gap-4 rounded-m-3 border border-white/10 bg-white/5 p-6">
          {HERO_FACTS.map((fact) => (
            <div key={fact.label}>
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd className="mt-1 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {fact.value}
              </dd>
              <dd className="text-m-body text-paper/70">{fact.note}</dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      {BENEFIT_GROUPS.map((group, groupIndex) => (
        <section
          key={group.id}
          aria-labelledby={`${group.id}-heading`}
          className={groupIndex === 0 ? "bg-navy-950 py-section" : "bg-navy-950 pb-section"}
        >
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <Reveal>
                <h2
                  id={`${group.id}-heading`}
                  className="flex items-center gap-3 font-display text-m-h2 font-bold text-white text-balance"
                >
                  <group.icon className="h-6 w-6 shrink-0 text-orange-300" aria-hidden />
                  <span>{group.heading}</span>
                </h2>
                <p className="mt-3 max-w-measure text-m-body text-steel-200">{group.intro}</p>
              </Reveal>

              <ul className="mt-6 grid list-none gap-3 md:grid-cols-2">
                {group.items.map((item, i) => (
                  <Reveal as="li" key={item} index={Math.min(i, 4)}>
                    <div className="flex h-full items-start gap-3 rounded-m-3 border border-white/10 bg-white/5 p-4">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-300" aria-hidden />
                      <span className="text-m-body text-steel-200">{item}</span>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="equipment-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2
              id="equipment-heading"
              className="font-display text-m-h2 font-bold text-paper text-balance"
            >
              What you drive, and who answers
            </h2>
            <p className="mt-3 max-w-measure text-m-lede text-paper/80">
              {`${EQUIPMENT.modelYears} ${EQUIPMENT.makes}, ${EQUIPMENT.apu.toLowerCase()}. ${SUPPORT.dispatch} — real people, ${SUPPORT.phrase}.`}
            </p>
          </div>
        </div>
      </section>

      {/* Dense data on paper: the terms table is the one thing on this page a
          driver reads twice and screenshots. */}
      <section aria-labelledby="terms-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2 id="terms-heading" className="font-display text-m-h2 font-bold text-ink text-balance">
              The terms, in writing
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-ink-2">
              Every figure below comes from the same file the calculators read. Ask any carrier
              you&apos;re comparing us to for the same list.
            </p>

            <dl className="mt-8 border-t border-ink/15">
              {termsData.map((row) => (
                <div
                  key={row.feature}
                  className="flex flex-col gap-1 border-b border-ink/15 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <dt className="text-m-body text-ink-2 sm:flex-1">{row.feature}</dt>
                  <dd className="font-mono text-m-body font-semibold tabular-nums text-ink">
                    {row.thind}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* What we don't offer — stated, not omitted */}
      <section aria-labelledby="not-yet-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2
                id="not-yet-heading"
                className="font-display text-m-h2 font-bold text-paper text-balance"
              >
                What we don&apos;t offer
              </h2>
              <p className="mt-3 max-w-measure text-m-lede text-paper/80">
                Three things a driver comparing carriers will ask about, and we&apos;d rather you
                heard them here than in your second week.
              </p>
            </Reveal>

            <ul className="mt-8 grid list-none gap-4 md:grid-cols-3">
              {NOT_YET.map((item, i) => (
                <Reveal as="li" key={item.title} index={Math.min(i, 4)}>
                  <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <h3 className="font-display text-m-h4 font-bold text-paper">{item.title}</h3>
                    <p className="mt-2 text-m-body text-paper/80">{item.detail}</p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal className="mt-8">
              <p className="max-w-measure text-m-body text-paper/80">
                <span>
                  Everything above is what we can offer instead: a higher take-home rate, weekly
                  pay, and no games about it.{" "}
                </span>
                <Link
                  href="/pay-breakdown"
                  className="font-semibold text-paper underline-offset-4 hover:text-signal-up hover:underline"
                >
                  See where every dollar goes
                </Link>
                <span> or ask us directly at </span>
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="font-semibold text-paper underline-offset-4 hover:text-signal-up hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
                <span>.</span>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Check the numbers yourself"
        intro="Benefits pages are easy to write. These are the tools and records behind ours."
        links={BENEFIT_LINKS}
      />

      {/* The page's ONE closing block. The navy photo band that used to close
          the page repeated the hero's Apply and its Call one screen later. */}
      <section aria-labelledby="benefits-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="benefits-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Ready to run on these terms?
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              {`${CD.otr.perMile} a mile for company drivers, ${OO.commission} of the linehaul for owner-operators, and a real person on the phone in ${COMPANY_INFO.location}.`}
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
