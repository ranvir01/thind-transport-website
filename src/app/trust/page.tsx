import { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, ExternalLink, FileText, Phone, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, SERVICES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { getAuthoritySnapshot, TRUST_FACTS } from "@/lib/fmcsa-authority"

export const metadata: Metadata = {
  title: "Verify Us | USDOT 2523064 · MC 876103 — Authority, Insurance & Safety",
  description:
    "Thind Transport LLC credentials in one place: live FMCSA operating authority for USDOT 2523064 / MC 876103, insurance, equipment, and a direct link to our SAFER company snapshot. Verify before you book.",
  alternates: { canonical: "/trust" },
}

// Authority status is fetched server-side and cached for a day; the module
// falls back to a committed snapshot when FMCSA is unreachable.
export const revalidate = 86_400

const usd = (n: number) => `$${n.toLocaleString("en-US")}`

export default async function TrustPage() {
  const authority = await getAuthoritySnapshot()
  const active = authority.allowedToOperate === true

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Verify Us" category="Company" />

      <div className="bg-[#060607] text-white">
        <div className="container px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Credentials</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">Verify us before you book</h1>
            <p className="text-lg text-white/85 leading-relaxed">
              Every number on this page is checkable against a government source. We&apos;d rather you
              confirm it yourself than take our word for it — that&apos;s the whole point of publishing it.
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 py-10 md:py-14">
        {/* Live authority badge */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 max-w-3xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{authority.legalName}</h2>
              <p className="text-gray-600 text-sm">
                Kent, Washington · operating since {COMPANY_INFO.founded}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              <BadgeCheck className="h-4 w-4" aria-hidden />
              {active ? "Authority active" : "See SAFER for current status"}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">USDOT</dt>
              <dd className="text-lg font-bold text-gray-900">{authority.dotNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">MC (docket)</dt>
              <dd className="text-lg font-bold text-gray-900">{authority.mcNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Authority status
              </dt>
              <dd className="text-lg font-bold text-gray-900">
                {authority.authorityStatus ?? "See SAFER"}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm text-gray-600">
            {authority.source === "live" ? (
              <>Pulled live from the FMCSA QCMobile API, {authority.asOf}.</>
            ) : (
              <>
                Last verified {authority.asOf}. We show the date rather than implying it&apos;s live —
                the FMCSA API has outages, and a stale badge presented as current is worse than none.
              </>
            )}{" "}
            Check it yourself:
          </p>
          <a
            href={authority.saferUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:border-orange-500 hover:text-orange-700"
          >
            Open our SAFER company snapshot
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>

        {/* Insurance + operations */}
        <div className="mt-6 grid gap-6 md:grid-cols-2 max-w-3xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <ShieldCheck className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
            <h3 className="font-bold text-gray-900 mb-2">Insurance</h3>
            {TRUST_FACTS.autoLiabilityDollars || TRUST_FACTS.cargoDollars ? (
              <ul className="text-gray-600 text-sm space-y-1">
                {TRUST_FACTS.autoLiabilityDollars && (
                  <li>Auto liability: {usd(TRUST_FACTS.autoLiabilityDollars)}</li>
                )}
                {TRUST_FACTS.cargoDollars && <li>Cargo: {usd(TRUST_FACTS.cargoDollars)}</li>}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed">
                Certificate of insurance sent on request, direct from our agent — call{" "}
                <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-orange-600">
                  {COMPANY_INFO.phone}
                </a>{" "}
                and we&apos;ll have it to you the same day.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <Truck className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
            <h3 className="font-bold text-gray-900 mb-2">Equipment</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {STATS.trucksInFleet} power units running {SERVICES.types.join(", ").toLowerCase()} across{" "}
              {STATS.statesCovered} states, dispatched out of Kent, WA.
            </p>
          </div>
        </div>

        {/* Performance — only shown when real */}
        {(TRUST_FACTS.onTimePercent || TRUST_FACTS.claimsRatioPercent) && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 max-w-3xl">
            <h3 className="font-bold text-gray-900 mb-2">Performance</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              {TRUST_FACTS.onTimePercent && <li>On-time delivery: {TRUST_FACTS.onTimePercent}%</li>}
              {TRUST_FACTS.claimsRatioPercent != null && (
                <li>Claims ratio: {TRUST_FACTS.claimsRatioPercent}% of loads</li>
              )}
            </ul>
          </div>
        )}

        {/* Paperwork */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-6 max-w-3xl">
          <FileText className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
          <h3 className="font-bold text-gray-900 mb-2">The whole packet, in one link</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            W-9, certificate of insurance, and operating authority in a single PDF — no back-and-forth
            with our office before you can set us up as a carrier.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/carrier-packet"
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
            >
              Download carrier packet
            </a>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 hover:border-orange-500"
            >
              <Phone className="h-4 w-4" aria-hidden /> {COMPANY_INFO.phone}
            </a>
          </div>
        </div>

        {/* Navigation, not prose — so these get real 44px tap targets rather
            than relying on WCAG 2.5.8's inline-link exception. */}
        <nav aria-label="Next steps" className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 max-w-3xl">
          <span className="text-sm text-gray-600 py-3">Shipping with us?</span>
          <Link
            href="/shippers#quote"
            className="inline-flex items-center min-h-11 px-2 py-3 text-sm font-medium text-orange-600 hover:underline"
          >
            Get a quote
          </Link>
          <span className="text-sm text-gray-400" aria-hidden>
            ·
          </span>
          <Link
            href="/brokers"
            className="inline-flex items-center min-h-11 px-2 py-3 text-sm font-medium text-orange-600 hover:underline"
          >
            For brokers
          </Link>
        </nav>
      </div>
    </div>
  )
}
