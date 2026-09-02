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
  { feature: "Pay split", competitor: "A cut you have to ask for", thind: "90% of gross, in writing" },
  { feature: "Fuel surcharge", competitor: "Partial pass-through", thind: "100% pass-through" },
  { feature: "Forced dispatch", competitor: "Yes", thind: "Never" },
  { feature: "Home time", competitor: "When convenient", thind: "Your schedule, honored" },
  { feature: "Equipment age", competitor: "Whatever is on the yard", thind: "2023-2025 Cascadias & VNLs" },
  { feature: "Dispatch response", competitor: "Call center queue", thind: "Direct line, real person" },
  { feature: "Pay timeline", competitor: "Whenever the invoice clears", thind: "Weekly direct deposit" },
  { feature: "Hidden fees", competitor: "ELD, compliance, admin", thind: "None" },
] as const

export const WhySwitch = () => {
  return (
    <section aria-labelledby="whyswitch-heading" className="bg-paper py-section md:py-section-loose">
      <div className="container">
        <Reveal className="mx-auto max-w-measure text-center">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-signal">
            Side by side
          </p>
          <h2 id="whyswitch-heading" className="mt-3 font-display text-m-h2 font-bold text-ink">Why drivers switch</h2>
          <p className="mt-3 text-m-body text-ink-2">
            We&apos;re not a mega-carrier call center. Here&apos;s the list every driver asks about.
          </p>
        </Reveal>

        <div className="mx-auto mt-8 max-w-3xl">
          {/* Column headers are desktop-only: a header row scrolled off-screen
              is useless, so each row carries its own labels on mobile. */}
          <div className="hidden grid-cols-3 gap-4 border-b border-ink/15 pb-2 md:grid">
            <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
              What you&apos;re comparing
            </span>
            <span className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
              What you may be used to
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
                className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-ink/10 py-3 md:grid-cols-3 md:items-baseline md:py-4"
              >
                <span className="text-m-body font-semibold text-ink">{row.feature}</span>

                {/* Phone width: one line each, prefixed — the desktop column
                    headers scroll away, and a per-row eyebrow doubled every
                    row's height. */}
                <span className="text-m-body text-ink-3">
                  <span className="md:hidden">Elsewhere: </span>
                  {row.competitor}
                </span>

                <span className="text-m-body font-semibold text-ink">
                  <span className="text-signal md:hidden">Thind: </span>
                  {row.thind}
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
              className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-signal px-6 text-m-body font-semibold text-paper transition-colors duration-base hover:bg-signal-up"
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
