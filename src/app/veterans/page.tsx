import { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight, Shield, Truck, DollarSign, CheckCircle2,
  Calendar, GraduationCap,
} from "lucide-react"
import { COMPANY_INFO, PAY_RATES, STATS, SUPPORT } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator
const CD = PAY_RATES.companyDriver
/** "$1,000 (First Year)" -> "$1,000" — the amount without its qualifier. */
const CD_SIGN_ON = CD.signOnBonus.split(" ")[0]

export const metadata: Metadata = {
  title: "CDL jobs for military veterans",
  description: `Thind Transport hires military veterans for CDL Class A work out of ${COMPANY_INFO.location} — ${OO.commission} commission for owner-operators, ${CD.otr.perMile}/mile for company drivers, same terms as every other driver. Guard and reserve schedules accommodated.`,
  keywords: [
    "veteran truck driver jobs",
    "military CDL jobs",
    "veteran trucking careers",
    "military to trucking",
    "veteran owner operator",
    "ex-military truck driver",
    "military skills trucking",
    "veteran driver benefits",
    "trucking jobs for veterans",
  ],
  alternates: { canonical: "/veterans" },
}

const veteranBenefits = [
  {
    icon: DollarSign,
    title: "Competitive veteran pay",
    description: `Same great rates for all: ${OO.commission} commission for O/O, ${CD.otr.perMile}/mile for company drivers. Your military experience is valued.`,
  },
  {
    icon: Shield,
    title: "Skills translation",
    description:
      "Military logistics, convoy operations, and discipline translate directly to trucking success. We recognize and value these skills.",
  },
  {
    icon: Calendar,
    title: "Flexible scheduling",
    description:
      "We work with reserve/guard commitments and understand military family needs. Your service doesn't end when you leave active duty.",
  },
  {
    icon: GraduationCap,
    title: "CDL training assistance",
    description:
      "Need your CDL? We can guide you to training programs that accept GI Bill benefits. Start your trucking career the right way.",
  },
]

const militarySkillsTranslation = [
  { military: "Convoy operations", trucking: "Route planning, timing, coordination" },
  { military: "Vehicle maintenance", trucking: "Pre-trip inspections, equipment care" },
  { military: "Logistics and supply chain", trucking: "Load management, delivery scheduling" },
  { military: "Discipline and professionalism", trucking: "On-time delivery, customer relations" },
  { military: "Security clearance", trucking: "DOD contracts, sensitive freight" },
  { military: "Leadership", trucking: "Team driving, training new drivers" },
  { military: "Adaptability", trucking: "Weather, routing, schedule changes" },
  { military: "Safety protocols", trucking: "DOT compliance, accident prevention" },
]

const cdlPrograms = [
  {
    name: "GI Bill approved schools",
    description:
      "Many CDL training programs accept GI Bill benefits. We can connect you with approved schools in your area.",
  },
  {
    name: "Workforce Innovation (WIOA)",
    description:
      "State programs that may cover CDL training costs for veterans transitioning to civilian careers.",
  },
  {
    name: "Helmets to Hardhats",
    description:
      "Programs that help veterans transition into transportation and construction careers.",
  },
  {
    name: "Military skills test waiver",
    description:
      "Many states offer CDL skills test waivers for veterans with qualifying military vehicle experience.",
  },
]

/** The four published terms, read from PAY_RATES. Static mono text — a rate
 *  and a state count are identifiers, not a scoreboard to animate. */
const TERMS = [
  { value: OO.commission, label: "Commission", sublabel: "Owner operators" },
  { value: CD.otr.perMile, label: "Per mile", sublabel: "Company drivers" },
  { value: SUPPORT.hours, label: "Support", sublabel: "Real people" },
  { value: String(STATS.statesCovered), label: "States", sublabel: "Nationwide coverage" },
] as const

/** A bullet is a figure plus its words, so only the figure takes the mono
 *  tabular face. `value: ""` marks a bullet that is prose all the way. */
const POSITIONS = [
  {
    icon: Shield,
    title: "Company driver",
    href: "/apply?type=company",
    cta: "Apply as a company driver",
    points: [
      { value: CD.otr.perMile, label: "/mile" },
      { value: CD_SIGN_ON, label: " sign-on bonus" },
      { value: "", label: "Weekly direct deposit" },
      { value: "", label: "Flexible home time" },
    ],
  },
  {
    icon: Truck,
    title: "Owner operator",
    href: "/apply?type=owner",
    cta: "Apply as an owner operator",
    points: [
      { value: OO.commission, label: " commission" },
      { value: OO.signOnBonus, label: " sign-on bonus" },
      { value: "", label: "No forced dispatch" },
      { value: OO.fuelSurcharge, label: " fuel surcharge" },
    ],
  },
] as const

export default function VeteransPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Veterans"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Veterans program"
        title="Thank you for your service."
        description="Your military service taught you discipline, logistics, and leadership. Those skills make you an exceptional driver. We're proud to hire veterans."
      >
        {/* The terms, from the same file the calculators read. */}
        <dl className="grid grid-cols-2 gap-4 rounded-m-3 border border-white/10 bg-white/5 p-6">
          {TERMS.map((term) => (
            <div key={term.label}>
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {term.label}
              </dt>
              <dd className="mt-1 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {term.value}
              </dd>
              <dd className="text-m-body text-paper/70">{term.sublabel}</dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <section aria-labelledby="why-veterans-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="why-veterans-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Military skills are trucking skills
            </h2>
          </Reveal>

          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2">
            {veteranBenefits.map((benefit, i) => (
              <Reveal as="li" key={benefit.title} index={Math.min(i, 4)}>
                {/* Was a light Card with `!text-white` forced onto it — white
                    on white, unreadable. Dark card grammar instead. */}
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <benefit.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-200">
                    {benefit.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Dense data on paper: the two-column translation table is the one thing
          on this page a veteran reads line by line. */}
      <section aria-labelledby="translation-heading" className="bg-navy-950 pb-section">
        <div className="container">
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2
              id="translation-heading"
              className="font-display text-m-h2 font-bold text-ink text-balance"
            >
              Your military experience translates
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-ink-2">
              The skills you developed in service are exactly what trucking demands.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink/20">
                    <th
                      scope="col"
                      className="pb-3 pr-4 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"
                    >
                      Military skill
                    </th>
                    <th
                      scope="col"
                      className="pb-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"
                    >
                      Trucking application
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {militarySkillsTranslation.map((skill) => (
                    <tr key={skill.military} className="border-b border-ink/15">
                      <td className="py-3 pr-4 align-top text-m-body font-semibold text-ink">
                        <span className="flex items-start gap-2">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                          <span>{skill.military}</span>
                        </span>
                      </td>
                      <td className="py-3 align-top text-m-body text-ink-2">{skill.trucking}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="cdl-programs-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2
              id="cdl-programs-heading"
              className="font-display text-m-h2 font-bold text-paper text-balance"
            >
              Need your CDL? We can help
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-paper/80">
              Several programs can help veterans get their CDL at reduced or no cost.
            </p>

            <ul className="mt-8 grid list-none gap-4 md:grid-cols-2">
              {cdlPrograms.map((program, i) => (
                <Reveal as="li" key={program.name} index={Math.min(i, 4)}>
                  <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <h3 className="font-display text-m-h4 font-bold text-paper">{program.name}</h3>
                    <p className="mt-2 max-w-measure text-m-body text-paper/80">
                      {program.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <p className="mt-8 max-w-measure text-m-body text-paper/80">
              <span>
                Not sure which program is right for you? Call us and we&apos;ll help you navigate the
                options —{" "}
              </span>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="font-semibold text-paper underline-offset-4 hover:text-signal-up hover:underline"
              >
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
              <span>.</span>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="positions-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2
                id="positions-heading"
                className="font-display text-m-h2 font-bold text-white text-balance"
              >
                Start your trucking career
              </h2>
            </Reveal>

            <ul className="mt-8 grid list-none gap-4 md:grid-cols-2">
              {POSITIONS.map((position, i) => (
                <Reveal as="li" key={position.title} index={Math.min(i, 4)}>
                  <div className="flex h-full flex-col rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <h3 className="flex items-center gap-2 font-display text-m-h4 font-bold text-white">
                      <position.icon className="h-5 w-5 shrink-0 text-orange-300" aria-hidden />
                      <span>{position.title}</span>
                    </h3>
                    <ul className="mt-4 flex-1 list-none space-y-2">
                      {position.points.map((point) => (
                        <li
                          key={point.label}
                          className="flex items-start gap-2 text-m-body text-steel-200"
                        >
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-orange-300" aria-hidden />
                          <span>
                            {point.value ? (
                              <span className="font-mono tabular-nums">{point.value}</span>
                            ) : null}
                            <span>{point.label}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5">
                      <Link
                        href={position.href}
                        className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
                      >
                        <span>{position.cta}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Useful next"
        intro="Tools and pages a driver comparing carriers actually needs."
        links={driverLinks(["/veterans"])}
      />

      {/* The page's ONE closing block. The hero already carries the red Apply;
          the flag-gradient bar and the second Apply/Call pair are gone. */}
      <section aria-labelledby="veterans-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="veterans-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Your service matters to us
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              {`Same terms as every other driver, out of the ${COMPANY_INFO.location} yard. Call and ask us anything first.`}
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
