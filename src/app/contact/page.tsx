import { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, Mail, MapPin, Phone, Truck, Users } from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: "Contact Thind Transport | Kent, WA — (206) 765-6300",
  description:
    "Reach Thind Transport in Kent, Washington. Call (206) 765-6300 for dispatch, freight quotes, or driver recruiting. USDOT 2523064, MC 876103. Family-owned and operating since 2014.",
  alternates: { canonical: "/contact" },
}

/**
 * Who to ask for, so a caller doesn't get bounced. Deliberately not a
 * directory of invented extensions — one number, and what to say when it
 * picks up.
 */
const REACH = [
  {
    icon: Truck,
    who: "Shipping freight",
    what: "Lane, equipment, weight, and pickup date — we'll come back with a number, not a runaround.",
    href: "/quote",
    cta: "Or request a quote online",
  },
  {
    icon: Users,
    who: "Driving for us",
    what: "Ask about pay, home time, and equipment. Or start the application and we'll call you.",
    href: "/apply",
    cta: "Start your application",
  },
  {
    icon: BadgeCheck,
    who: "Setting us up as a carrier",
    what: "W-9, certificate of insurance, and authority in one PDF — no back-and-forth needed.",
    href: "/trust",
    cta: "See our credentials",
  },
] as const

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Contact" category="Company" />

      <div className="bg-[#060607] text-white">
        <div className="container px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Kent, Washington</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              One number. A person answers it.
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              We&apos;re a {STATS.trucksInFleet}-truck family carrier, not a call centre. Whoever picks
              up can talk to you about the load, the driver, or the paperwork — usually without
              transferring you.
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 py-10 md:py-14">
        {/* NAP — the block that has to be identical everywhere for local search */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Thind Transport LLC</h2>
            <dl className="space-y-4">
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="inline-flex items-center min-h-11 text-lg font-bold text-orange-600 hover:underline"
                    >
                      {COMPANY_INFO.phone}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="inline-flex items-center min-h-11 font-semibold text-gray-900 hover:text-orange-600 break-all"
                    >
                      {COMPANY_INFO.email}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">Mail</dt>
                  <dd className="font-semibold text-gray-900">{COMPANY_INFO.address}</dd>
                  <dd className="text-sm text-gray-600 mt-0.5">
                    Dispatched out of {COMPANY_INFO.location} — running all {STATS.statesCovered} states.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <BadgeCheck className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Authority
                  </dt>
                  <dd className="font-semibold text-gray-900">
                    USDOT {COMPANY_INFO.dot} · MC {COMPANY_INFO.mc}
                  </dd>
                  <dd className="text-sm mt-0.5">
                    <Link href="/trust" className="inline-flex items-center min-h-11 text-orange-600 hover:underline font-medium">
                      Verify us
                    </Link>
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">What are you calling about?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Same number either way — this just saves you explaining twice.
            </p>
            <ul className="space-y-4">
              {REACH.map(({ icon: Icon, who, what, href, cta }) => (
                <li key={who} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-orange-600" aria-hidden />
                    <p className="font-bold text-gray-900">{who}</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2">{what}</p>
                  <Link href={href} className="inline-flex items-center min-h-11 text-sm font-semibold text-orange-600 hover:underline">
                    {cta} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-600 max-w-4xl">
          Family-owned since {COMPANY_INFO.founded} by {COMPANY_INFO.owner}.{" "}
          <Link href="/about" className="inline-flex items-center min-h-11 font-medium text-orange-600 hover:underline">
            Read our story
          </Link>
        </p>
      </div>
    </div>
  )
}
