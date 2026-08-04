/**
 * Capability router contract — the routing policy the universal integration
 * layer promises: aggregator-first, always lands somewhere, and an unknown or
 * unconnected provider can never leave a carrier with nothing.
 */
import { describe, expect, it } from "vitest"
import {
  CAPABILITY_CHAINS,
  chainProviderIds,
  resolveCapability,
  type Capability,
} from "../integrations/capability"
import { PROVIDERS } from "../integrations/registry"

const none = () => false
const only = (...ids: string[]) => (id: string) => ids.includes(id)

describe("chain invariants", () => {
  it("every chain terminates in a credential-free fallback", () => {
    for (const [cap, chain] of Object.entries(CAPABILITY_CHAINS)) {
      expect(chain.length, cap).toBeGreaterThan(0)
      expect(chain[chain.length - 1]!.kind, cap).toBe("fallback")
    }
  })

  it("every provider a chain names exists in the registry", () => {
    const known = new Set(PROVIDERS.map((p) => p.id))
    for (const id of chainProviderIds()) {
      expect(known.has(id), `chain references unregistered provider "${id}"`).toBe(true)
    }
  })
})

describe("hos_provider routing (the validated universal-fallback story)", () => {
  it("a carrier with no credentials at all lands on the FMCSA output file", () => {
    const step = resolveCapability("hos_provider", none)
    expect(step).toMatchObject({ kind: "fallback", id: "eld-output-file" })
  })

  it("a connected aggregator wins over the fallback — any ELD brand behind it", () => {
    // The carrier's actual ELD brand (Samsara, TruckX, a long-tail device)
    // never appears here: one Terminal credential covers all of them.
    const step = resolveCapability("hos_provider", only("terminal"))
    expect(step).toEqual({ kind: "aggregator", provider: "terminal" })
  })

  it("aggregator order is Terminal → TruckerCloud → Axle", () => {
    expect(resolveCapability("hos_provider", only("truckercloud", "axle"))).toEqual({
      kind: "aggregator",
      provider: "truckercloud",
    })
    expect(resolveCapability("hos_provider", only("axle"))).toEqual({
      kind: "aggregator",
      provider: "axle",
    })
  })

  it("a connected provider the registry does not know is ignored, not trusted", () => {
    // A typo'd or retired id in the connected set must not shadow the fallback.
    const step = resolveCapability("hos_provider", only("samsara-direct-typo"))
    expect(step).toMatchObject({ kind: "fallback", id: "eld-output-file" })
  })
})

describe("aggregator-first vs preferDirect", () => {
  it("fuel: direct card feed beats the Plaid bank aggregate by default", () => {
    expect(resolveCapability("fuel_feed", only("efs", "plaid"))).toEqual({
      kind: "direct",
      provider: "efs",
    })
  })

  it("fuel: with nothing but a bank link, Plaid carries the feed", () => {
    expect(resolveCapability("fuel_feed", only("plaid"))).toEqual({
      kind: "aggregator",
      provider: "plaid",
    })
  })

  it("preferDirect never promotes a fallback past a connected provider", () => {
    const step = resolveCapability("hos_provider", only("terminal"), { preferDirect: true })
    expect(step.kind).not.toBe("fallback")
  })
})

describe("every capability resolves for a fresh carrier", () => {
  it("no credentials, no crash, always a usable step", () => {
    for (const cap of Object.keys(CAPABILITY_CHAINS) as Capability[]) {
      const step = resolveCapability(cap, none)
      expect(step.kind, cap).toBe("fallback")
    }
  })
})
