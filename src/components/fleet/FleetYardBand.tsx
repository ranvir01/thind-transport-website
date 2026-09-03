import Image from "next/image"
import { COMPANY_INFO } from "@/lib/constants"

/**
 * The page's one image, full-bleed, between the spec sheet and the support band.
 *
 * /fleet shipped nine images: a priority hero photo, four tractor cards, three
 * trailer cards and this. Every one is machine-generated (`/images/generated/`),
 * and DIRECTION.md §7 is explicit — until real photography exists, ship fewer
 * images rather than generated ones. This is the one that earns its place,
 * because a yard line-up is the only frame the page cannot state in words.
 *
 * The alt text says what it is: an illustration. The scrim is a flat alpha
 * wash, not a gradient — gradients are reserved for scrims over real photos,
 * and this is not one. No `priority`: the hero above it is type-only, so the
 * LCP is text and this image is free to load late.
 */
export function FleetYardBand() {
  return (
    <section aria-labelledby="fleet-yard-heading" className="relative h-64 overflow-hidden md:h-96">
      <Image
        src="/images/generated/fleet-lineup-kent.webp"
        alt="Illustration of Freightliner Cascadia and Volvo VNL tractors lined up at a yard"
        fill
        sizes="100vw"
        className="img-authentic object-cover"
      />
      <div className="absolute inset-0 bg-navy-950/60" />
      <div className="absolute inset-x-0 bottom-0 pb-8 md:pb-12">
        <div className="container">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            {`The yard — ${COMPANY_INFO.location}`}
          </p>
          <h2
            id="fleet-yard-heading"
            className="mt-3 max-w-measure font-display text-m-h2 font-bold text-balance text-white"
          >
            Late-model power, lined up and ready.
          </h2>
        </div>
      </div>
    </section>
  )
}
