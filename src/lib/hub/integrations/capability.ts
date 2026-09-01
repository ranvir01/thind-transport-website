/**
 * Capability router — integrations modeled as capabilities, not vendors.
 *
 * The question this answers is never "is Samsara supported?" but "how does
 * THIS carrier get hours-of-service data?" — and the answer is an ordered
 * chain: aggregator first (one credential covers hundreds of ELD brands),
 * then a direct vendor adapter if one exists and is connected, then the
 * universal fallback that needs no credential at all. Every capability
 * terminates in a step that always works, which is the same doctrine the
 * provider registry already enforces per-provider ("the always-working path
 * when the integration is off").
 *
 * Aggregator-first is deliberate, not just convenient: Terminal alone claims
 * 300+ telematics providers, so for a 15-truck carrier the aggregator
 * credential is one signup instead of N vendor relationships. A direct
 * adapter only beats it when the carrier explicitly opts in (richer data,
 * or the aggregator lacks their device).
 *
 * The universal HOS fallback is the FMCSA output file (49 CFR 395 Subpart B,
 * Appendix A): every ELD registered with FMCSA is legally required to produce
 * it, so it is a guaranteed floor for any device no aggregator covers — RODS
 * and duty status, though not live GPS (eld-output-file.ts says so too).
 *
 * Pure module: the credential probe is injected, so this never touches the
 * database and the router is testable without a carrier. Callers pass
 * `(id) => hasCredentials(carrierId, id)` — carrier scoping stays with the
 * caller, where every other credential read already lives.
 */
import { PROVIDERS } from "./registry"

export type Capability =
  | "hos_provider"
  | "fuel_feed"
  | "load_source"
  | "tracking_target"
  | "accounting_sink"
  | "toll_feed"
  | "bypass_provider"
  | "maintenance_sink"
  | "mvr_monitor"
  | "edi_gateway"

export type SourceStep =
  /** A registry provider that must be connected (credentials pasted). */
  | { kind: "aggregator" | "direct"; provider: string }
  /** Always available — a parser or import path needing no credential. */
  | { kind: "fallback"; id: string; label: string }

/**
 * Resolution order per capability. Data, not code: adding a provider to a
 * chain is an entry here plus its registry row — the resolver never changes.
 * Fallback steps are terminal and credential-free by construction.
 */
export const CAPABILITY_CHAINS: Record<Capability, readonly SourceStep[]> = {
  hos_provider: [
    { kind: "aggregator", provider: "terminal" },
    { kind: "aggregator", provider: "truckercloud" },
    { kind: "aggregator", provider: "axle" },
    // Direct Samsara/Motive/Geotab adapters slot in HERE when built — after
    // the aggregators by default; `preferDirect` lets a carrier flip that.
    { kind: "fallback", id: "eld-output-file", label: "FMCSA ELD output file (49 CFR 395 App. A) — RODS/HOS, not live GPS" },
    { kind: "fallback", id: "positions-csv", label: "Positions CSV import" },
  ],
  fuel_feed: [
    { kind: "direct", provider: "atob" },
    { kind: "direct", provider: "efs" },
    { kind: "direct", provider: "wex" },
    { kind: "direct", provider: "comdata" },
    { kind: "aggregator", provider: "plaid" }, // bank feed aggregates all card spend
    { kind: "fallback", id: "fuel-csv", label: "Fuel statement CSV import" },
  ],
  load_source: [
    { kind: "direct", provider: "dat" },
    { kind: "direct", provider: "truckstop" },
    { kind: "aggregator", provider: "stedi" }, // EDI 204 tenders arrive for any trading partner
    { kind: "fallback", id: "paste-rate-con", label: "Paste rate con / manual load entry" },
  ],
  tracking_target: [
    // project44/FourKites/MacroPoint are partner-gated; they enter the registry
    // when a broker relationship supplies credentials.
    { kind: "fallback", id: "driver-checkin", label: "Driver-app check-in (location on confirm/arrive/deliver)" },
  ],
  accounting_sink: [
    { kind: "direct", provider: "qbo" },
    { kind: "fallback", id: "journal-export", label: "Generic journal / CSV export" },
  ],
  toll_feed: [
    { kind: "direct", provider: "bestpass" },
    { kind: "direct", provider: "prepass" },
    { kind: "fallback", id: "toll-csv", label: "Toll statement CSV import" },
  ],
  bypass_provider: [
    { kind: "direct", provider: "drivewyze" },
    { kind: "direct", provider: "prepass" },
    { kind: "fallback", id: "none-needed", label: "Bypass works in-cab without a feed" },
  ],
  maintenance_sink: [
    { kind: "direct", provider: "fleetio" },
    { kind: "fallback", id: "maintenance-panel", label: "Built-in maintenance panel + CSV import" },
  ],
  mvr_monitor: [
    { kind: "direct", provider: "sambasafety" },
    { kind: "fallback", id: "annual-mvr", label: "Annual MVR pull filed to the DQ file" },
  ],
  edi_gateway: [
    { kind: "direct", provider: "stedi" },
    { kind: "fallback", id: "email-tender", label: "Email/portal tender handling" },
  ],
}

export interface ResolveOptions {
  /**
   * Carrier opt-in: try connected direct adapters before connected
   * aggregators (richer vendor-specific data at the cost of one credential
   * per vendor). Default false — aggregator-first.
   */
  preferDirect?: boolean
}

/**
 * Resolve a capability to the first usable step: the first CONNECTED
 * provider in chain order, else the first fallback. Unknown providers in the
 * connected set are ignored rather than trusted — a typo'd or retired
 * provider id must not shadow the fallback.
 */
export function resolveCapability(
  capability: Capability,
  connected: (providerId: string) => boolean,
  opts: ResolveOptions = {}
): SourceStep {
  const chain = CAPABILITY_CHAINS[capability]
  const order = opts.preferDirect
    ? [...chain].sort((a, b) => rank(a, true) - rank(b, true))
    : chain
  for (const step of order) {
    if (step.kind === "fallback") return step
    if (isRegistered(step.provider) && connected(step.provider)) return step
  }
  // Unreachable while every chain ends in a fallback; the throw guards the
  // invariant against a future edit that forgets one.
  throw new Error(`capability chain for ${capability} has no fallback`)
}

function rank(step: SourceStep, preferDirect: boolean): number {
  if (step.kind === "fallback") return 2 // fallbacks stay last under any order
  if (preferDirect) return step.kind === "direct" ? 0 : 1
  return step.kind === "aggregator" ? 0 : 1
}

function isRegistered(providerId: string): boolean {
  return PROVIDERS.some((p) => p.id === providerId)
}

/** Every provider referenced by a chain — used by the contract test to keep
 * chains and registry from drifting apart. */
export function chainProviderIds(): string[] {
  const ids = new Set<string>()
  for (const chain of Object.values(CAPABILITY_CHAINS)) {
    for (const step of chain) if (step.kind !== "fallback") ids.add(step.provider)
  }
  return [...ids]
}
