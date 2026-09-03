import { Radio, ShieldCheck, Wrench } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, SUPPORT } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * What keeps the equipment running, straight out of `SUPPORT` + `EQUIPMENT`.
 *
 * Server component. The band it replaces published the same three promises
 * over a radial-gradient backdrop with a dot-pattern overlay, blurred card
 * backgrounds and a floating stat chip reading "PM" — plus a second red-ish
 * "Call" button that competed with the page's apply CTA. The promises are the
 * part worth keeping, so they are what is left.
 */

const PILLARS = [
  {
    icon: Wrench,
    title: "Preventive maintenance, on schedule",
    body: "Every truck goes to our regular shop on a fixed preventive-maintenance interval, not when something breaks — and DOT inspections are completed ahead of their due dates.",
  },
  {
    icon: ShieldCheck,
    title: SUPPORT.roadside,
    body: "Break down and you call dispatch at any hour. We arrange the roadside call and, if it can't be fixed on the shoulder, get you to a shop. We tell you what we cover before you sign anything.",
  },
  {
    icon: Radio,
    title: SUPPORT.dispatch,
    body: `A person answers in ${COMPANY_INFO.location} — ${SUPPORT.phrase}. The same desk that booked the load is the desk that sorts the truck out.`,
  },
] as const

export function FleetSupport() {
  return (
    <section aria-labelledby="fleet-support-heading" className="bg-navy-950 py-section">
      <div className="container">
        <Reveal className="mx-auto max-w-measure text-center">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            Maintenance and support
          </p>
          <h2
            id="fleet-support-heading"
            className="mt-3 font-display text-m-h2 font-bold text-balance text-white"
          >
            Buying it new is the easy half.
          </h2>
          <p className="mt-3 text-m-body text-steel-300">
            {`${EQUIPMENT.short} only stays an advantage if it is kept that way. Here is what happens between the shop and the shoulder.`}
          </p>
        </Reveal>

        <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal as="li" key={pillar.title} index={i}>
              <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                <pillar.icon className="h-5 w-5 text-orange-300" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{pillar.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-steel-300">{pillar.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
