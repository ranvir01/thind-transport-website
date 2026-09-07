import { Metadata } from "next"
import Link from "next/link"
import { CalendarCheck, Truck, Wallet, Radio, ShieldCheck, Smartphone } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES, STATS, WORKPLACE } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { PayTable } from "@/components/features/PayTable"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { HomeTimeLanes } from "@/components/home/HomeTimeLanes"

export const metadata: Metadata = {
  title: "Drive for Thind Transport | CDL-A & owner-operators",
  description:
    `Owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross with ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge pass-through; company drivers earn ${PAY_RATES.companyDriver.local.perMile}/mile with weekly pay. ${EQUIPMENT.short}, ${STATS.statesCovered} states, dispatch that picks up. The whole pay plan is one table, then apply in about a minute.`,
  alternates: { canonical: "/drivers" },
}

/**
 * The driver door — the crawlable page behind the homepage's "I drive" card.
 *
 * One rule from the redesign brief governs the copy: ONE pay representation,
 * and it's the PayTable's (the interactive calculators were removed 2026-08-28
 * — see docs/design/home-rework-2026-08.md, constraint 12). The hero never
 * promises a dollar figure the table doesn't hold; it states the split and the
 * per-mile rate (both facts of the pay plan) and points at the table itself.
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
    title: EQUIPMENT.short,
    body: `A ${STATS.trucksInFleet}-truck fleet of ${EQUIPMENT.modelYears} ${EQUIPMENT.makes} — flatbed, reefer and dry van across ${STATS.statesCovered} states. New enough that breakdowns are the exception, small enough that your truck is yours.`,
  },
  {
    icon: Radio,
    title: "Dispatch that picks up",
    body: `You call, a person answers — the same person who booked the load. ${WORKPLACE.languages} No load boards to babysit, no telephone game between you and the freight.`,
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

      <AsphaltHero
        eyebrow="For drivers & owner-operators"
        title={`Keep ${PAY_RATES.ownerOperator.commission} of gross. Check our math before you call.`}
        description="No teaser numbers: the whole pay plan is one table below, and it's the same one every page on this site quotes. Read it, check us on SAFER — then decide."
        extraLinks={[{ href: "/refer", label: "Know a driver? Send this" }]}
      >
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
            <dd className="mt-1 font-display text-m-h3 font-bold">{EQUIPMENT.short}</dd>
          </div>
        </dl>
      </AsphaltHero>

      <HomeTimeLanes />

      {/* The one pay representation, front and centre. */}
      <section id="pay" className="scroll-mt-20 py-16 md:py-24">
        <div className="container px-4">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 className="font-display text-m-h2 font-bold text-ink">The pay plan, in one table</h2>
            <p className="mt-3 text-m-body text-ink-2">
              Facts, not projections — the same numbers you&apos;ll hear on the phone.
            </p>
          </Reveal>
          <div className="mt-10">
            <PayTable />
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

      <RelatedLinks
        title="Useful before you apply"
        intro="Tools, records and pages that answer the questions the pitch doesn't."
        links={driverLinks(["/drivers"])}
      />
    </div>
  )
}
