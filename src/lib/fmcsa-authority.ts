/**
 * Public authority badge — live FMCSA QCMobile data for thindtransport.com.
 *
 * This is the single most load-bearing piece of proof on the site. A shipper
 * or broker vetting a small carrier checks exactly three things first: is the
 * MC authority active, is there insurance on file, and what does SAFER say.
 * Answering that on our own page, from the government's own API, is worth more
 * than any amount of copy about reliability.
 *
 * THREE RULES, all learned from how this fails in practice:
 *
 *  1. The badge must NEVER break the page. QCMobile has documented outages and
 *     the developer portal itself goes down. Every failure path returns the
 *     committed snapshot below, and the caller can always render something.
 *
 *  2. The badge must never LIE about freshness. A cached answer says it is
 *     cached and gives the date it was captured. Claiming live status from a
 *     six-month-old snapshot is worse than saying nothing, because a shipper
 *     who acts on it and finds otherwise never comes back.
 *
 *  3. Nothing here is invented. Only fields FMCSA actually returns are shown.
 *     Insurance limits, on-time percentage, and claims ratio are real numbers
 *     Ranvir has to supply from his COI and his books — see TRUST_FACTS.
 *
 * Reuses the QCMobile parsers already written for customer vetting
 * (vetting-fmcsa.ts) rather than growing a second copy of that logic.
 */
import "server-only"
import { COMPANY_INFO } from "./constants"
import {
  carrierAllowedToOperate,
  carrierAuthorityStatus,
  extractQcCarrier,
  type QcCarrier,
} from "./hub/vetting-fmcsa"

export interface AuthoritySnapshot {
  legalName: string
  dotNumber: string
  mcNumber: string
  /** Y/N from FMCSA, or null when the field wasn't returned. */
  allowedToOperate: boolean | null
  /** e.g. "A" (active) — FMCSA's own authority status code. */
  authorityStatus: string | null
  /** Where this came from, so the UI can be honest about it. */
  source: "live" | "cached"
  /** ISO date the data was captured. For "cached" this is the snapshot date. */
  asOf: string
  /** Deep link to the carrier's SAFER snapshot — always available. */
  saferUrl: string
}

/**
 * Last known good, committed to the repo.
 *
 * This is what renders when FMCSA is unreachable, when FMCSA_WEBKEY is not
 * set (it currently is not — it's a free key from login.gov and one of the
 * owner actions still outstanding), and during a build with no network.
 *
 * Captured by hand from the public SAFER snapshot. Refresh it whenever the
 * authority status genuinely changes; it is deliberately a short, boring
 * record rather than a cached blob of the whole API response.
 */
const SNAPSHOT: Omit<AuthoritySnapshot, "source" | "saferUrl"> = {
  legalName: "THIND TRANSPORT LLC",
  dotNumber: COMPANY_INFO.dot,
  mcNumber: COMPANY_INFO.mc,
  allowedToOperate: true,
  authorityStatus: "A",
  asOf: "2026-07-27",
}

/** SAFER's public company snapshot, by USDOT — the shipper's own check. */
export function saferUrlFor(dotNumber: string): string {
  return `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(dotNumber)}`
}

function fromSnapshot(): AuthoritySnapshot {
  return { ...SNAPSHOT, source: "cached", saferUrl: saferUrlFor(SNAPSHOT.dotNumber) }
}

/**
 * Map a QCMobile carrier object onto our badge shape. Exported for tests: the
 * mapping is where field-name drift bites (FMCSA ships both `allowedToOperate`
 * and `allowToOperate`), and that deserves a pin that doesn't need a network.
 */
export function snapshotFromQc(carrier: QcCarrier, dotNumber: string, mcNumber: string): AuthoritySnapshot {
  return {
    legalName: carrier.legalName?.trim() || carrier.dbaName?.trim() || SNAPSHOT.legalName,
    dotNumber,
    mcNumber,
    allowedToOperate: carrierAllowedToOperate(carrier),
    authorityStatus: carrierAuthorityStatus(carrier),
    source: "live",
    asOf: new Date().toISOString().slice(0, 10),
    saferUrl: saferUrlFor(dotNumber),
  }
}

/**
 * Fetch the live authority snapshot, falling back to the committed one.
 *
 * Never throws and never returns null — a trust badge that can render "we
 * couldn't reach FMCSA" is useless, and one that crashes the page is worse.
 * Callers get something displayable in every case.
 */
export async function getAuthoritySnapshot(): Promise<AuthoritySnapshot> {
  const webKey = process.env.FMCSA_WEBKEY
  if (!webKey) return fromSnapshot()

  const base = "https://mobile.fmcsa.dot.gov/qc/services/carriers"
  const attempts = [
    `${base}/${encodeURIComponent(COMPANY_INFO.dot)}?webKey=${webKey}`,
    `${base}/docket-number/${encodeURIComponent(COMPANY_INFO.mc)}?webKey=${webKey}`,
  ]

  for (const url of attempts) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        // Revalidate daily: authority status changes on the order of months,
        // and a marketing page must not make an outbound call per request.
        next: { revalidate: 86_400 },
      })
      if (!response.ok) continue
      const carrier = extractQcCarrier(await response.json())
      if (carrier) return snapshotFromQc(carrier, COMPANY_INFO.dot, COMPANY_INFO.mc)
    } catch {
      /* outage, timeout, or malformed body — try the next identifier */
    }
  }
  return fromSnapshot()
}

/**
 * Trust facts that are NOT derivable from any API and must come from Ranvir's
 * own records. Each is null until he supplies the real figure.
 *
 * Deliberately null rather than plausible-looking placeholders: a fabricated
 * insurance limit or on-time percentage on a page aimed at shippers is a
 * misrepresentation, and the one a broker would actually check. The UI renders
 * an honest "ask us" for anything still null.
 */
export const TRUST_FACTS: {
  /** Bodily injury & property damage limit, in whole dollars. FMCSA floor is $750k; $1M is the common contract requirement. */
  autoLiabilityDollars: number | null
  /** Cargo coverage, in whole dollars. $100k+ is the common contract requirement. */
  cargoDollars: number | null
  /** On-time delivery percentage. Publish only if genuinely measured. */
  onTimePercent: number | null
  /** Claims/damage ratio as a percentage of loads. */
  claimsRatioPercent: number | null
} = {
  autoLiabilityDollars: null,
  cargoDollars: null,
  onTimePercent: null,
  claimsRatioPercent: null,
}
