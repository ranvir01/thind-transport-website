import { describe, expect, it } from "vitest"
import { APPLICANT_STAGES, ORIENTATION_TEMPLATE, STAGE_LABELS } from "../recruiting-shared"

describe("APPLICANT_STAGES", () => {
  it("has no duplicate stages", () => {
    expect(new Set(APPLICANT_STAGES).size).toBe(APPLICANT_STAGES.length)
  })

  it("starts at applied and ends at active (the kanban column order)", () => {
    expect(APPLICANT_STAGES[0]).toBe("applied")
    expect(APPLICANT_STAGES[APPLICANT_STAGES.length - 1]).toBe("active")
  })
})

describe("STAGE_LABELS", () => {
  it("labels every pipeline stage plus rejected", () => {
    for (const stage of [...APPLICANT_STAGES, "rejected"]) {
      expect(STAGE_LABELS[stage]).toBeTruthy()
    }
  })

  it("has no stray labels for stages that don't exist", () => {
    const known = new Set([...APPLICANT_STAGES, "rejected"])
    for (const key of Object.keys(STAGE_LABELS)) {
      expect(known.has(key as (typeof APPLICANT_STAGES)[number] | "rejected")).toBe(true)
    }
  })
})

describe("ORIENTATION_TEMPLATE", () => {
  it("gives every checklist item a unique key and non-empty label", () => {
    const keys = ORIENTATION_TEMPLATE.map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const item of ORIENTATION_TEMPLATE) {
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it("starts every item unchecked (the state a new applicant is inserted with)", () => {
    for (const item of ORIENTATION_TEMPLATE) {
      expect(item.done).toBe(false)
    }
  })
})
