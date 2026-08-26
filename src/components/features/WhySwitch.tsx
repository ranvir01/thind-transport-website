import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Archetype C — dense data (docs/design/DIRECTION.md §3).
 *
 * Was two full renders of `comparisonData`: a card list at `md:hidden` and a
 * table at `hidden md:block`. The same eight rows shipped twice in the HTML,
 * and every edit had to be made in two places. Now one render whose grid
 * reflows — the only thing that changes across breakpoints is the column
 * labelling, not the data.
 *
 * Also dropped framer-motion, which made this a client component purely to fade
 * rows in. It is a server component now: the table ships as HTML.
 */

const comparisonData = [
  { feature: "Pay split", competitor: "65–75% of gross", thind: "91% of gross" },
  { feature: "Fuel surcharge", competitor: "Partial pass-through", thind: "100% pass-through" },
  { feature: "Forced dispatch", competitor: "Yes", thind: "Never" },
  { feature: "Home time", competitor: "When convenient", thind: "Your schedule, honored" },
  { feature: "Equipment age", competitor: "5–10 year old trucks", thind: "2020-2022 Cascadias" },
  { feature: "Dispatch response", competitor: "Call center queue", thind: "Direct line, real person" },
  { feature: "Pay timeline", competitor: "Net 30–45 days", thind: "Weekly direct deposit" },
  { feature: "Hidden fees", competitor: "ELD, compliance, admin", thind: "None" },
] as const

export const WhySwitch = () => {
  return (
    <section className="bg-paper py-16 md:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto max-w-measure text-center">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-signal">
            Side by side
          </p>
          <h2 className="mt-3 font-display text-m-h2 font-bold text-ink">Why drivers switch</h2>
          <p className="mt-3 text-m-body text-ink-2">
            We&apos;re not a mega-carrier call center. Here&apos;s the list every driver asks about.
          </p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-3xl">
          {/* Column headers are desktop-only: a header row scrolled off-screen
              is useless, so each row carries its own labels on mobile. */}
          <div className="hidden grid-cols-3 gap-4 border-b border-[rgba(20,22,24,0.15)] pb-2 md:grid">
            <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
              What you&apos;re comparing
            </span>
            <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
              Mega carriers
            </span>
            <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-signal">
              Thind Transport
            </span>
          </div>

          <ul className="list-none">
            {comparisonData.map((row, i) => (
              <Reveal
                as="li"
                key={row.feature}
                index={Math.min(i, 4)}
                className="grid grid-cols-2 items-baseline gap-x-4 gap-y-1 border-b border-[rgba(20,22,24,0.1)] py-4 md:grid-cols-3"
              >
                <span className="col-span-2 text-m-body font-semibold text-ink md:col-span-1">
                  {row.feature}
                </span>

                <span className="flex flex-col">
                  <span className="font-display text-m-micro uppercase tracking-[0.12em] text-ink-3 md:hidden">
                    Mega carriers
                  </span>
                  <span className="text-m-body text-ink-3">{row.competitor}</span>
                </span>

                <span className="flex flex-col">
                  <span className="font-display text-m-micro uppercase tracking-[0.12em] text-signal md:hidden">
                    Thind
                  </span>
                  <span className="text-m-body font-semibold text-ink">{row.thind}</span>
                </span>
              </Reveal>
            ))}
          </ul>

          {/* This previously asserted "$35,000+ more per year" — one of the
              contradicting earnings figures. Every number on the site now comes
              from the calculator, so this sends people there rather than
              quoting a delta that depends on an unstated gross. */}
          <Reveal className="mt-8 text-center">
            <p className="mx-auto max-w-measure text-m-body text-ink-2">
              What the split is worth depends on your miles and your lane. Run your own numbers
              rather than take ours.
            </p>
            <Link
              href="/#calculator"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-m-2 bg-signal px-6 py-3 font-display text-m-body font-bold uppercase tracking-wide text-paper transition-colors duration-base ease-entrance hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Work out your take-home
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
