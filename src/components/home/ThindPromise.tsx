import { Phone } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * The founder's note — a quiet, no-card column of type.
 *
 * It used to be a two-column hero of its own: a portrait card with a
 * nameplate, a floating "12 yrs" chip, two blurred orbs and a red button.
 * Between the operation section and the lane cards that read as a third
 * pitch in a row. A signed note on the page ground is what it is: one
 * person talking. The figures interpolate the constants so this paragraph
 * cannot drift from the pay page.
 */
const yearsRunning = new Date().getFullYear() - COMPANY_INFO.founded

export const ThindPromise = () => {
  return (
    <section aria-labelledby="promise-heading" className="py-section md:py-section-loose">
      <div className="container">
        <Reveal className="mx-auto max-w-measure">
          <p
            id="promise-heading"
            className="font-display text-xs font-bold uppercase tracking-[0.2em] text-steel-400"
          >
            A note from the owner
          </p>
          <blockquote className="mt-5 space-y-5 text-lg leading-relaxed text-steel-200 md:text-xl">
            <p>
              {`I started ${COMPANY_INFO.name} in ${COMPANY_INFO.founded} out of ${COMPANY_INFO.location}. I know what it's like behind the wheel — the long hours, the missed dinners, and being a truck number to a dispatcher who has never met you.`}
            </p>
            <p>
              <span>That&apos;s why we run it differently. Owner-operators keep </span>
              <strong className="font-mono font-semibold tabular-nums text-white">
                {PAY_RATES.ownerOperator.commission}
              </strong>
              <span> of gross. Company drivers run </span>
              <strong className="text-white">{`${EQUIPMENT.modelYears} ${EQUIPMENT.makes}`}</strong>
              <span>. And when you call, the person who picks up knows your name.</span>
            </p>
            <p>
              {`Drive for us and you're building something with a family that has done this for ${yearsRunning} years. That's my promise.`}
            </p>
          </blockquote>

          <footer className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="font-display text-xl font-bold text-white">{COMPANY_INFO.owner}</p>
              <p className="text-sm text-steel-400">{`Founder, ${COMPANY_INFO.name} · ${COMPANY_INFO.location}`}</p>
            </div>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-steel-200 transition-colors hover:text-white"
            >
              <Phone className="h-4 w-4" aria-hidden />
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </footer>
        </Reveal>
      </div>
    </section>
  )
}
