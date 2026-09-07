import { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Home, Route, CalendarDays, Truck } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { RecruitingCtas } from "@/components/shared/RecruitingCtas"
import { JOB_SLUGS, jobListingPath, type JobSlug } from "@/lib/job-posting"
import { recruitingShareTags, taggedApplyPath } from "@/lib/recruiting-posts"

const JOBS_TITLE = `Open CDL Jobs | ${COMPANY_INFO.name}`
const JOBS_DESCRIPTION = `Local, regional, and OTR company-driver seats at ${PAY_RATES.companyDriver.local.perMile}/mile, plus owner-operators keeping ${PAY_RATES.ownerOperator.commission} of gross. Kent, WA. Call ${COMPANY_INFO.phone} or apply online.`

export const metadata: Metadata = recruitingShareTags({
  title: JOBS_TITLE,
  description: JOBS_DESCRIPTION,
  path: "/jobs",
})

const CARDS: {
  slug: JobSlug
  icon: typeof Home
  title: string
  home: string
  pay: string
}[] = [
  {
    slug: "local",
    icon: Home,
    title: "Local company driver",
    home: `Home ${PAY_RATES.companyDriver.local.homeTime.toLowerCase()}`,
    pay: `${PAY_RATES.companyDriver.local.perMile}/mi · ${PAY_RATES.companyDriver.local.annual}/year`,
  },
  {
    slug: "regional",
    icon: CalendarDays,
    title: "Regional company driver",
    home: `Home ${PAY_RATES.companyDriver.regional.homeTime.toLowerCase()}`,
    pay: `${PAY_RATES.companyDriver.regional.perMile}/mi · ${PAY_RATES.companyDriver.regional.annual}/year`,
  },
  {
    slug: "otr",
    icon: Route,
    title: "OTR company driver",
    home: `${PAY_RATES.companyDriver.otr.homeTime} out`,
    pay: `${PAY_RATES.companyDriver.otr.perMile}/mi · ${PAY_RATES.companyDriver.otr.annual}/year`,
  },
  {
    slug: "owner-operator",
    icon: Truck,
    title: "Owner operator",
    home: "You pick the loads",
    pay: `${PAY_RATES.ownerOperator.commission} of gross · typical ${PAY_RATES.ownerOperator.annualGross}/year`,
  },
]

export default function JobsIndexPage() {
  return (
    <div className="brand-page-shell min-h-screen bg-[#060607] text-white">
      <PageBreadcrumb pageName="Open jobs" category="Drivers" />
      <section className="container px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
          Now hiring · {COMPANY_INFO.location}
        </p>
        <h1 className="mt-3 font-display text-4xl font-black md:text-5xl">
          Four seats. Same family. Apply or call.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Company drivers {PAY_RATES.companyDriver.local.perMile}/mile — local, regional,
          or OTR. Owner-operators keep {PAY_RATES.ownerOperator.commission} of
          gross. Pick the home time.
        </p>
        <RecruitingCtas applyHref={taggedApplyPath("jobs_index")} />

        <ul className="mt-10 grid list-none gap-4 md:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <li key={card.slug}>
                <Link
                  href={jobListingPath(card.slug)}
                  className="flex h-full min-h-[44px] flex-col rounded-2xl border border-white/10 bg-[#0B0C0E] p-6 hover:border-orange-500/40"
                >
                  <Icon className="h-6 w-6 text-orange-400" aria-hidden />
                  <span className="mt-4 font-display text-2xl font-bold">{card.title}</span>
                  <span className="mt-1 text-sm uppercase tracking-wider text-slate-400">
                    {card.home}
                  </span>
                  <span className="mt-3 text-lg font-semibold text-orange-300">{card.pay}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white">
                    Open posting
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-8 text-sm text-slate-500">
          {JOB_SLUGS.length} live postings. Know a driver?{" "}
          <Link href="/refer" className="font-semibold text-orange-400 underline-offset-4 hover:underline">
            Send them this job
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
