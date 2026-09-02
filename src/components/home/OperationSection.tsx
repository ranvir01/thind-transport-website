import Image from "next/image"
import { Phone, Search, Headphones, Wallet } from "lucide-react"
import { COMPANY_INFO, PAY_RATES, SUPPORT } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * How a week actually runs, and who picks up when you call.
 *
 * DispatchBand used to make the second point again one screen later — a
 * second full-bleed photo, a second red button, the same sentence about
 * phone trees. That band is gone; its one claim (a person answers, days,
 * nights and weekends) lives here on the photo caption and the call link,
 * next to the dispatcher it was about.
 */
const steps = [
  {
    icon: Search,
    title: "Pick your freight",
    body: "Loads come off the DAT board and direct from shippers you already recognize. No forced dispatch — owner-operators choose what they run.",
  },
  {
    icon: Headphones,
    title: "Run with real support",
    body: `One call reaches a dispatcher in ${COMPANY_INFO.location} who knows your name and your lane — ${SUPPORT.phrase}. No phone trees, no overseas queue.`,
  },
  {
    icon: Wallet,
    title: "Get paid without surprises",
    body: `Weekly settlements that match the rate confirmation, with ${PAY_RATES.ownerOperator.fuelSurcharge} of fuel surcharges passed through to owner-operators.`,
  },
]

export function OperationSection() {
  return (
    <section aria-labelledby="operation-heading" className="brand-section-panel py-section md:py-section-loose">
      <div className="container">
        <Reveal className="mb-8 max-w-3xl md:mb-14">
          <span className="fleet-badge mb-4 w-fit">
            <Headphones className="h-3.5 w-3.5" aria-hidden />
            The day-to-day
          </span>
          <h2 id="operation-heading" className="mb-3 text-white">
            How you&apos;ll <span className="text-gradient-accent">actually run</span>
          </h2>
          <p className="max-w-2xl text-base text-steel-300 md:text-lg">
            {`No mystery middle layer. Here's the loop between you, the load board, and the desk in ${COMPANY_INFO.location}.`}
          </p>
        </Reveal>

        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-[5fr_7fr]">
          <Reveal className="relative overflow-hidden rounded-fleet-lg border border-white/10 shadow-brand">
            <div className="relative aspect-[16/10] md:aspect-[4/3]">
              <Image
                src="/images/generated/dispatch-desk-kent.webp"
                alt="Illustration of a dispatcher on a headset working a load board"
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover img-authentic"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/20 to-transparent" />
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                The dispatch desk
              </p>
              <p className="text-sm font-semibold text-white md:text-base">
                {`${COMPANY_INFO.location} — a person answers, ${SUPPORT.phrase}.`}
              </p>
            </div>
          </Reveal>

          <div className="space-y-6 md:space-y-8">
            <ol className="list-none space-y-6 md:space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <Reveal
                    as="li"
                    key={step.title}
                    className="flex items-start gap-4 md:gap-5"
                    index={Math.min(index, 4)}
                  >
                    <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-fleet border border-orange/30 bg-orange/10">
                      <Icon className="h-5 w-5 text-orange-300" aria-hidden />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 font-display text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="mb-1 text-lg font-bold text-white md:text-xl">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-steel-300 md:text-base">{step.body}</p>
                    </div>
                  </Reveal>
                )
              })}
            </ol>

            <Reveal
              className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-white/10 pt-6"
              index={2}
            >
              <div className="logo-chip flex h-10 items-center justify-center rounded-fleet px-4">
                <div className="relative h-5 w-14">
                  <Image src="/logos/dat.svg" alt="DAT load board" fill sizes="56px" className="object-contain" />
                </div>
              </div>
              <p className="text-sm text-steel-300">Verified carrier on the DAT network</p>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-fleet border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:border-white/35 hover:bg-white/10"
              >
                <Phone className="h-4 w-4 text-orange-300" aria-hidden />
                <span>Call dispatch</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
