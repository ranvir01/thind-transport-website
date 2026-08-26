"use client"

/**
 * Invisible atom mounted on each door page: visiting the page IS choosing the
 * lane, however you arrived (homepage card, header switcher, an ad, search).
 * Writes after paint — the persona is never used for this page's own initial
 * render, so there is nothing to mismatch or shift.
 */
import { useEffect } from "react"
import { rememberPersona, type Persona } from "@/lib/persona"

export function PersonaRemember({ persona }: { persona: Persona }) {
  useEffect(() => {
    rememberPersona(persona)
  }, [persona])
  return null
}
