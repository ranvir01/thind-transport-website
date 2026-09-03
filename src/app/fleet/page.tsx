import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, STATS, SUPPORT } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { freightLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"
import { FleetSpecSwitch } from "@/components/fleet/FleetSpecSwitch"
import { FleetSupport } from "@/components/fleet/FleetSupport"
import { FleetYardBand } from "@/components/fleet/FleetYardBand"
import { TractorSpecs } from "@/components/fleet/TractorSpecs"
import { TrailerSpecs } from "@/components/fleet/TrailerSpecs"
import { FLEET_FAQS, TRACTORS, TRAILERS } from "@/components/fleet/fleet-data"

/**
 * /fleet — the spec sheet, not the brochure.
 *
 * This was 919 lines of `"use client"`: a 85vh gradient-and-grid hero with a
 * priority photo behind it, nine generated images, eight calls to action (two
 * in the hero, one on each of four truck cards, one mid-page "Call", two in a
 * closing orange band), a tab switch, an expand-on-click spec drawer, and the
 * model years / makes / support hours typed by hand beside the constants that
 * publish them.
 *
 * It is a server page now. The only real state on it — which spec panel is
 * showing — lives in `FleetSpecSwitch`, the one client island; every panel it
 * shows is server-rendered and passed in, so the specs are HTML. The dense
 * data sits in a single paper island (the grammar `AudienceSelector` and
 * `HomeTimeLanes` set), the ground stays the dark shell, and there is exactly
 * one filled red per viewport: apply in the hero, apply at the end.
 *
 * `layout.tsx` keeps its metadata and its Vehicle JSON-LD, but both now read
 * the model years, engines, power and sleepers out of `EQUIPMENT` and
 * `fleet-data.ts` — the same source this page prints from — so the structured
 * data cannot describe a truck, a model year or an inverter the spec sheet
 * does not.
 */

const HERO_FACTS = [
  { label: "Trucks in fleet", value: String(STATS.trucksInFleet), note: "power units" },
  { label: "Model years", value: EQUIPMENT.modelYears, note: "no older equipment" },
  { label: "Dispatch & roadside", value: SUPPORT.hours, note: SUPPORT.phrase },
  { label: "States covered", value: String(STATS.statesCovered), note: "lower 48" },
] as const

export default function FleetPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          /* The trail lives inside the asphalt band; its own bar chrome
             (opaque ground, blur, nav-clearance padding, centred row, second
             gutter) is overridden here rather than stacked above the hero. */
          <PageBreadcrumb
            pageName="Our Fleet"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Fleet and equipment"
        title="Late-model trucks, listed spec by spec."
        description={`${STATS.trucksInFleet} tractors — ${EQUIPMENT.makes}, every one a ${EQUIPMENT.modelYears} model year. ${EQUIPMENT.apu}, plus an inverter, a fridge and the full safety suite. Read the spec sheet before you call.`}
        extraLinks={[{ href: "#equipment", label: "Jump to the spec sheet" }]}
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
              <dd className="mt-1 text-m-micro text-paper/70">{fact.note}</dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      {/* The page's one paper island: dense published specs, on paper, the way
          a spec sheet reads. The photo band below it is the dark that keeps
          this island from touching another. */}
      <section
        id="equipment"
        aria-labelledby="fleet-equipment-heading"
        className="scroll-mt-24 bg-navy-950 py-section"
      >
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="fleet-equipment-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              What you would actually be driving
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Every build we run and every trailer we pull, with what comes standard on all of them.
            </p>
          </Reveal>

          <Reveal
            className="mx-auto mt-8 max-w-5xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8"
            index={1}
          >
            <FleetSpecSwitch
              tabs={[
                {
                  id: "power-units",
                  label: "Power units",
                  /* Builds, not units owned: the hero already publishes the one
                     fleet count there is (STATS.trucksInFleet), and a bare "4"
                     here would read as a second, smaller one. */
                  count: TRACTORS.length,
                  countUnit: "builds",
                  panel: <TractorSpecs />,
                },
                {
                  id: "trailers",
                  label: "Trailers",
                  count: TRAILERS.length,
                  countUnit: "types",
                  panel: <TrailerSpecs />,
                },
              ]}
            />
          </Reveal>
        </div>
      </section>

      <FleetYardBand />

      <FleetSupport />

      <section aria-labelledby="fleet-faq-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="fleet-faq-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              Fleet and equipment questions
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 max-w-4xl">
            <FAQAccordion items={FLEET_FAQS} />
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Book the equipment"
        intro="Specs are one thing — here's how you actually put freight on it."
        links={freightLinks(["/fleet"])}
      />

      {/* The page's ONE closing apply block. */}
      <section aria-labelledby="fleet-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="fleet-apply-heading"
              className="font-display text-m-h3 font-bold text-balance text-white"
            >
              Ready to drive one of these?
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              {`The application takes a few minutes, or call the ${COMPANY_INFO.location} office and ask about the equipment first.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/apply"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                Start your application
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
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
