import { Metadata } from "next"
import Link from "next/link"
import { MapPin, Phone } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { STATES } from "@/lib/state-data"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: "CDL Truck Driving Jobs in All 48 States | Thind Transport",
  description:
    "Thind Transport hires CDL-A drivers and owner operators nationwide — 90% owner-operator split, weekly pay, no forced dispatch. Find driving jobs in your state.",
  alternates: { canonical: "/cdl-jobs" },
}

const REGIONS = ["West", "Southwest", "Midwest", "South", "Northeast"] as const

export default function CdlJobsIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="CDL Jobs by State" category="Drivers" />

      <div className="relative overflow-hidden bg-gradient-to-br from-[#17181B] via-[#1F2024] to-[#0B0C0E] py-16 md:py-20 text-white">
        <div className="container px-4 text-center">
          <span className="fleet-badge fleet-badge-gold mb-4">Coast to coast</span>
          <h1 className="mx-auto max-w-3xl text-4xl md:text-5xl font-black leading-tight mb-4">
            CDL driving jobs in <span className="text-orange">all 48 states</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/85">
            Same honest deal everywhere: owner operators keep {PAY_RATES.ownerOperator.commission},
            company drivers earn {PAY_RATES.companyDriver.otr.perMile}/mile, everyone gets paid weekly.
            Pick your state.
          </p>
        </div>
      </div>

      <div className="container px-4 py-14">
        {REGIONS.map((region) => (
          <div key={region} className="mb-10">
            <h2 className="mb-4 text-xl font-black uppercase tracking-wide text-gray-900">
              <MapPin className="mr-2 inline h-5 w-5 text-orange-600" />
              {region}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {STATES.filter((s) => s.region === region).map((state) => (
                <Link
                  key={state.slug}
                  href={`/cdl-jobs/${state.slug}`}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center font-semibold text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700 hover:shadow-md"
                >
                  {state.name}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-12 rounded-3xl bg-gradient-to-br from-[#17181B] to-[#0B0C0E] p-8 text-center text-white">
          <h2 className="text-2xl font-black mb-2">Not sure which lane fits?</h2>
          <p className="mx-auto mb-6 max-w-xl text-white/80">
            Call the people who actually build the schedules. Five minutes on the phone beats an hour
            of reading.
          </p>
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-colors hover:bg-orange-500"
          >
            <Phone className="h-4 w-4" /> {COMPANY_INFO.phone}
          </a>
        </div>
      </div>

      <RelatedLinks
        title="Before you call"
        intro="The calculators and records behind everything on this page."
        links={driverLinks(["/cdl-jobs"])}
      />
    </div>
  )
}
