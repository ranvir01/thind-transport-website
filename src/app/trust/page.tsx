import { Metadata } from "next"
import { BadgeCheck, ExternalLink, FileText, Handshake, ShieldCheck, Truck } from "lucide-react"
import { COMPANY_INFO, SERVICES, STATS, FMCSA_LINKS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { getAuthoritySnapshot, TRUST_FACTS } from "@/lib/fmcsa-authority"
import { Reveal } from "@/components/ui/Reveal"
import { RelatedLinks } from "@/components/shared/RelatedLinks"

/** The one download this page exists to hand over. */
const PACKET_HREF = "/api/carrier-packet"

/** Where to click and what a clean record looks like when you get there. */
const VERIFY_STEPS = [
  {
    title: "Look up the DOT number",
    body: `Search USDOT ${COMPANY_INFO.dot} on FMCSA SAFER. You want an operating status of AUTHORIZED and an out-of-service date that is blank.`,
    href: FMCSA_LINKS.safer,
    cta: "Open SAFER",
  },
  {
    title: "Check the authority and insurance",
    body: `Look up MC ${COMPANY_INFO.mc} on the FMCSA licensing and insurance record. It lists the authority type and its status, and every insurance filing carriers on file for us — read it there rather than take a number off this page.`,
    href: FMCSA_LINKS.portal,
    cta: "FMCSA portal",
  },
  {
    title: "Read the safety record",
    body: "The SAFER snapshot lists inspections, out-of-service rates and any crashes for the last 24 months. Compare ours to the national averages printed on the same page.",
    href: FMCSA_LINKS.safer,
    cta: "Safety snapshot",
  },
] as const

const TRUST_LINKS = [
  {
    href: PACKET_HREF,
    title: "Carrier snapshot PDF",
    blurb: "Authority, insurance and equipment on one page — instant download, no form.",
    icon: FileText,
    kind: "Tool" as const,
  },
  {
    href: FMCSA_LINKS.safer,
    title: "FMCSA SAFER snapshot",
    blurb: "The government record itself. Don't take our transcription of it.",
    icon: ExternalLink,
    kind: "Verify" as const,
    external: true,
  },
  {
    href: "/fleet",
    title: "The equipment list",
    blurb: "Every tractor and trailer we run, with specs — the assets behind the authority.",
    icon: Truck,
    kind: "Page" as const,
  },
  {
    href: "/quote",
    title: "Quote a lane",
    blurb: "Miles, transit time and a direct line to the dispatch desk that books it.",
    icon: BadgeCheck,
    kind: "Form" as const,
  },
  {
    href: "/brokers",
    title: "For brokers",
    blurb: "The full signed packet — W-9, COI and carrier agreement — sent to your inbox.",
    icon: Handshake,
    kind: "Form" as const,
  },
]

export const metadata: Metadata = {
  title: `Verify Us | USDOT ${COMPANY_INFO.dot} · MC ${COMPANY_INFO.mc} — Authority, Insurance & Safety`,
  description:
    `Thind Transport LLC credentials in one place: live FMCSA operating authority for USDOT ${COMPANY_INFO.dot} / MC ${COMPANY_INFO.mc}, insurance, equipment, and a direct link to our SAFER company snapshot. Verify before you book.`,
  alternates: { canonical: "/trust" },
}

// Authority status is fetched server-side and cached for a day; the module
// falls back to a committed snapshot when FMCSA is unreachable.
export const revalidate = 86_400

const usd = (n: number) => `$${n.toLocaleString("en-US")}`

/**
 * The credentials page.
 *
 * Every figure here is an identifier or a government record, so the whole page
 * is set as mono tabular rows on the dark ground — no counting animations, no
 * card grid dressing a docket number up as a stat. The one red is the carrier
 * packet, in the hero and once more at the foot; the phone sits beside it as
 * text both times.
 *
 * No coverage amount is printed anywhere. The dollar figure that used to sit
 * here was not backed by a COI in this repo, and TRUST_FACTS is the only place
 * a real one may enter — it renders the numbers when they are filled in and
 * says "on request" when they are not.
 */
export default async function TrustPage() {
  const authority = await getAuthoritySnapshot()
  const active = authority.allowedToOperate === true

  const rows = [
    { label: "USDOT", value: authority.dotNumber },
    { label: "MC (docket)", value: authority.mcNumber },
    { label: "Authority status", value: authority.authorityStatus ?? "See SAFER" },
    { label: "Operating since", value: String(COMPANY_INFO.founded) },
  ] as const

  return (
    <div className="brand-page-shell overflow-x-hidden">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Verify Us"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Credentials"
        title="Verify us before you book"
        description="Every number on this page is checkable against a government source. We'd rather you confirm it yourself than take our word for it — that's the whole point of publishing it."
        applyHref={PACKET_HREF}
        applyLabel="Download carrier packet"
      />

      <section aria-labelledby="authority-heading" className="py-section">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2
                    id="authority-heading"
                    className="font-display text-m-h2 font-bold text-balance text-white"
                  >
                    {authority.legalName}
                  </h2>
                  <p className="mt-2 text-m-body text-steel-300">
                    {`${COMPANY_INFO.location} · operating since ${COMPANY_INFO.founded}`}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-m-micro font-bold uppercase tracking-[0.12em] ${
                    active
                      ? "bg-cedar/20 text-white"
                      : "bg-white/10 text-steel-200"
                  }`}
                >
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                  {active ? "Authority active" : "See SAFER for current status"}
                </span>
              </div>

              {/* Identifiers, as rows. A docket number is a reference, not a
                  quantity — mono tabular, never a counting stat tile. */}
              <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-6 py-4">
                    <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300">
                      {row.label}
                    </dt>
                    <dd className="font-mono text-m-h4 font-bold tabular-nums text-white">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 max-w-measure text-m-body text-steel-300">
                {authority.source === "live" ? (
                  <>Pulled live from the FMCSA QCMobile API, {authority.asOf}.</>
                ) : (
                  <>
                    Last verified {authority.asOf}. We show the date rather than implying it&apos;s
                    live — the FMCSA API has outages, and a stale badge presented as current is
                    worse than none.
                  </>
                )}
              </p>
              <a
                href={authority.saferUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:underline"
              >
                Open our SAFER company snapshot
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Reveal>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <ShieldCheck className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">Insurance</h3>
                  {TRUST_FACTS.autoLiabilityDollars || TRUST_FACTS.cargoDollars ? (
                    <dl className="mt-2 divide-y divide-white/10 border-y border-white/10">
                      {TRUST_FACTS.autoLiabilityDollars ? (
                        <div className="flex items-baseline justify-between gap-6 py-3">
                          <dt className="text-m-body text-steel-300">Auto liability</dt>
                          <dd className="font-mono text-m-body font-bold tabular-nums text-white">
                            {usd(TRUST_FACTS.autoLiabilityDollars)}
                          </dd>
                        </div>
                      ) : null}
                      {TRUST_FACTS.cargoDollars ? (
                        <div className="flex items-baseline justify-between gap-6 py-3">
                          <dt className="text-m-body text-steel-300">Cargo</dt>
                          <dd className="font-mono text-m-body font-bold tabular-nums text-white">
                            {usd(TRUST_FACTS.cargoDollars)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="mt-2 max-w-measure text-m-body text-steel-300">
                      <span>
                        Certificate of insurance sent on request, direct from our agent — call{" "}
                      </span>
                      <a
                        href={`tel:${COMPANY_INFO.phoneFormatted}`}
                        className="font-semibold text-white underline-offset-4 hover:underline"
                      >
                        <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                      </a>
                      <span> and we&apos;ll have it to you the same day.</span>
                    </p>
                  )}
                </div>
              </Reveal>

              <Reveal index={1}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <Truck className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">Equipment</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">
                    {`${STATS.trucksInFleet} power units running ${SERVICES.types.join(", ").toLowerCase()} across ${STATS.statesCovered} states, dispatched out of ${COMPANY_INFO.location}.`}
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Performance — only shown when real */}
            {TRUST_FACTS.onTimePercent || TRUST_FACTS.claimsRatioPercent != null ? (
              <Reveal className="mt-4">
                <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <h3 className="font-display text-m-h4 font-bold text-white">Performance</h3>
                  <dl className="mt-2 divide-y divide-white/10 border-y border-white/10">
                    {TRUST_FACTS.onTimePercent ? (
                      <div className="flex items-baseline justify-between gap-6 py-3">
                        <dt className="text-m-body text-steel-300">On-time delivery</dt>
                        <dd className="font-mono text-m-body font-bold tabular-nums text-white">
                          {TRUST_FACTS.onTimePercent}%
                        </dd>
                      </div>
                    ) : null}
                    {TRUST_FACTS.claimsRatioPercent != null ? (
                      <div className="flex items-baseline justify-between gap-6 py-3">
                        <dt className="text-m-body text-steel-300">Claims ratio, of loads</dt>
                        <dd className="font-mono text-m-body font-bold tabular-nums text-white">
                          {TRUST_FACTS.claimsRatioPercent}%
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      {/* The page claims "verify us", so it says where to click and what a good
          answer looks like when you get there. */}
      <section aria-labelledby="verify-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="verify-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Verify us in three steps
            </h2>
          </Reveal>
          <ol className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
            {VERIFY_STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-signal/20 font-mono text-m-body font-bold tabular-nums text-orange-300">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{step.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{step.body}</p>
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:underline"
                  >
                    {step.cta}
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <RelatedLinks
        title="Everything else you can check"
        intro="Documents and records, not assurances."
        links={TRUST_LINKS}
        columns={2}
        tone="dark"
      />

      {/* The page's ONE closing block: the packet, and the phone beside it. */}
      <section aria-labelledby="packet-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="packet-heading"
              className="font-display text-m-h3 font-bold text-balance text-white"
            >
              The whole packet, in one link
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              W-9, certificate of insurance, and operating authority in a single PDF — no
              back-and-forth with our office before you can set us up as a carrier.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href={PACKET_HREF}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                Download carrier packet
              </a>
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
