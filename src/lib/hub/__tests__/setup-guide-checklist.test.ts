/**
 * Welcome checklist wiring (src/lib/hub/setup-guide.ts) — the post-signup
 * onboarding surface. Pins: import steps deep-link the universal importer to
 * the right kind (a new carrier landing on the generic /hub/import and
 * importing fuel rows as loads is a real failure mode), every checklist key
 * is backed by gettingStartedState so no step can render permanently
 * unchecked, and showSetupChecklist keeps the Today panel up while any core
 * step is missing but never nags an operating carrier over optional history
 * imports (packet, fuel).
 */
import { describe, expect, it } from "vitest"
import {
  CORE_CHECKLIST_KEYS,
  OPERATIONS_PHASES,
  SETUP_CHECKLIST,
  showSetupChecklist,
  type GettingStartedKeys,
} from "../setup-guide"

const progress = (done: GettingStartedKeys[]): Record<GettingStartedKeys, boolean> => ({
  trucks: done.includes("trucks"),
  drivers: done.includes("drivers"),
  customers: done.includes("customers"),
  loads: done.includes("loads"),
  packet: done.includes("packet"),
  fuel: done.includes("fuel"),
})

describe("welcome checklist deep-links the universal importer per entity type", () => {
  it("load history goes straight to the loads importer", () => {
    const step = SETUP_CHECKLIST.find((s) => s.key === "loads")
    expect(step?.href).toBe("/hub/import?kind=loads")
  })

  it("fuel import goes straight to the fuel importer", () => {
    const step = SETUP_CHECKLIST.find((s) => s.key === "fuel")
    expect(step?.href).toBe("/hub/import?kind=fuel")
  })

  it("the guide's import-past-loads step deep-links the loads kind", () => {
    const step = OPERATIONS_PHASES.flatMap((p) => p.steps).find((s) => s.id === "import")
    expect(step?.href).toBe("/hub/import?kind=loads")
    expect(step?.progressKey).toBe("loads")
  })

  it("the guide's fuel step tracks the fuel progress key", () => {
    const step = OPERATIONS_PHASES.flatMap((p) => p.steps).find((s) => s.id === "fuel-ifta")
    expect(step?.progressKey).toBe("fuel")
  })

  it("every checklist entry maps to tracked progress (or the smart-setup rollup)", () => {
    const tracked = new Set<string>([...CORE_CHECKLIST_KEYS, "packet", "fuel", "smart_setup"])
    for (const step of SETUP_CHECKLIST) expect(tracked.has(step.key)).toBe(true)
  })
})

describe("showSetupChecklist — show while core is missing, never nag after", () => {
  it("shows for a brand-new tenant", () => {
    expect(showSetupChecklist(progress([]))).toBe(true)
  })

  it("shows while any core step is missing, even with optional steps done", () => {
    expect(showSetupChecklist(progress(["trucks", "drivers", "customers", "packet", "fuel"]))).toBe(true)
  })

  it("hides once core is done with only the packet left", () => {
    expect(showSetupChecklist(progress(["trucks", "drivers", "customers", "loads", "fuel"]))).toBe(false)
  })

  it("hides once core is done with only fuel history left", () => {
    expect(showSetupChecklist(progress(["trucks", "drivers", "customers", "loads", "packet"]))).toBe(false)
  })

  it("hides when everything is done", () => {
    expect(showSetupChecklist(progress(["trucks", "drivers", "customers", "loads", "packet", "fuel"]))).toBe(false)
  })

  it("hides when progress is unavailable", () => {
    expect(showSetupChecklist(null)).toBe(false)
  })
})
