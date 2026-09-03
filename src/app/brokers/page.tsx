import { Metadata } from "next"
import {
  BadgeCheck, Clock, FileCheck, Radar, ShieldCheck,
} from "lucide-react"
import { COMPANY_INFO, STATS, FMCSA_LINKS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { BrokerPacketForm } from "@/components/features/BrokerPacketForm"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { freightLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: `Carrier packet for brokers | Thind Transport — MC ${COMPANY_INFO.mc}`,
  description:
    `Thind Transport is an asset-based carrier in ${COMPANY_INFO.location} — ${STATS.trucksInFleet} late-model trucks, flatbed, reefer and dry van across ${STATS.statesCovered} states. USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Request our carrier packet and onboard us today.`,
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
 *
 * It renders on the navy shell behind <AsphaltHero> like every other subpage:
 * the packet request is the one filled red, once in the hero (as the anchor)
 * and once on the form's own submit a screen further down. The coverage
 * amount that used to sit in the hero credential row and in two body
 * paragraphs is gone — no COI in this repo backs it, and a dollar figure a
 * broker acts on and then holds against you is the worst kind to guess at.
 */

const HERO_FACTS = [
  { label: "USDOT", value: COMPANY_INFO.dot },
  { label: "MC (docket)", value: COMPANY_INFO.mc },
  { label: "Trucks", value: String(STATS.trucksInFleet) },
  { label: "States", value: String(STATS.statesCovered) },
] as const

const ONBOARDING = [
  {
    icon: FileCheck,
    title: "Everything in one packet",
    body: "W-9, certificate of insurance, signed carrier agreement and our operating authority — one email, no back-and-forth chasing documents.",
  },
  {
    icon: ShieldCheck,
    title: "Verify us before you call",
    body: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Active authority and clean inspections — check it on FMCSA SAFER yourself rather than take our word.`,
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
    <div className="brand-page-shell overflow-x-hidden">
      <PersonaRemember persona="brokers" />

      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="For brokers"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Brokers"
        title="Onboard us today. Cover your load tomorrow."
        description={`${STATS.trucksInFleet} late-model trucks running flatbed, reefer and dry van across all ${STATS.statesCovered} states, out of ${COMPANY_INFO.location}. We own the equipment and employ the drivers — when we say it's covered, it's covered.`}
        applyHref="#packet"
        applyLabel="Get the carrier packet"
        extraLinks={[{ href: FMCSA_LINKS.safer, label: "Verify on FMCSA SAFER" }]}
      >
        <dl className="grid grid-cols-2 gap-3">
          {HERO_FACTS.map((fact) => (
            <div key={fact.label} className="rounded-m-3 border border-white/10 bg-white/5 p-4">
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd className="mt-2 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <section aria-labelledby="onboarding-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="onboarding-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              What you get when you use us
            </h2>
          </Reveal>

          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2">
            {ONBOARDING.map((item, i) => (
              <Reveal as="li" key={item.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <item.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{item.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The page's ONE conversion block: the instrument this page exists for. */}
      <section
        id="packet"
        aria-labelledby="packet-heading"
        className="brand-section-panel scroll-mt-24 py-section"
      >
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <h2
                id="packet-heading"
                className="font-display text-m-h2 font-bold text-balance text-white"
              >
                Get the carrier packet
              </h2>
              <p className="mt-3 text-m-body text-steel-300">
                {/* Instant half: the one-page verifiable snapshot. The signed
                    half (W-9, per-broker COI, agreement) stays human-sent via
                    the form — a generic COI on a public URL invites fraud. */}
                <span>Need the one-page snapshot right now? </span>
                <a
                  href="/api/carrier-packet"
                  className="inline-flex items-center gap-2 font-semibold text-white underline-offset-4 hover:underline"
                >
                  <FileCheck className="h-4 w-4" aria-hidden />
                  Carrier snapshot PDF
                </a>
                <span> — instant, no form.</span>
              </p>
            </Reveal>

            <div className="mt-8">
              <BrokerPacketForm />
            </div>

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-m-body text-steel-300">
              <BadgeCheck className="h-4 w-4 shrink-0 text-orange-300" aria-hidden />
              <span>Or call the desk that books the load:</span>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        title="Everything else, without asking"
        intro="The documents and tools brokers normally have to email us for."
        links={freightLinks(["/brokers"], 7)}
        tone="dark"
      />
    </div>
  )
}
