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
    promise: "See what you'd take home, then apply in about a minute.",
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
    <section aria-labelledby="audience-heading" className="bg-paper py-12 md:py-16">
      <div className="container px-4">
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

        <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <Reveal as="li" key={a.href} index={i}>
              <Link
                href={a.href}
                className={[
                  // min-h keeps every card a comfortable target and stops the
                  // three from jittering in height as copy wraps.
                  "group flex h-full min-h-[44px] flex-col rounded-m-3 border p-6",
                  "transition-[transform,box-shadow,border-color] duration-base ease-entrance",
                  "hover:-translate-y-0.5 hover:shadow-m-e3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  // Border-led surfaces (DIRECTION.md §10). Never bg-white here:
                  // .brand-page-shell force-darkens it to navy on this page.
                  // Tailwind silently drops an /NN alpha modifier on a var-backed
                  // color token (AGENTS.md standing rule) — signal/ink are plain
                  // var(--m-x) values, so opacity is spelled out as an arbitrary
                  // rgba() using the same hex the token resolves to.
                  a.primary
                    ? "border-[rgba(196,40,32,0.4)] bg-[rgba(196,40,32,0.04)] hover:border-signal"
                    : "border-[rgba(20,22,24,0.2)] bg-paper hover:border-[rgba(20,22,24,0.4)]",
                ].join(" ")}
              >
                <a.icon
                  className={`h-6 w-6 ${a.primary ? "text-signal" : "text-ink-3"}`}
                  aria-hidden
                />
                <span className="mt-4 font-display text-m-h4 font-bold text-ink">
                  {a.who}
                </span>
                <span className="mt-1 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
                  {a.label}
                </span>
                <span className="mt-3 flex-1 text-m-body text-ink-2">{a.promise}</span>
                <span
                  className={`mt-4 inline-flex items-center gap-1.5 text-m-body font-semibold ${
                    a.primary ? "text-signal" : "text-ink"
                  }`}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform duration-base ease-entrance group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
