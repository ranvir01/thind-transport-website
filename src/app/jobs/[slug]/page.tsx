import { Metadata } from "next"
import { notFound } from "next/navigation"
import { BENEFITS, COMPANY_INFO, PAY_RATES, WORKPLACE } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { RecruitingCtas } from "@/components/shared/RecruitingCtas"
import {
  JOB_SLUGS,
  buildJobListingPosting,
  jobListingApplyHref,
  jobListingLead,
  jobListingPath,
  type JobSlug,
} from "@/lib/job-posting"
import { recruitingShareTags, taggedApplyPath } from "@/lib/recruiting-posts"

function isJobSlug(value: string): value is JobSlug {
  return (JOB_SLUGS as string[]).includes(value)
}

export function generateStaticParams() {
  return JOB_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (!isJobSlug(slug)) return {}
  const posting = buildJobListingPosting(slug)
  return recruitingShareTags({
    title: posting.title,
    description: jobListingLead(slug),
    path: jobListingPath(slug),
  })
}

export default async function JobListingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!isJobSlug(slug)) notFound()

  const posting = buildJobListingPosting(slug)
  const applyHref = taggedApplyPath("google_jobs", jobListingApplyHref(slug))
  const inbound = `Hi, I'm calling about the ${posting.title} posting.`
  const lead = jobListingLead(slug)

  return (
    <div className="brand-page-shell min-h-screen bg-[#060607] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(posting) }}
      />
      <PageBreadcrumb
        pageName={posting.title}
        category="Drivers"
        parentPage={{ name: "Open jobs", href: "/jobs" }}
      />

      <section className="container px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
          {COMPANY_INFO.location} · USDOT {COMPANY_INFO.dot}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-black md:text-5xl">
          {posting.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">{lead}</p>

        <RecruitingCtas applyHref={applyHref} messagePrefill={inbound} />

        <div className="mt-10 max-w-2xl rounded-2xl border border-white/10 bg-[#0B0C0E] p-6 text-sm text-slate-300">
          <h2 className="mb-3 text-lg font-bold text-white">Pay and benefits</h2>
          <p className="mb-4 text-xs text-slate-500">
            Posted under Washington&apos;s Equal Pay and Opportunities Act. Same numbers as /pay-rates.
          </p>
          {slug === "owner-operator" ? (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {PAY_RATES.ownerOperator.commission} of gross · typical{" "}
                {PAY_RATES.ownerOperator.annualGross}/year
              </li>
              <li>Fuel surcharge {PAY_RATES.ownerOperator.fuelSurcharge} pass-through</li>
              <li>Sign-on {PAY_RATES.ownerOperator.signOnBonus}</li>
            </ul>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {PAY_RATES.companyDriver[slug].perMile}/mile · {PAY_RATES.companyDriver[slug].annual}
                /year · home {PAY_RATES.companyDriver[slug].homeTime.toLowerCase()}
              </li>
              <li>Sign-on {PAY_RATES.companyDriver.signOnBonus}</li>
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-400">
            {(slug === "owner-operator" ? BENEFITS.ownerOperator : BENEFITS.companyDriver).join(" · ")}
          </p>
          <p className="mt-3 text-xs text-slate-400">{WORKPLACE.languages}</p>
          <p className="mt-2 text-xs text-slate-400">{WORKPLACE.elp}</p>
          <p className="mt-2 text-xs text-slate-500">{WORKPLACE.eeo}</p>
        </div>
      </section>
    </div>
  )
}
