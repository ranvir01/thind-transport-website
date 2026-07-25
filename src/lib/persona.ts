/**
 * Audience persona: which of the three doors (drivers / shippers / brokers)
 * this visitor went through last. Client-safe module — no next/headers.
 *
 * Deliberate design limits (researched: NN/g on role-based IA, Google's
 * interstitial penalty):
 *  - The persona NEVER gates or removes content. It is remembered so future
 *    surfaces (UTM-matched heroes, the mobile command bar's CTA) can lead
 *    with the right door — every page stays identical for crawlers and for
 *    visitors who ignore it.
 *  - The homepage stays statically rendered, so it does not read the cookie
 *    server-side; the header switcher highlights by PATHNAME (server-knowable,
 *    no hydration mismatch, no flash) rather than by cookie.
 *  - Cookie is SameSite=Lax, 90 days, path=/ with a localStorage mirror.
 */

export const PERSONAS = ["drivers", "shippers", "brokers"] as const
export type Persona = (typeof PERSONAS)[number]

export const PERSONA_COOKIE = "persona"
const NINETY_DAYS_S = 90 * 24 * 60 * 60

export function parsePersona(value: string | undefined | null): Persona | null {
  return PERSONAS.includes(value as Persona) ? (value as Persona) : null
}

/** Client-side write: cookie + localStorage mirror. No-op on the server. */
export function rememberPersona(persona: Persona): void {
  if (typeof document === "undefined") return
  document.cookie = `${PERSONA_COOKIE}=${persona}; Max-Age=${NINETY_DAYS_S}; Path=/; SameSite=Lax`
  try {
    window.localStorage.setItem(PERSONA_COOKIE, persona)
  } catch {
    /* storage full/blocked — the cookie alone is fine */
  }
}
