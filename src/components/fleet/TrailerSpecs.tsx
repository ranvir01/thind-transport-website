import { Check } from "lucide-react"
import { SERVICES } from "@/lib/constants"
import { TRAILERS } from "./fleet-data"

/**
 * The trailer panel — one card per freight type in `SERVICES.types`.
 *
 * Server component. The per-type unit counts the old cards published ("8+",
 * "4+", "3+") are gone: nothing in the repo backs them, and they contradicted
 * the one fleet count that is published (`STATS.trucksInFleet`).
 */
export function TrailerSpecs() {
  return (
    <div>
      <p className="max-w-measure text-m-body text-ink-2">
        {`Every freight type we haul has trailers behind it: ${SERVICES.types.join(", ")}. Tell dispatch which you are set up for and the loads are built around it.`}
      </p>

      <ul className="mt-6 grid list-none gap-4 md:grid-cols-3">
        {TRAILERS.map((trailer) => (
          <li key={trailer.type} className="flex h-full flex-col rounded-m-2 border border-ink/15 p-5">
            <trailer.icon className="h-6 w-6 text-signal" aria-hidden />
            <h3 className="mt-4 font-display text-m-h4 font-bold text-ink">{trailer.type}</h3>
            <p className="mt-2 text-m-body text-ink-2">{trailer.summary}</p>
            <ul className="mt-4 list-none space-y-2 border-t border-ink/15 pt-4">
              {trailer.specs.map((spec) => (
                <li key={spec} className="flex items-start gap-2 text-m-body text-ink">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
