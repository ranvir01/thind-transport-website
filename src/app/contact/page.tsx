import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  FileCheck,
  Mail,
  MapPin,
  Phone,
  Route,
  Smartphone,
  Truck,
  Users,
} from "lucide-react"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"

/** Things you can get right now without waiting for us to pick up. */
const SELF_SERVE = [
  {
    href: "/api/carrier-packet",
    title: "Carrier snapshot PDF",
    blurb: "Authority, insurance and equipment on one page. Downloads instantly.",
    icon: FileCheck,
    kind: "Tool" as const,
  },
  {
    href: "/quote",
    title: "Quote a lane",
    blurb: "Miles and transit time on the spot, then send the lane to dispatch.",
    icon: Route,
    kind: "Tool" as const,
  },
  {
    href: "/tools/freight-class-calculator",
    title: "Freight class calculator",
    blurb: "Dimensions and weight in, NMFC class out — before you call about LTL.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/pay-rates",
    title: "Driver pay calculator",
    blurb: "Your miles and your rate — what a week here actually clears.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay in one place. Installs from the browser.",
    icon: Smartphone,
    kind: "Tool" as const,
  },
  {
    href: "/trust",
    title: "Verify our authority",
    blurb: `USDOT ${COMPANY_INFO.dot} and MC ${COMPANY_INFO.mc} against the FMCSA record.`,
    icon: BadgeCheck,
    kind: "Verify" as const,
  },
]

export const metadata: Metadata = {
  title: `Contact ${COMPANY_INFO.name} | ${COMPANY_INFO.location} — ${COMPANY_INFO.phone}`,
  description:
    `Reach ${COMPANY_INFO.name} in Kent, Washington. Call ${COMPANY_INFO.phone} for dispatch, freight quotes, or driver recruiting. USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Family-owned and operating since ${COMPANY_INFO.founded}.`,
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

/** Label register inside the paper island: an 11–12px condensed caps eyebrow. */
const TERM = "font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"

export default function ContactPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Contact"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Kent, Washington"
        title="One number. A person answers it."
        description={`We're a ${STATS.trucksInFleet}-truck family carrier, not a call centre. Whoever picks up can talk to you about the load, the driver, or the paperwork — usually without transferring you.`}
        primary="call"
      />

      {/* NAP — the block that has to be identical everywhere for local search.
          Dense, checkable data, so it reads as a printed record: the page's one
          paper island. The "what are you calling about" band below it is dark,
          so no two paper surfaces touch. */}
      <section aria-labelledby="nap-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2 id="nap-heading" className="font-display text-m-h2 font-bold text-ink text-balance">
              {`${COMPANY_INFO.name} LLC`}
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-ink-2">
              One name, one address, one number — the same everywhere. Nothing here is a routing
              menu.
            </p>

            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                <div className="min-w-0">
                  <dt className={TERM}>Phone</dt>
                  <dd>
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="inline-flex min-h-[44px] items-center text-m-lede font-semibold text-signal underline-offset-4 hover:underline"
                    >
                      <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                <div className="min-w-0">
                  <dt className={TERM}>Email</dt>
                  <dd>
                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="inline-flex min-h-[44px] items-center break-all text-m-body font-semibold text-ink underline-offset-4 hover:text-signal hover:underline"
                    >
                      {COMPANY_INFO.email}
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                <div className="min-w-0">
                  <dt className={TERM}>Mail</dt>
                  <dd className="mt-1 text-m-body font-semibold text-ink">{COMPANY_INFO.address}</dd>
                  <dd className="mt-1 text-m-body text-ink-2">
                    {`Dispatched out of ${COMPANY_INFO.location} — running all ${STATS.statesCovered} states.`}
                  </dd>
                </div>
              </div>

              <div className="flex gap-3">
                <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                <div className="min-w-0">
                  <dt className={TERM}>Authority</dt>
                  <dd className="mt-1 text-m-body font-semibold text-ink">
                    <span>USDOT </span>
                    <span className="font-mono tabular-nums">{COMPANY_INFO.dot}</span>
                    <span> · MC </span>
                    <span className="font-mono tabular-nums">{COMPANY_INFO.mc}</span>
                  </dd>
                  <dd>
                    <Link
                      href="/trust"
                      className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-signal underline-offset-4 hover:underline"
                    >
                      Verify us
                    </Link>
                  </dd>
                </div>
              </div>
            </dl>

            <p className="mt-8 border-t border-ink/15 pt-4 text-m-body text-ink-2">
              <span>{`Family-owned since ${COMPANY_INFO.founded} by ${COMPANY_INFO.owner}. `}</span>
              <Link
                href="/about"
                className="font-semibold text-signal underline-offset-4 hover:underline"
              >
                Read our story
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="reach-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <Reveal>
            <h2
              id="reach-heading"
              className="font-display text-m-h2 font-bold text-paper text-balance"
            >
              What are you calling about?
            </h2>
            <p className="mt-3 max-w-measure text-m-body text-paper/80">
              Same number either way — this just saves you explaining twice.
            </p>
          </Reveal>

          <ul className="mt-8 grid list-none gap-4 md:grid-cols-3">
            {REACH.map(({ icon: Icon, who, what, href, cta }, i) => (
              <Reveal as="li" key={who} index={Math.min(i, 3)}>
                <div className="flex h-full flex-col rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <Icon className="h-5 w-5 text-signal-up" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-paper">{who}</h3>
                  <p className="mt-2 flex-1 text-m-body text-paper/80">{what}</p>
                  <p className="mt-4">
                    <Link
                      href={href}
                      className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-paper underline-offset-4 hover:text-orange-300 hover:underline"
                    >
                      <span>{cta}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </Link>
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <RelatedLinks
        title="Or do it yourself, right now"
        intro="Six things you can get off this site without waiting for the phone to be free."
        links={SELF_SERVE}
      />
    </div>
  )
}
