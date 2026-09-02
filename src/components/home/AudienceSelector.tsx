import Link from "next/link"
import { ArrowRight, Truck, Package, Handshake } from "lucide-react"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Three doors, immediately below the hero.
 *
 * The brief originally ruled out a "who are you?" gate, and it was right about
 * the mechanism: a blocking modal or a four-way hero tab makes every visitor
 * answer a question before they can read anything, and it costs conversions.
 * The owner asked for the selector anyway, so this is the version that gets the
 * benefit without the cost — it is inline and non-blocking. A driver who
 * ignores it entirely still lands on a driver-first page with the calculator
 * right there; a shipper or broker, who previously had no door at all on the
 * homepage, now has an obvious one above the fold on most phones.
 *
 * Server component: three links need no JavaScript.
 */

interface Audience {
  href: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  who: string
  label: string
  promise: string
  /** Drivers are the growth constraint, so their door is weighted. */
  primary?: boolean
}

const AUDIENCES: Audience[] = [
  {
    href: "/drivers",
    icon: Truck,
    who: "I drive",
    label: "Driver or owner-operator",
    promise: "See what you'd take home, then start an application.",
    primary: true,
  },
  {
    href: "/shippers",
    icon: Package,
    who: "I ship freight",
    label: "Shipper",
    promise: "Get a rate on your lane, direct from dispatch — no broker markup.",
  },
  {
    href: "/brokers",
    icon: Handshake,
    who: "I book carriers",
    label: "Broker",
    promise: "Our carrier packet, authority and insurance — ready to onboard.",
  },
]

export function AudienceSelector() {
  return (
    <section aria-labelledby="audience-heading" className="bg-paper py-section-tight md:py-section">
      <div className="container">
        <Reveal className="text-center">
          <h2
            id="audience-heading"
            className="font-display text-m-h3 font-bold text-ink"
          >
            What brings you here?
          </h2>
          <p className="mx-auto mt-2 max-w-measure text-m-body text-ink-2">
            Three different jobs, three different answers. Pick the one that fits.
          </p>
        </Reveal>

        <ul className="mx-auto mt-6 grid max-w-5xl list-none gap-3 md:grid-cols-3 md:gap-4">
          {AUDIENCES.map((a, i) => (
            <Reveal as="li" key={a.href} index={i}>
              <Link
                href={a.href}
                className={[
                  // Phone width: one row per door (icon · title + promise ·
                  // arrow) so all three stay on one screen; cards from md up.
                  "group flex h-full min-h-[44px] items-center gap-4 rounded-m-3 border p-4 md:flex-col md:items-stretch md:p-5",
                  "transition-[transform,box-shadow,border-color] duration-base ease-entrance",
                  "hover:-translate-y-0.5 hover:shadow-m-e3",
                  // Border-led surfaces (DIRECTION.md §10). Never bg-white here:
                  // .brand-page-shell force-darkens it to navy on this page.
                  // signal/ink are rgb(var(--m-*-rgb) / <alpha-value>) tokens, so
                  // the /NN alpha modifier is real here (AGENTS.md) — no hand-typed
                  // rgba() that drifts the day the hex changes.
                  a.primary
                    ? "border-signal/40 bg-signal/[0.04] hover:border-signal"
                    : "border-ink/20 bg-paper hover:border-ink/40",
                ].join(" ")}
              >
                <a.icon
                  className={`h-6 w-6 shrink-0 ${a.primary ? "text-signal" : "text-ink-3"}`}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col md:mt-4">
                  <span className="font-display text-m-lede font-bold text-ink md:text-m-h4">
                    {a.who}
                  </span>
                  {/* ink-2, not ink-3: ink-3 is tuned to clear AA against paper
                      with almost no margin (4.66:1), and the primary card's red
                      wash darkens the ground just enough to drop the label to
                      4.39:1. The eyebrow is already distinguished by case,
                      weight and tracking, so it loses nothing by being darker. */}
                  <span className="mt-0.5 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2 md:mt-1">
                    {a.label}
                  </span>
                  <span className="mt-1 text-m-body text-ink-2 md:mt-3 md:flex-1">{a.promise}</span>
                  <span
                    className={`mt-4 hidden items-center gap-1.5 text-m-body font-semibold md:inline-flex ${
                      a.primary ? "text-signal" : "text-ink"
                    }`}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform duration-base ease-entrance group-hover:translate-x-1" />
                  </span>
                </span>
                <ArrowRight
                  className={`h-5 w-5 shrink-0 transition-transform duration-base ease-entrance group-hover:translate-x-1 md:hidden ${
                    a.primary ? "text-signal" : "text-ink-3"
                  }`}
                  aria-hidden
                />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
