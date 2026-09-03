import { Metadata } from "next"
import { CalendarCheck, Truck, Wallet, Radio, ShieldCheck, Smartphone } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { ProfitCalculator } from "@/components/features/ProfitCalculator"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: "Drive for Thind Transport | CDL-A & owner-operators",
  description:
    `Owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross with ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge pass-through; company drivers earn ${PAY_RATES.companyDriver.otr.perMile}/mile with weekly pay. ${EQUIPMENT.modelYears} Cascadias and VNLs, ${STATS.statesCovered} states, dispatch that picks up. Run your own numbers on the calculator, then start an application.`,
  alternates: { canonical: "/drivers" },
}

/**
 * The driver door — the crawlable page behind the homepage's "I drive" card.
 *
 * One rule from the redesign brief governs the copy: ONE pay representation,
 * and it's the calculator's. The hero never promises a dollar figure the
 * calculator can't reproduce; it states the split and the per-mile rate (both
 * facts of the pay plan) and hands the projection to the instrument itself.
 *
 * The page used to sit on `bg-paper` with its own hand-rolled asphalt band on
 * top — a light page hanging off the dark homepage, with a hero that
 * duplicated <AsphaltHero> class for class. It renders on the navy shell now,
 * behind the shared hero, so the door and the house match: dark ground, the
 * calculator as the one paper-grade instrument, proof as dark hairline rows.
 *
 * There is no closing apply band, for the same reason /pay-rates has none:
 * <ProfitCalculator> ships its own red "Start your application" and the phone
 * number beside it. A closing band here printed the identical pair a third
 * time (hero, calculator, footer band) on one page, and the rule is one
 * apply/call block. The calculator's block is it; RelatedLinks closes.
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
    title: "Late-model equipment",
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
    body: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc} — active authority since ${COMPANY_INFO.founded}, family-run from ${COMPANY_INFO.location}. Look us up on FMCSA SAFER before you ever fill in a form.`,
  },
  {
    icon: Smartphone,
    title: "An app that works in dead zones",
    body: "Dispatch, PODs from the camera, and your pay on one screen — and it keeps working when the bars run out. Installs from the browser, no app store.",
  },
] as const

/** The pay-plan facts, as the hero's right pane. */
const HERO_FACTS = [
  { label: "Owner-op split", value: PAY_RATES.ownerOperator.commission, note: "of gross" },
  { label: "Fuel surcharge", value: PAY_RATES.ownerOperator.fuelSurcharge, note: "passed through" },
  { label: "Company driver", value: PAY_RATES.companyDriver.otr.perMile, note: "per mile, every lane" },
] as const

export default function DriversPage() {
  return (
    <div className="brand-page-shell overflow-x-hidden">
      <PersonaRemember persona="drivers" />

      <AsphaltHero
        breadcrumb={
          /* Inside the band, so the bar's own ground, blur, nav-clearance
             padding, centred row and second container gutter come off. */
          <PageBreadcrumb
            pageName="Drivers"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow={"For drivers & owner-operators"}
        title={`Keep ${PAY_RATES.ownerOperator.commission} of gross. Check our math before you call.`}
        description="No teaser numbers: the calculator below runs on current market rates and real costs, and every pay figure on this site comes from it. Set your miles, your equipment, your fuel price — then decide."
        primary="apply"
        extraLinks={[{ href: "#calculator", label: "Run your own numbers" }]}
      >
        {/* The tile eyebrows are `orange-300`, not `signal-up`. DIRECTION §1
            verifies signal-up at 4.84:1 on BARE asphalt; the `bg-white/5` fill
            lifts the composited ground and drops that same pair to 4.21:1 —
            under AA, and an m-micro bold label is nowhere near large text, so
            the 3:1 allowance does not apply. `orange-300` is the brief's token
            for small red on the dark ground: 5.92:1 on the filled tile, and
            already what AsphaltHero's eyebrow above and the proof icons below
            use. */}
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
          <div className="rounded-m-3 border border-white/10 bg-white/5 p-4">
            <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
              Fleet
            </dt>
            <dd className="mt-2 text-m-body font-semibold text-paper">{EQUIPMENT.short}</dd>
            <dd className="mt-1 text-m-micro text-paper/70">{EQUIPMENT.apu}</dd>
          </div>
        </dl>
      </AsphaltHero>

      {/* The signature instrument, front and centre — not buried mid-page. It
          carries its own <h2>, so there is no second heading above it here. */}
      <div id="calculator" className="scroll-mt-24">
        <ProfitCalculator />
      </div>

      <section aria-labelledby="proof-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="proof-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              What you actually get
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2">
            {PROOF.map((p, i) => (
              <Reveal as="li" key={p.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <p.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{p.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <RelatedLinks
        title="Useful before you apply"
        intro="Tools, records and pages that answer the questions the pitch doesn't."
        links={driverLinks(["/drivers"], 9)}
        tone="dark"
      />
    </div>
  )
}
