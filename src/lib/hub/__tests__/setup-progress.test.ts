import { describe, expect, it } from "vitest"
import { nextSetupStep, setupDoneCount, setupSteps } from "@/lib/hub/setup-progress"
import type { GettingStarted } from "@/app/hub/_actions/onboarding"

const none: GettingStarted = {
  trucks: false,
  drivers: false,
  customers: false,
  loads: false,
  packet: false,
  fuel: false,
}

describe("endowed setup progress", () => {
  it("starts at 1 of 7 — workspace is pre-checked", () => {
    const steps = setupSteps(none)
    expect(steps).toHaveLength(7)
    expect(steps[0].key).toBe("workspace")
    expect(steps[0].done).toBe(true)
    expect(setupDoneCount(steps)).toBe(1)
  })

  it("reaches 7 of 7 when everything is on file", () => {
    const steps = setupSteps({
      trucks: true,
      drivers: true,
      customers: true,
      loads: true,
      packet: true,
      fuel: true,
    })
    expect(setupDoneCount(steps)).toBe(7)
    expect(nextSetupStep(steps)).toBeNull()
  })

  it("expands the first not-done step", () => {
    expect(nextSetupStep(setupSteps(none))?.key).toBe("trucks")
    expect(nextSetupStep(setupSteps({ ...none, trucks: true }))?.key).toBe("drivers")
  })

  it("every step deep-links inside /hub with a verb-noun CTA", () => {
    for (const step of setupSteps(none)) {
      expect(step.href.startsWith("/hub")).toBe(true)
      expect(step.label.length).toBeGreaterThan(0)
      expect(step.why.length).toBeGreaterThan(0)
      expect(step.cta.length).toBeGreaterThan(0)
      expect(step.cta).not.toMatch(/submit/i)
    }
  })

  it("import steps keep the wizard deep-link contract", () => {
    const byKey = Object.fromEntries(setupSteps(none).map((s) => [s.key, s.href]))
    expect(byKey.trucks).toBe("/hub/import?kind=trucks")
    expect(byKey.drivers).toBe("/hub/import?kind=drivers")
    expect(byKey.customers).toBe("/hub/import?kind=customers")
    expect(byKey.loads).toBe("/hub/import?kind=loads")
    expect(byKey.fuel).toBe("/hub/import?kind=fuel")
    expect(byKey.packet).toBe("/hub/settings/packet")
  })
})
