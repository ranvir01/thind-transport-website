import { Check } from "lucide-react"
import { EQUIPMENT, STATS } from "@/lib/constants"
import { STANDARD_EQUIPMENT, TRACTORS } from "./fleet-data"

/**
 * The tractor spec sheet — the "Power units" panel of the paper island.
 *
 * Server component. It replaces four photo cards that each carried a hero
 * image, a hover scale, a star badge, an expandable spec drawer and its own
 * red "Drive this truck" button; the specs those cards hid behind a click are
 * simply printed, which is both shorter and the thing a driver came for.
 */

interface SpecRow {
  label: string
  value: string
  /** Figures render in tabular mono so the four builds line up as a column. */
  mono?: boolean
}

function specRows(t: (typeof TRACTORS)[number]): SpecRow[] {
  return [
    { label: "Engine", value: t.engine },
    { label: "Power", value: t.power, mono: true },
    { label: "Torque", value: t.torque, mono: true },
    { label: "Transmission", value: t.transmission },
    { label: "Sleeper", value: t.sleeper },
    { label: "Safety suite", value: t.safety },
  ]
}

export function TractorSpecs() {
  return (
    <div>
      <p className="max-w-measure text-m-body text-ink-2">
        {`${STATS.trucksInFleet} tractors, every one a ${EQUIPMENT.modelYears} model year. These are the builds you would be assigned to.`}
      </p>

      <ul className="mt-6 grid list-none gap-4 md:grid-cols-2">
        {TRACTORS.map((tractor) => (
          <li key={`${tractor.name} ${tractor.sleeper}`} className="rounded-m-2 border border-ink/15 p-5">
            <h3 className="font-display text-m-h4 font-bold text-ink">{tractor.name}</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              {specRows(tractor).map((row) => (
                <div key={row.label}>
                  <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
                    {row.label}
                  </dt>
                  <dd
                    className={
                      row.mono
                        ? "mt-1 font-mono text-m-body font-semibold tabular-nums text-ink"
                        : "mt-1 text-m-body text-ink"
                    }
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-ink/15 pt-6">
        <h3 className="font-display text-m-h4 font-bold text-ink">Standard on every unit</h3>
        <ul className="mt-3 grid list-none gap-x-6 gap-y-2 sm:grid-cols-2">
          {STANDARD_EQUIPMENT.map((item) => (
            <li key={item} className="flex items-start gap-2 text-m-body text-ink">
              <Check className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
