import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MapPin, Phone, Mail, Truck, Shield, Users } from "lucide-react"
import { COMPANY_INFO, SERVICES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { freightLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

export const metadata: Metadata = {
  title: `About ${COMPANY_INFO.name}`,
  description: `${COMPANY_INFO.name} has hauled flatbed, reefer and dry van freight out of ${COMPANY_INFO.location} since ${COMPANY_INFO.founded} — a ${STATS.trucksInFleet}-truck family carrier run by ${COMPANY_INFO.owner}, who has ${COMPANY_INFO.ownerExperience} years in the business.`,
  alternates: { canonical: "/about" },
}

/** Identifiers, not a scoreboard: a founding year and a truck count are static
 *  mono figures. They used to sit in white stat cards over the hero. */
const FACTS = [
  { value: String(COMPANY_INFO.founded), label: "Founded" },
  { value: COMPANY_INFO.ownerExperience, label: "Owner experience" },
  { value: String(STATS.trucksInFleet), label: "Trucks in fleet" },
  { value: String(STATS.statesCovered), label: "States covered" },
] as const

const milestones = [
  {
    year: String(COMPANY_INFO.founded),
    title: "Company founded",
    description: "Built around direct communication, straightforward settlements, and respectful driver support.",
  },
  {
    year: "2018",
    title: "Fleet growth",
    description: "Expanded equipment and lanes while keeping a smaller-team feel for dispatch and recruiting.",
  },
  {
    year: "2022",
    title: "Operations upgrades",
    description: "Improved equipment standards and day-to-day support processes for drivers on the road.",
  },
  {
    year: "Today",
    title: "Serving nationwide freight",
    description: "Continuing to support flatbed, reefer, and dry van work with a base in Kent, Washington.",
  },
]

const operatingPrinciples = [
  {
    title: "Keep communication direct",
    description: "Drivers should know who to call and what to expect when something changes on the road.",
    icon: Users,
  },
  {
    title: "Keep equipment ready",
    description: "Clean, road-ready trucks and trailers matter because downtime hurts everyone.",
    icon: Truck,
  },
  {
    title: "Keep the process straightforward",
    description: "Clear expectations, clear settlements, and clear next steps beat flashy marketing.",
    icon: Shield,
  },
]

const OPERATION_FACTS = [
  { icon: Truck, text: `${SERVICES.types.join(", ")} freight`, mono: false },
  { icon: MapPin, text: `Based in ${COMPANY_INFO.location} with nationwide coverage`, mono: false },
  // The authority numbers are identifiers, so they read in mono tabular figures.
  { icon: Shield, text: `USDOT #${COMPANY_INFO.dot}, MC-${COMPANY_INFO.mc} — active FMCSA authority`, mono: true },
  { icon: Users, text: "Direct dispatch — no giant call-center feel", mono: false },
] as const

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="About Us"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow={`About ${COMPANY_INFO.name}`}
        title="Family-run. Built to stay practical."
        description={`Since ${COMPANY_INFO.founded}, we've focused on direct communication, dependable equipment, and a smaller-team approach that keeps drivers from feeling like numbers.`}
      >
        <dl className="grid grid-cols-2 gap-4 rounded-m-3 border border-white/10 bg-white/5 p-6">
          {FACTS.map((fact) => (
            <div key={fact.label}>
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd className="mt-1 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <section aria-labelledby="story-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto grid max-w-5xl items-start gap-10 md:grid-cols-2 md:gap-12">
            <Reveal>
              <h2
                id="story-heading"
                className="font-display text-m-h2 font-bold text-white text-balance"
              >
                A smaller team with a clear approach
              </h2>
              <div className="mt-6 space-y-4 text-m-body text-steel-200">
                <p className="max-w-measure">
                  {`${COMPANY_INFO.name} was founded by ${COMPANY_INFO.owner}, bringing years of hands-on industry experience into a business built around practical support rather than polished promises.`}
                </p>
                <p className="max-w-measure">
                  The goal has stayed simple: answer the phone, keep expectations clear, and build a
                  work environment where drivers know what they are signing up for.
                </p>
                <p className="max-w-measure">
                  {`Today the company continues to focus on flatbed, reefer, and dry van work with a base in Kent, Washington and freight that reaches across the lower ${STATS.statesCovered} states.`}
                </p>
              </div>
            </Reveal>

            <Reveal index={1}>
              <div className="overflow-hidden rounded-m-3 border border-white/10">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/images/generated/driver-pretrip-walkaround.webp"
                    alt="Illustration of a driver completing a pre-trip walkaround inspection"
                    fill
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="img-authentic object-cover"
                  />
                </div>
              </div>
              <p className="mt-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300">
                {`The yard, ${COMPANY_INFO.location}`}
              </p>
              <p className="mt-1 text-m-body text-steel-200">
                Pre-trip done right — equipment checked before every run.
              </p>
            </Reveal>
          </div>

          <ul className="mx-auto mt-10 grid max-w-5xl list-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OPERATION_FACTS.map((item, i) => (
              <Reveal as="li" key={item.text} index={Math.min(i, 4)}>
                <div className="flex h-full items-start gap-3 rounded-m-3 border border-white/10 bg-white/5 p-4">
                  <item.icon className="mt-1 h-4 w-4 shrink-0 text-orange-300" aria-hidden />
                  <span
                    className={
                      item.mono
                        ? "font-mono text-m-body tabular-nums text-steel-200"
                        : "text-m-body text-steel-200"
                    }
                  >
                    {item.text}
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="timeline-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2
              id="timeline-heading"
              className="font-display text-m-h2 font-bold text-paper text-balance"
            >
              How we&apos;ve grown
            </h2>

            <dl className="mt-8 border-t border-white/10">
              {milestones.map((milestone, i) => (
                <Reveal
                  key={milestone.year}
                  index={Math.min(i, 4)}
                  className="grid gap-x-6 gap-y-1 border-b border-white/10 py-5 sm:grid-cols-[7rem_1fr] sm:items-baseline"
                >
                  <dt className="font-mono text-m-h4 font-bold tabular-nums text-signal-up">
                    {milestone.year}
                  </dt>
                  <dd>
                    <span className="block font-display text-m-h4 font-bold text-paper">
                      {milestone.title}
                    </span>
                    <span className="mt-1 block max-w-measure text-m-body text-paper/80">
                      {milestone.description}
                    </span>
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2
                id="principles-heading"
                className="font-display text-m-h2 font-bold text-white text-balance"
              >
                What matters day to day
              </h2>
            </Reveal>

            <ul className="mt-8 grid list-none gap-4 md:grid-cols-3">
              {operatingPrinciples.map((principle, i) => (
                <Reveal as="li" key={principle.title} index={Math.min(i, 4)}>
                  <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                    <principle.icon className="h-5 w-5 text-orange-300" aria-hidden />
                    <h3 className="mt-3 font-display text-m-h4 font-bold text-white">
                      {principle.title}
                    </h3>
                    <p className="mt-2 max-w-measure text-m-body text-steel-200">
                      {principle.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The one paper island: the address, the phone and the email are the
          dense reference data on this page. */}
      <section aria-labelledby="located-heading" className="bg-navy-950 pb-section">
        <div className="container">
          <Reveal className="mx-auto grid max-w-5xl gap-8 rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:grid-cols-2 md:p-8">
            <div>
              <h2
                id="located-heading"
                className="font-display text-m-h2 font-bold text-ink text-balance"
              >
                Based in the Pacific Northwest
              </h2>
              <p className="mt-4 max-w-measure text-m-body text-ink-2">
                {`Kent gives us a strong base for Pacific Northwest freight while supporting drivers and lanes that reach across the lower ${STATS.statesCovered} states.`}
              </p>
              <dl className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                  <div>
                    <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                      Address
                    </dt>
                    <dd className="text-m-body text-ink">{COMPANY_INFO.address}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                  <div>
                    <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                      Phone
                    </dt>
                    <dd>
                      <a
                        href={`tel:${COMPANY_INFO.phoneFormatted}`}
                        className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                  <div>
                    <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                      Email
                    </dt>
                    <dd>
                      <a
                        href={`mailto:${COMPANY_INFO.email}`}
                        className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        {COMPANY_INFO.email}
                      </a>
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            <div>
              <div className="overflow-hidden rounded-m-2 border border-ink/15">
                <div className="relative aspect-[3/2]">
                  <Image
                    src="/images/generated/fleet-lineup-kent.webp"
                    alt="Illustration of a row of Freightliner Cascadia and Volvo trucks lined up at the Kent, Washington yard"
                    fill
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="img-authentic object-cover"
                  />
                </div>
              </div>
              <p className="mt-3 text-m-body text-ink-2">The lineup in Kent, Washington.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="See it for yourself"
        intro="Records, equipment and tools rather than more company history."
        links={freightLinks(["/about"])}
      />

      {/* The page's ONE closing block. The navy photo band with its two pill
          buttons made the same offer the hero already makes. */}
      <section aria-labelledby="about-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="about-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Ready to talk with the team?
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              If the way we operate sounds like a better fit, reach out or start an application.
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
