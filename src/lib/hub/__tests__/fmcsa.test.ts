import { afterEach, describe, expect, it } from "vitest"
import { vetCarrierWithFmcsa } from "../fmcsa"

describe("FMCSA vetting", () => {
  const original = process.env.FMCSA_WEBKEY
  afterEach(() => {
    if (original == null) delete process.env.FMCSA_WEBKEY
    else process.env.FMCSA_WEBKEY = original
  })

  it("skips safely when FMCSA_WEBKEY is missing", async () => {
    delete process.env.FMCSA_WEBKEY
    await expect(vetCarrierWithFmcsa({ name: "Example Broker", dotNumber: "123456" }))
      .resolves.toMatchObject({
        status: "skipped",
        note: expect.stringContaining("FMCSA_WEBKEY"),
      })
  })

  it("skips safely when DOT number is blank", async () => {
    process.env.FMCSA_WEBKEY = "test-key"
    await expect(vetCarrierWithFmcsa({ name: "Example Broker", dotNumber: null }))
      .resolves.toMatchObject({
        status: "skipped",
        note: expect.stringContaining("DOT number is blank"),
      })
  })
})
