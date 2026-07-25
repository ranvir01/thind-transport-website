import { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CalendarCheck, Truck, Wallet, Radio, ShieldCheck, Smartphone } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { ProfitCalculator } from "@/components/features/ProfitCalculator"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaRemember } from "@/components/shared/PersonaRemember"

export const metadata: Metadata = {
  title: "Drive for Thind Transport | CDL-A & owner-operators",
  description:
    "Owner-operators keep 90% of gross with 100% fuel surcharge pass-through; company drivers earn $0.63/mile with weekly pay. 2024 Cascadias, 48 states, dispatch that picks up. Run your own numbers on the calculator, then apply in about a minute.",
  alternates: { canonical: "/drivers" },
}

/**
 * The driver door — the crawlable page behind the homepage's "I drive" card.
 *
 * One rule from the redesign brief governs the copy: ONE pay representation,
 * and it's the calculator's. The hero never promises a dollar figure the
 * calculator can't reproduce; it states the split and the per-mile rate (both
 * facts of the pay plan) and hands the projection to the instrument itself.
 */

const PROOF = [
  {
    icon: Wallet,
    title: "The split, in writing",
    body: `Owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross with ${PAY_RATES.ownerOperator.fuelSurcharge} of the fuel surcharge passed through. Company drivers run at ${PAY_RATES.companyDriver.otr.perMile}/mile — same rate local, regional or OTR, so nobody's route is a pay cut.`,
  },
  {
    icon: CalendarCheck,
    title: "Home time you pick",
    body: `Local runs home daily, regional weekly, OTR ${PAY_RATES.companyDriver.otr.homeTime} out. Tell us the home time you need and we build the freight around it — not the other way round.`,
  },
  {
    icon: Truck,
    title: "2024 Cascadias",
    body: `A ${STATS.trucksInFleet}-truck fleet of late-model Freightliner Cascadias — flatbed, reefer and dry van across ${STATS.statesCovered} states. New enough that breakdowns are the exception, small enough that your truck is yours.`,
  },
  {
    icon: Radio,
    title: "Dispatch that picks up",
    body: "You call, a person answers — the same person who booked the load. No load boards to babysit, no telephone game between you and the freight.",
  },
  {
    icon: ShieldCheck,
    title: "Verify us first",
    body: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc} — active authority since ${COMPANY_INFO.founded}, family-run from Kent, WA. Look us up on FMCSA SAFER before you ever fill in a form.`,
  },
  {
    icon: Smartphone,
    title: "An app that works in dead zones",
    body: "Dispatch, PODs from the camera, and your pay on one screen — and it keeps working when the bars run out. Installs from the browser, no app store.",
  },
] as const

export default function DriversPage() {
  return (
    <div className="bg-paper">
      <PersonaRemember persona="drivers" />
      <PageBreadcrumb pageName="Drivers" category="Drivers" />

      <section className="bg-asphalt py-16 text-paper md:py-24">
        <div className="container px-4">
          <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <Reveal>
              <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-signal-up">
                For drivers &amp; owner-operators
              </p>
              <h1 className="mt-4 font-display text-m-h1 font-bold">
                Keep {PAY_RATES.ownerOperator.commission} of gross. Check our math before you call.
              </h1>
              <p className="mt-5 max-w-measure text-m-lede text-paper/80">
                No teaser numbers: the calculator below runs on current market rates and real
                costs, and every pay figure on this site comes from it. Set your miles, your
                equipment, your fuel price — then decide.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/apply"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-m-2 bg-signal px-7 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-asphalt"
                >
                  Apply — about a minute <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex min-h-[48px] items-center gap-2 font-display text-m-body font-bold uppercase tracking-wide text-paper/90 underline-offset-4 hover:text-signal-up hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-asphalt"
                >
                  or call {COMPANY_INFO.phone}
                </a>
              </div>
            </Reveal>

            <Reveal index={1}>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-m-4 border border-paper/15 p-6 md:p-8">
                <div>
                  <dt className="text-m-micro font-bold uppercase tracking-[0.15em] text-paper/60">Owner-op split</dt>
                  <dd className="mt-1 font-display text-m-h3 font-bold text-signal-up">{PAY_RATES.ownerOperator.commission}</dd>
                </div>
                <div>
                  <dt className="text-m-micro font-bold uppercase tracking-[0.15em] text-paper/60">Fuel surcharge</dt>
                  <dd className="mt-1 font-display text-m-h3 font-bold">{PAY_RATES.ownerOperator.fuelSurcharge} yours</dd>
                </div>
                <div>
                  <dt className="text-m-micro font-bold uppercase tracking-[0.15em] text-paper/60">Company driver</dt>
                  <dd className="mt-1 font-display text-m-h3 font-bold">{PAY_RATES.companyDriver.otr.perMile}/mi</dd>
                </div>
                <div>
                  <dt className="text-m-micro font-bold uppercase tracking-[0.15em] text-paper/60">Fleet</dt>
                  <dd className="mt-1 font-display text-m-h3 font-bold">2024 Cascadias</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The signature instrument, front and centre — not buried mid-homepage. */}
      <section id="calculator" className="py-16 md:py-24">
        <div className="container px-4">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 className="font-display text-m-h2 font-bold text-ink">Run your own numbers</h2>
            <p className="mt-3 text-m-body text-ink-2">
              Current market rates by equipment, fuel at today&apos;s price, real fixed costs.
              Change anything — it&apos;s your projection, not our promise.
            </p>
          </Reveal>
          <div className="mx-auto mt-10 max-w-5xl">
            <ProfitCalculator />
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 py-16 md:py-24">
        <div className="container px-4">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 className="font-display text-m-h2 font-bold text-ink">What you actually get</h2>
          </Reveal>
          <ul className="mx-auto mt-10 grid max-w-4xl list-none gap-x-10 gap-y-8 md:grid-cols-2">
            {PROOF.map((p, i) => (
              <Reveal as="li" key={p.title} index={Math.min(i, 4)}>
                <p.icon className="h-5 w-5 text-signal" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-ink">{p.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-ink-2">{p.body}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-m-body">
            <Link href="/pay-rates" className="font-semibold text-signal underline-offset-4 hover:underline">
              Full pay plan
            </Link>
            <Link href="/benefits" className="font-semibold text-signal underline-offset-4 hover:underline">
              Benefits
            </Link>
            <Link href="/veterans" className="font-semibold text-signal underline-offset-4 hover:underline">
              Veterans
            </Link>
            <Link href="/cdl-jobs" className="font-semibold text-signal underline-offset-4 hover:underline">
              Jobs by state
            </Link>
            <Link href="/app" className="font-semibold text-signal underline-offset-4 hover:underline">
              Get the driver app
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Escape hatch: nobody gets trapped in the driver lane. */}
      <section className="border-t border-ink/10 py-10">
        <div className="container px-4">
          <p className="text-center text-m-body text-ink-3">
            Not a driver?{" "}
            <Link href="/shippers" className="font-semibold text-signal underline-offset-4 hover:underline">
              For shippers
            </Link>{" "}
            ·{" "}
            <Link href="/brokers" className="font-semibold text-signal underline-offset-4 hover:underline">
              For brokers
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
