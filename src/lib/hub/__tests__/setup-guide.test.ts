import { describe, expect, it } from "vitest"
import {
  OPERATIONS_PHASES,
  SETUP_CHECKLIST,
  type GettingStartedKeys,
} from "../setup-guide"

const VALID_PROGRESS_KEYS: GettingStartedKeys[] = ["trucks", "drivers", "customers", "loads", "packet", "fuel"]

const allSteps = OPERATIONS_PHASES.flatMap((p) => p.steps)

describe("guide steps", () => {
  it("gives every step a unique id", () => {
    const ids = allSteps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("stamps each step's phase field with its parent phase's number", () => {
    for (const phase of OPERATIONS_PHASES) {
      for (const step of phase.steps) {
        expect(step.phase).toBe(phase.number)
      }
    }
  })

  it("routes every step into the /hub app with non-empty guidance copy", () => {
    for (const step of allSteps) {
      expect(step.href.startsWith("/hub")).toBe(true)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.summary.length).toBeGreaterThan(0)
      expect(step.who.length).toBeGreaterThan(0)
      expect(step.cta.length).toBeGreaterThan(0)
    }
  })

  it("only uses progressKey values that a real getting-started key covers", () => {
    for (const step of allSteps) {
      if (step.progressKey !== undefined) {
        expect(VALID_PROGRESS_KEYS).toContain(step.progressKey)
      }
    }
  })
})

describe("OPERATIONS_PHASES", () => {
  it("numbers phases sequentially starting at 1, with no gaps or repeats", () => {
    const numbers = OPERATIONS_PHASES.map((p) => p.number)
    expect(numbers).toEqual(OPERATIONS_PHASES.map((_, i) => i + 1))
  })

  it("gives every phase a title, intro, and at least one step", () => {
    for (const phase of OPERATIONS_PHASES) {
      expect(phase.title.length).toBeGreaterThan(0)
      expect(phase.intro.length).toBeGreaterThan(0)
      expect(phase.steps.length).toBeGreaterThan(0)
    }
  })
})

describe("SETUP_CHECKLIST", () => {
  it("gives every entry a unique key", () => {
    const keys = SETUP_CHECKLIST.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("routes every entry into the /hub app with a label", () => {
    for (const item of SETUP_CHECKLIST) {
      expect(item.href.startsWith("/hub")).toBe(true)
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it("covers every progressKey used by a guide step, plus the smart_setup highlight", () => {
    const checklistKeys = new Set(SETUP_CHECKLIST.map((c) => c.key))
    const usedProgressKeys = new Set(allSteps.flatMap((s) => (s.progressKey ? [s.progressKey] : [])))
    for (const key of usedProgressKeys) {
      expect(checklistKeys).toContain(key)
    }
    expect(checklistKeys).toContain("smart_setup")
  })
})
