import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CheckCircle2, MapPin, Phone, Truck } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, STATS } from "@/lib/constants"
import { STATES, neighborStates, stateBySlug } from "@/lib/state-data"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export function generateStaticParams() {
  return STATES.map((state) => ({ state: state.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: slug } = await params
  const state = stateBySlug(slug)
  if (!state) return {}
  return {
    title: `CDL Truck Driving Jobs in ${state.name} | Owner Operators Keep 90%`,
    description: `Thind Transport hires CDL-A drivers and owner operators running through ${state.name} — ${state.cities.slice(0, 3).join(", ")} and the ${state.corridors.join(", ")} corridors. 90% owner-operator split, ${PAY_RATES.companyDriver.otr.perMile}/mi company pay, weekly settlements, no forced dispatch.`,
    alternates: { canonical: `/cdl-jobs/${state.slug}` },
  }
}

export default async function StateJobsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params
  const state = stateBySlug(slug)
  if (!state) notFound()
  const neighbors = neighborStates(state)

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `CDL-A Truck Driver / Owner Operator — ${state.name}`,
    description: `Thind Transport is hiring experienced CDL-A company drivers and owner operators for OTR and regional freight running through ${state.name}. Owner operators keep 90% of gross with 100% fuel surcharge pass-through. Company drivers earn ${PAY_RATES.companyDriver.otr.perMile}/mile with weekly pay. Flatbed, reefer, and dry van.`,
    hiringOrganization: {
      "@type": "Organization",
      name: COMPANY_INFO.name,
      sameAs: "https://thindtransport.com",
    },
    industry: "Truck Transportation",
    employmentType: ["FULL_TIME", "CONTRACTOR"],
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressRegion: state.abbr, addressCountry: "US" },
    },
    applicantLocationRequirements: { "@type": "State", name: state.name },
    datePosted: new Date().toISOString().slice(0, 10),
    directApply: true,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }} />
      <PageBreadcrumb pageName={`${state.name} CDL Jobs`} category="Drivers" />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#17181B] via-[#1F2024] to-[#0B0C0E] py-16 md:py-24 text-white">
        <div className="container px-4">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-4">Now hiring · {state.name}</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              CDL truck driving jobs in <span className="text-orange">{state.name}</span>
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              We run {state.corridors.join(", ")} every week — through {state.cities.slice(0, 3).join(", ")}.
              Drive them for a {STATS.yearsInBusiness}-year family carrier that pays honestly and answers the phone.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/apply"
                className="rounded-full bg-orange-600 px-6 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-colors hover:bg-orange-500"
              >
                Apply in 60 seconds
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-14">
        {/* Pay strip */}
        <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Owner-op split", value: PAY_RATES.ownerOperator.commission },
            { label: "Company / mile", value: PAY_RATES.companyDriver.otr.perMile },
            { label: "Fuel surcharge", value: `${PAY_RATES.ownerOperator.fuelSurcharge} to you` },
            { label: "Pay cadence", value: "Weekly" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-md">
              <p className="text-2xl font-black text-gray-900">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 mb-14">
          {/* Freight in this state */}
          <div>
            <h2 className="mb-4 text-2xl font-black text-gray-900">
              <MapPin className="mr-2 inline h-6 w-6 text-orange-600" />
              Where you&apos;ll run in {state.name}
            </h2>
            <p className="mb-4 leading-relaxed text-gray-600">
              {state.name} freight moves on {state.corridors.join(" and ")} — we cover{" "}
              {state.cities.join(", ")} with flatbed, reefer, and dry van loads, dispatched from our
              Kent, WA home yard. Regional drivers get home weekly; OTR runs 2–3 weeks with real
              route planning, not forced dispatch.
            </p>
            <ul className="space-y-2">
              {[
                `Consistent freight through ${state.cities[0]}${state.cities[1] ? ` and ${state.cities[1]}` : ""}`,
                "No-touch or driver-assist clearly stated before you accept",
                "Fuel card with fleet discounts at major stops",
                "Dispatch that answers — a direct line, not a call center",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements + CTA */}
          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-xl">
            <h2 className="mb-4 text-2xl font-black text-gray-900">
              <Truck className="mr-2 inline h-6 w-6 text-orange-600" />
              What we ask
            </h2>
            <ul className="mb-6 space-y-2 text-gray-700">
              <li>· Valid CDL-A, 2+ years verifiable experience preferred</li>
              <li>· Clean-enough MVR — we look at the whole picture, not one ding</li>
              <li>· Owner operators: truck in roadworthy shape, we handle the rest</li>
              <li>· Live anywhere in {state.name} or along our lanes — the freight comes to you</li>
            </ul>
            <Link
              href="/apply"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-600 hover:to-orange-700"
            >
              Start your {state.name} application <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm text-gray-500">
              60 seconds to raise your hand. Or text us:{" "}
              <a
                href={`sms:${COMPANY_INFO.phoneFormatted}?body=${encodeURIComponent(`Hi, I'm a CDL driver in ${state.name} interested in driving for Thind Transport.`)}`}
                className="font-semibold text-orange-600"
              >
                {COMPANY_INFO.phone}
              </a>
            </p>
          </div>
        </div>

        {/* Neighbor states */}
        {neighbors.length > 0 ? (
          <div className="border-t border-gray-200 pt-8">
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              Also hiring nearby
            </p>
            <div className="flex flex-wrap gap-2">
              {neighbors.map((n) => (
                <Link
                  key={n.slug}
                  href={`/cdl-jobs/${n.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                >
                  {n.name}
                </Link>
              ))}
              <Link
                href="/cdl-jobs"
                className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                All 48 states →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
