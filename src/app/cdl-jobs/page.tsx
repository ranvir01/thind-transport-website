import { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, STATS } from "@/lib/constants"
import { STATES } from "@/lib/state-data"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator
const CD = PAY_RATES.companyDriver

export const metadata: Metadata = {
  title: `CDL truck driving jobs in all ${STATS.statesCovered} states`,
  description: `Thind Transport hires CDL-A drivers and owner operators nationwide — ${OO.commission} owner-operator split, weekly pay, no forced dispatch. Find driving jobs in your state.`,
  alternates: { canonical: "/cdl-jobs" },
}

const REGIONS = ["West", "Southwest", "Midwest", "South", "Northeast"] as const

export default function CdlJobsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="CDL Jobs by State"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Coast to coast"
        title={`CDL driving jobs in all ${STATS.statesCovered} states`}
        description={
          <>
            <span>{`Same honest deal everywhere: owner operators keep `}</span>
            <span className="font-mono tabular-nums">{OO.commission}</span>
            <span>, company drivers earn </span>
            <span className="font-mono tabular-nums">{CD.otr.perMile}</span>
            <span>/mile, everyone gets paid weekly. Pick your state.</span>
          </>
        }
      />

      {REGIONS.map((region, regionIndex) => (
        <section
          key={region}
          aria-labelledby={`${region.toLowerCase()}-heading`}
          className={regionIndex === 0 ? "bg-navy-950 py-section" : "bg-navy-950 pb-section"}
        >
          <div className="container">
            <h2
              id={`${region.toLowerCase()}-heading`}
              className="font-display text-m-h3 font-bold text-white"
            >
              {region}
            </h2>
            <ul className="mt-4 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {STATES.filter((s) => s.region === region).map((state) => (
                <li key={state.slug}>
                  <Link
                    href={`/cdl-jobs/${state.slug}`}
                    className="flex min-h-[44px] items-center justify-center rounded-fleet border border-white/10 bg-white/5 px-4 py-3 text-center text-m-body font-semibold text-steel-200 transition-colors duration-base ease-entrance hover:border-white/30 hover:text-white"
                  >
                    {state.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <RelatedLinks
        tone="dark"
        title="Before you call"
        intro="The calculators and records behind everything on this page."
        links={driverLinks(["/cdl-jobs"])}
      />

      {/* The page's ONE closing block. */}
      <section aria-labelledby="cdl-jobs-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="cdl-jobs-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Not sure which lane fits?
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              Call the people who actually build the schedules. Five minutes on the phone beats an
              hour of reading.
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
          </Reveal>
        </div>
      </section>
    </div>
  )
}
