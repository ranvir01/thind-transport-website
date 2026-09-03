import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CalendarDays, CheckCircle2, Lightbulb, MapPin, Truck } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, SERVICES, STATS } from "@/lib/constants"
import { buildJobPostingSchema } from "@/lib/job-posting"
import { STATES, neighborStates, stateBySlug } from "@/lib/state-data"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator
const CD = PAY_RATES.companyDriver

export function generateStaticParams() {
  return STATES.map((state) => ({ state: state.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: slug } = await params
  const state = stateBySlug(slug)
  if (!state) return {}
  return {
    title: `CDL truck driving jobs in ${state.name}`,
    description: `Thind Transport hires CDL-A drivers and owner operators who live in ${state.name} — ${state.cities.slice(0, 3).join(", ")} and statewide. ${OO.commission} owner-operator split, ${CD.otr.perMile}/mi company pay, weekly settlements, no forced dispatch.`,
    alternates: { canonical: `/cdl-jobs/${state.slug}` },
  }
}

export default async function StateJobsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params
  const state = stateBySlug(slug)
  if (!state) notFound()
  const neighbors = neighborStates(state)

  const jobPostingSchema = buildJobPostingSchema(state)

  // Same rule as the /routes hero: the mono tabular face is for the figure,
  // not for the words beside it.
  const payStrip = [
    { label: "Owner-op split", value: OO.commission, note: "", mono: true },
    { label: "Company / mile", value: CD.otr.perMile, note: "", mono: true },
    { label: "Fuel surcharge", value: OO.fuelSurcharge, note: " to you", mono: true },
    { label: "Pay cadence", value: "Weekly", note: "", mono: false },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }} />

      <AsphaltHero
        breadcrumb={
          /* These 48 pages live under /cdl-jobs but weren't declaring it, so
             both the visible trail and the BreadcrumbList skipped a level. */
          <PageBreadcrumb
            pageName={`${state.name} CDL Jobs`}
            category="Drivers"
            parentPage={{ name: "CDL Jobs", href: "/cdl-jobs" }}
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow={`Now hiring · ${state.name}`}
        title={`CDL truck driving jobs in ${state.name}`}
        description={`We hire CDL-A drivers and owner operators who live in ${state.name} — ${state.cities.slice(0, 3).join(", ")} and anywhere else in the state. ${STATS.statesCovered}-state freight, run by a ${STATS.yearsInBusiness}-year family carrier that pays honestly and answers the phone.`}
        applyLabel={`Start your ${state.name} application`}
      >
        <dl className="grid grid-cols-2 gap-4 rounded-m-3 border border-white/10 bg-white/5 p-6">
          {payStrip.map((item) => (
            <div key={item.label}>
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {item.label}
              </dt>
              <dd className="mt-1 text-m-h4 font-bold text-paper">
                {item.mono ? (
                  <span className="font-mono tabular-nums">{item.value}</span>
                ) : (
                  <span className="font-display">{item.value}</span>
                )}
                {item.note ? <span className="font-display">{item.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <div className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
            <section aria-labelledby="where-heading">
              <h2
                id="where-heading"
                className="flex items-start gap-2 font-display text-m-h2 font-bold text-white text-balance"
              >
                <MapPin className="mt-1 h-6 w-6 shrink-0 text-orange-300" aria-hidden />
                <span>{`Where you'll run in ${state.name}`}</span>
              </h2>
              <p className="mt-4 max-w-measure text-m-body text-steel-200">
                {`${state.name} freight moves on ${state.corridors.join(" and ")}, and our flatbed, reefer and dry van loads run all ${STATS.statesCovered} states out of our ${COMPANY_INFO.location} home yard — so what you run depends on the week and on what you take. Regional drivers get home weekly; OTR runs ${CD.otr.homeTime} with real route planning, not forced dispatch.`}
              </p>
              <ul className="mt-6 list-none space-y-3">
                {[
                  `${SERVICES.types.join(", ")} — you pick what you're set up for`,
                  "Touch level stated on the load before you accept it",
                  "Fuel card with fleet discounts at major stops",
                  "Dispatch that answers — a direct line, not a call center",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-m-body text-steel-200">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-300" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Dense data on paper: what we ask, and the two ways to answer. */}
            <section
              aria-labelledby="requirements-heading"
              className="rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8"
            >
              <h2
                id="requirements-heading"
                className="flex items-start gap-2 font-display text-m-h2 font-bold text-ink text-balance"
              >
                <Truck className="mt-1 h-6 w-6 shrink-0 text-signal" aria-hidden />
                <span>What we ask</span>
              </h2>
              <ul className="mt-6 list-none space-y-3 text-m-body text-ink-2">
                <li>Valid CDL-A, 2+ years verifiable experience preferred</li>
                <li>Clean-enough MVR — we look at the whole picture, not one ding</li>
                <li>Owner operators: truck in roadworthy shape, we handle the rest</li>
                <li>{`Live anywhere in ${state.name} or along our lanes — the freight comes to you`}</li>
              </ul>
              <p className="mt-6">
                <Link
                  href="/apply"
                  className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-signal underline-offset-4 hover:underline"
                >
                  <span>{`Start your ${state.name} application`}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </p>
              <p className="mt-3 text-m-body text-ink-2">
                <span>Name, CDL, experience, the lanes you want. Or text us: </span>
                <a
                  href={`sms:${COMPANY_INFO.phoneFormatted}?body=${encodeURIComponent(`Hi, I'm a CDL driver in ${state.name} interested in driving for Thind Transport.`)}`}
                  className="font-semibold text-ink underline-offset-4 hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Deep freight-market notes — added one state at a time by the SEO deepening pass */}
      {state.deepDive ? (
        <section aria-labelledby="market-heading" className="bg-asphalt py-section text-paper">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2
                id="market-heading"
                className="font-display text-m-h2 font-bold text-paper text-balance"
              >
                {`Know before you haul: the ${state.name} freight market`}
              </h2>
              <p className="mt-3 max-w-measure text-m-body text-paper/80">
                {`Notes from running these lanes ourselves — the markets, the seasons, and the details that change what a week in ${state.name} actually pays.`}
              </p>

              <ul className="mt-8 grid list-none gap-4 md:grid-cols-2">
                {state.deepDive.markets.map((market, i) => (
                  <Reveal as="li" key={market.name} index={Math.min(i, 4)}>
                    <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                      <h3 className="flex items-start gap-2 font-display text-m-h4 font-bold text-paper">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-signal-up" aria-hidden />
                        <span>{market.name}</span>
                      </h3>
                      <p className="mt-2 max-w-measure text-m-body text-paper/80">{market.note}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <h3 className="flex items-start gap-2 font-display text-m-h4 font-bold text-paper">
                    <CalendarDays className="mt-1 h-4 w-4 shrink-0 text-signal-up" aria-hidden />
                    <span>Season by season</span>
                  </h3>
                  <ul className="mt-3 list-none space-y-3">
                    {state.deepDive.seasonal.map((note) => (
                      <li key={note} className="flex items-start gap-2 text-m-body text-paper/80">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-paper/50" aria-hidden />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-m-3 border border-signal/40 bg-signal/10 p-5">
                  <h3 className="flex items-start gap-2 font-display text-m-h4 font-bold text-paper">
                    <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-signal-up" aria-hidden />
                    <span>Worth knowing</span>
                  </h3>
                  <ul className="mt-3 list-none space-y-3">
                    {state.deepDive.driverFacts.map((fact) => (
                      <li key={fact} className="flex items-start gap-2 text-m-body text-paper/80">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-signal-up" aria-hidden />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {neighbors.length > 0 ? (
        <section aria-labelledby="nearby-heading" className="bg-navy-950 py-section">
          <div className="container">
            <div className="mx-auto max-w-5xl">
              <h2
                id="nearby-heading"
                className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300"
              >
                Also hiring nearby
              </h2>
              <ul className="mt-4 flex list-none flex-wrap gap-2">
                {neighbors.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/cdl-jobs/${n.slug}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-m-body font-semibold text-steel-200 transition-colors duration-base ease-entrance hover:border-white/30 hover:text-white"
                    >
                      {n.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/cdl-jobs"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-4 py-2 text-m-body font-semibold text-orange-300 transition-colors duration-base ease-entrance hover:border-signal hover:text-orange-300"
                  >
                    <span>{`All ${STATS.statesCovered} states`}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* The page's ONE closing block. */}
      <section aria-labelledby="state-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="state-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              {`Driving out of ${state.name}?`}
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              {`Tell us your experience and the lanes you want, or call the ${COMPANY_INFO.location} office and ask first.`}
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
