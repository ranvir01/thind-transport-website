"use client"

/**
 * The persistent audience switcher (header): three plain links — Drivers,
 * Shippers, Brokers — always visible, so nobody is ever trapped in a lane.
 *
 * Highlight comes from the PATHNAME, not the persona cookie: the pathname is
 * known during server render, so there is no flash-of-wrong-state and no
 * hydration mismatch (the cookie-in-useEffect trap the research brief warns
 * about). Clicking writes the persona cookie for surfaces that want to lead
 * with the remembered door later; navigation itself is ordinary links, fully
 * crawlable.
 *
 * WCAG 2.2: real links in a labelled nav (not a fake radiogroup — arrow-key
 * radio semantics on navigation links surprises screen-reader users),
 * aria-current on the active lane, visible focus ring, targets ≥24px.
 */
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PERSONAS, rememberPersona, type Persona } from "@/lib/persona"

const LABELS: Record<Persona, string> = {
  drivers: "Drivers",
  // Short label deliberately: four chips have to fit a 390px phone without
  // wrapping the header.
  "owner-operators": "Owner-Ops",
  shippers: "Shippers",
  brokers: "Brokers",
}

/** Routes that belong to each lane, for highlight purposes. */
const LANE_PREFIXES: Record<Persona, string[]> = {
  drivers: ["/drivers", "/apply", "/pay-rates", "/benefits", "/cdl-jobs", "/veterans", "/app", "/pre-qualify", "/pay-breakdown"],
  "owner-operators": ["/owner-operators", "/fuel-program"],
  shippers: ["/shippers"],
  brokers: ["/brokers"],
}

function laneFor(pathname: string): Persona | null {
  for (const persona of PERSONAS) {
    if (LANE_PREFIXES[persona].some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return persona
    }
  }
  return null
}

export function PersonaSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const active = laneFor(pathname)

  return (
    <nav
      aria-label="Choose your audience"
      className={`items-center rounded-full border border-steel-600 bg-steel-800/60 p-0.5 ${className}`}
    >
      {PERSONAS.map((persona) => {
        const current = active === persona
        return (
          <Link
            key={persona}
            href={`/${persona}`}
            aria-current={current ? "page" : undefined}
            onClick={() => rememberPersona(persona)}
            className={`min-h-[28px] rounded-full px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
              current
                ? "bg-orange-600 text-white"
                : "text-steel-300 hover:bg-steel-700 hover:text-white"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
          >
            {LABELS[persona]}
          </Link>
        )
      })}
    </nav>
  )
}
