import { Metadata } from "next"
import Link from "next/link"
import {
  BadgeCheck, Clock, FileCheck, Phone, Radar,
  ShieldCheck,
} from "lucide-react"
import { COMPANY_INFO, STATS, FMCSA_LINKS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { BrokerPacketForm } from "@/components/features/BrokerPacketForm"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { freightLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: "Carrier packet for brokers | Thind Transport — MC 876103",
  description:
    "Thind Transport is an asset-based carrier in Kent, WA — 15 late-model trucks, flatbed, reefer and dry van across 48 states. USDOT 2523064, MC 876103, $1M liability. Request our carrier packet and onboard us today.",
  alternates: { canonical: "/brokers" },
}

/**
 * The broker door. Previously missing entirely — a broker landing on this site
 * had nowhere to go, which is a revenue hole given that brokers are the ones
 * handing out the loads.
 *
 * A broker asks two questions and only two: can I onboard you fast, and will
 * you actually cover the load. So the page leads with the paperwork and the
 * verification, not with a sales pitch.
 */

const ONBOARDING = [
  {
    icon: FileCheck,
    title: "Everything in one packet",
    body: "W-9, certificate of insurance, signed carrier agreement and our operating authority — one email, no back-and-forth chasing documents.",
  },
  {
    icon: ShieldCheck,
    title: "Verify us before you call",
    body: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Active authority, $1M liability, clean inspections — check it on FMCSA SAFER yourself rather than take our word.`,
  },
  {
    icon: Radar,
    title: "Tracking without check calls",
    body: "Every load gets a live tracking link from our own TMS. Real GPS position, status and the POD the moment it's signed — so you can answer your customer before they ask.",
  },
  {
    icon: Clock,
    title: "Dispatch picks up",
    body: "You reach the people who talk to the drivers. One call, a straight answer on whether we can cover it, and no telephone game.",
  },
] as const

export default function BrokersPage() {
  return (
    <div className="bg-paper">
      <PersonaRemember persona="brokers" />
      <PageBreadcrumb pageName="For brokers" category="Company" />

      {/* Archetype B — asymmetric split: the pitch, and the paperwork beside it */}
      <section className="bg-asphalt py-16 text-paper md:py-24">
        <div className="container px-4">
          <div className="grid items-start gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <Reveal>
              <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-signal-up">
                Asset-based carrier · Kent, WA
              </p>
              <h1 className="mt-4 font-display text-m-h1 font-bold">
                Onboard us today. Cover your load tomorrow.
              </h1>
              <p className="mt-5 max-w-measure text-m-lede text-[rgba(246,247,247,0.8)]">
                {STATS.trucksInFleet} late-model trucks running flatbed, reefer and dry van across
                all {STATS.statesCovered} states, out of Kent, Washington. We own the equipment and
                employ the drivers — when we say it&apos;s covered, it&apos;s covered.
              </p>

              <dl className="mt-8 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-[rgba(246,247,247,0.15)] pt-6 sm:grid-cols-4">
                {[
                  { k: "USDOT", v: COMPANY_INFO.dot },
                  { k: "MC", v: COMPANY_INFO.mc },
                  { k: "Liability", v: "$1M" },
                  { k: "States", v: String(STATS.statesCovered) },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-[rgba(246,247,247,0.5)]">
                      {s.k}
                    </dt>
                    <dd className="mt-1 font-mono text-m-h4 font-bold tabular-nums text-paper">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-m-2 border border-[rgba(246,247,247,0.3)] px-6 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-[rgba(246,247,247,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-up focus-visible:ring-offset-2 focus-visible:ring-offset-asphalt"
                >
                  <Phone className="h-4 w-4" /> {COMPANY_INFO.phone}
                </a>
                <a
                  href={FMCSA_LINKS.safer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-m-2 px-6 py-3 font-display text-m-body font-semibold text-[rgba(246,247,247,0.7)] underline-offset-4 transition-colors duration-base ease-entrance hover:text-paper hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-up focus-visible:ring-offset-2 focus-visible:ring-offset-asphalt"
                >
                  <BadgeCheck className="h-4 w-4" /> Verify on FMCSA SAFER
                </a>
              </div>
            </Reveal>

            {/* The instrument: the form is the point of this page */}
            <Reveal
              index={1}
              className="rounded-m-4 border border-[rgba(20,22,24,0.1)] bg-paper p-6 shadow-m-e4 md:p-8"
            >
              <h2 className="font-display text-m-h4 font-bold text-ink">Get the carrier packet</h2>
              <p className="mt-1.5 text-m-body text-ink-2">
                Sent within the hour during business hours.
              </p>
              {/* Instant half: the one-page verifiable snapshot. The signed
                  half (W-9, per-broker COI, agreement) stays human-sent via
                  the form — a generic COI on a public URL invites fraud. */}
              <a
                href="/api/carrier-packet"
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-m-2 border border-ink/20 px-5 py-2.5 font-display text-m-body font-bold uppercase tracking-wide text-ink transition-colors duration-base ease-entrance hover:border-signal hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <FileCheck className="h-4 w-4" aria-hidden /> Carrier snapshot PDF — instant
              </a>
              <p className="mt-4 text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
                Full signed packet — W-9, COI, agreement
              </p>
              <div className="mt-3">
                <BrokerPacketForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Archetype C-ish — the four answers, as a list not a card grid */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 className="font-display text-m-h2 font-bold text-ink">
              What you get when you use us
            </h2>
          </Reveal>

          <ul className="mx-auto mt-10 grid max-w-4xl list-none gap-x-10 gap-y-8 md:grid-cols-2">
            {ONBOARDING.map((item, i) => (
              <Reveal as="li" key={item.title} index={Math.min(i, 3)}>
                <item.icon className="h-5 w-5 text-signal" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-ink">{item.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-ink-2">{item.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <RelatedLinks
        title="Everything else, without asking"
        intro="The documents and tools brokers normally have to email us for."
        links={freightLinks(["/brokers"], 7)}
      />
    </div>
  )
}
