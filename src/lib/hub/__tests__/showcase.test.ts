import { describe, expect, it } from "vitest"
import { SHOWCASE_MOCK, SHOWCASE_PERSONAS, getPersona } from "../showcase"

describe("showcase personas", () => {
  it("covers every live seat", () => {
    expect(SHOWCASE_PERSONAS.map((p) => p.id)).toEqual([
      "dispatcher",
      "driver",
      "accountant",
      "owner",
      "broker",
      "shipper",
    ])
  })

  it("every persona has frames and a demo email", () => {
    for (const persona of SHOWCASE_PERSONAS) {
      expect(persona.frames.length).toBeGreaterThan(0)
      expect(persona.demoEmail).toMatch(/@demo\.thind$/)
      expect(persona.frames.every((f) => f.voiceover.length > 20 && f.durationMs >= 4000)).toBe(true)
    }
  })

  it("keeps money in integer cents", () => {
    expect(Number.isInteger(SHOWCASE_MOCK.load.rateCents)).toBe(true)
    expect(SHOWCASE_MOCK.load.rateCents).toBe(285000)
    expect(Number.isInteger(SHOWCASE_MOCK.money.unbilledCents)).toBe(true)
  })

  it("looks up personas by id", () => {
    expect(getPersona("driver")?.device).toBe("phone")
    expect(getPersona("missing")).toBeUndefined()
  })
})
