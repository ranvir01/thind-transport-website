import Image from "next/image"
import {
  ShieldCheck,
  BadgeCheck,
  Truck,
  MapPin,
  ExternalLink,
} from "lucide-react"
import { COMPANY_INFO, FMCSA_LINKS, STATS } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Editorial trust bar: a real FMCSA compliance badge paired with an inline,
 * divider-separated credential row — every figure shown here is verifiable
 * (USDOT, MC, fleet size, years in business).
 */

const credentials = [
  {
    icon: ShieldCheck,
    value: COMPANY_INFO.dot,
    label: "USDOT #",
    sub: "Active FMCSA authority",
    href: FMCSA_LINKS.safer,
  },
  {
    icon: BadgeCheck,
    value: COMPANY_INFO.mc,
    label: "MC #",
    sub: "Verified motor carrier",
    href: FMCSA_LINKS.safer,
  },
  // The "$1M+ Insured" tile is deliberately absent: the figure was never
  // verified against a COI, and a broker checks exactly that number. It comes
  // back when the owner confirms the real limits (docs/OWNER-CHECKLIST.md).
  {
    icon: Truck,
    value: `${STATS.trucksInFleet}+`,
    label: "Trucks",
    sub: "2023-2025 Freightliners & Volvos",
  },
  {
    icon: MapPin,
    value: `${new Date().getFullYear() - COMPANY_INFO.founded}+`,
    label: "Years",
    sub: `Family-run · ${COMPANY_INFO.location}`,
  },
]

export function TrustStrip() {
  return (
    <section className="relative border-b border-steel-800 py-12 md:py-16">
      <div className="container px-4">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
          {/* Real FMCSA compliance badge */}
          {/* Reveal renders the wrapper, so the anchor lives inside it — the
              href/target/rel belong on a real <a>, not on the animation shell. */}
          <Reveal className="mx-auto lg:mx-0">
            <a
              href={FMCSA_LINKS.safer}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4"
            >
              <div className="relative h-24 w-24 flex-shrink-0 md:h-28 md:w-28">
                <Image
                  src="/images/generated/fmcsa-compliance-badge.png"
                  alt="FMCSA compliance badge — verified motor carrier authority"
                  fill
                  sizes="112px"
                  className="object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div className="max-w-[12rem]">
                <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-steel-300 transition-colors group-hover:text-orange">
                  {COMPANY_INFO.location}-Based
                </p>
                <p className="font-display text-lg font-bold leading-tight text-white">
                  FMCSA-Authorized, Driver-Approved
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-steel-400 underline-offset-2 group-hover:text-orange group-hover:underline">
                  Verify on SAFER
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>
          </Reveal>

          {/* Inline credential row — divided, not boxed */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:flex lg:flex-1 lg:items-stretch lg:justify-between lg:divide-x lg:divide-steel-700/60">
            {credentials.map((item, index) => {
              const Icon = item.icon
              const inner = (
                <Reveal
                  className="h-full lg:px-5 lg:first:pl-0 lg:last:pr-0"
                  index={Math.min(index, 4)}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 text-gold"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-steel-400">
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="font-display text-2xl font-bold leading-none md:text-3xl text-white"
                  >
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs leading-tight text-steel-400">
                    {item.sub}
                  </div>
                </Reveal>
              )

              if (item.href) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block transition-opacity hover:opacity-80"
                  >
                    {inner}
                  </a>
                )
              }

              return <div key={item.label}>{inner}</div>
            })}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-steel-400">
          USDOT #{COMPANY_INFO.dot} · MC-{COMPANY_INFO.mc} — verify our
          authority anytime on the{" "}
          <a
            href={FMCSA_LINKS.safer}
            target="_blank"
            rel="noopener noreferrer"
            className="text-steel-300 underline underline-offset-2 hover:text-orange"
          >
            FMCSA SAFER
          </a>{" "}
          system. Fleet of {STATS.trucksInFleet}+ trucks serving{" "}
          {STATS.statesCovered} states.
        </p>
      </div>
    </section>
  )
}
