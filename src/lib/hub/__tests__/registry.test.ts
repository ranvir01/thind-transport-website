/**
 * registry.ts is documented as the ONLY provider list, but two other files
 * still hand-maintain a shadow copy of "which providers exist": the
 * `IntegrationProvider` string-literal union in credentials.ts, and the
 * `EVENT_PROCESSORS` map in event-processors.ts. Neither drift is caught by
 * any single provider's own test file — and the webhook route casts the URL
 * param with `provider as IntegrationProvider`, so a registry id missing
 * from credentials.ts's union would still compile there. cron-route.test.ts
 * already locks the registry↔vercel.json↔route cronJob three-way; this file
 * covers the two drift classes that leaves open.
 */
import { describe, expect, it } from "vitest"
import { PROVIDERS } from "../integrations/registry"
import { EVENT_PROCESSORS, EVENT_RETRY_PROVIDERS } from "../integrations/event-processors"
import type { IntegrationProvider } from "../credentials"

type ProviderId = (typeof PROVIDERS)[number]["id"]

// True type-equality (not just mutual-assignability, which distributive
// unions can fake) — see the "IfEquals" pattern. Enforced by `npm run
// build`'s typecheck, since vitest's transform strips types without
// checking them: if a registry id is added/removed without updating
// credentials.ts's IntegrationProvider union, `never` below can't be
// assigned `true` and the build fails.
type IfEquals<X, Y, A = true, B = never> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B

const _providerIdsMatchCredentialsUnion: IfEquals<ProviderId, IntegrationProvider> = true
void _providerIdsMatchCredentialsUnion

describe("registry ↔ event-processors drift", () => {
  it("every EVENT_PROCESSORS key is a real provider id", () => {
    const ids = new Set(PROVIDERS.map((p) => p.id))
    for (const key of Object.keys(EVENT_PROCESSORS)) {
      expect(ids.has(key), key).toBe(true)
    }
  })

  it("providers that declare a webhookSecret field and providers with a processor are the same set", () => {
    // A provider needs webhookSecret to ever pass verifyWebhookSignature, and
    // a processor to do anything with the events that then land — either one
    // without the other is a half-wired push integration that silently never
    // does anything (or can never receive anything at all).
    const withSecretField = PROVIDERS
      .filter((p) => p.fields.some((f) => f.key === "webhookSecret"))
      .map((p) => p.id)
      .sort()
    const withProcessor = Object.keys(EVENT_PROCESSORS).sort()
    expect(withProcessor).toEqual(withSecretField)
  })

  it("EVENT_RETRY_PROVIDERS is derived from EVENT_PROCESSORS, never a separate hand-listed set", () => {
    expect([...EVENT_RETRY_PROVIDERS].sort()).toEqual(Object.keys(EVENT_PROCESSORS).sort())
  })
})

describe("registry field integrity", () => {
  it("no provider declares the same credential field key twice", () => {
    for (const p of PROVIDERS) {
      const keys = p.fields.map((f) => f.key)
      expect(new Set(keys).size, p.id).toBe(keys.length)
    }
  })
})
