import { describe, expect, it } from "vitest"
import { getTour, HELP_TOPICS, HUB_TOURS } from "../help"

describe("HELP_TOPICS", () => {
  it("gives every topic a unique id", () => {
    const ids = HELP_TOPICS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every topic a non-empty question and answer", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.question.length).toBeGreaterThan(0)
      expect(topic.answer.length).toBeGreaterThan(0)
    }
  })

  it("routes every href into the /hub app, and pairs href with hrefLabel", () => {
    for (const topic of HELP_TOPICS) {
      if (topic.href !== undefined) {
        expect(topic.href.startsWith("/hub")).toBe(true)
        expect(topic.hrefLabel).toBeTruthy()
      } else {
        expect(topic.hrefLabel).toBeUndefined()
      }
    }
  })
})

describe("HUB_TOURS", () => {
  it("gives every tour a unique id", () => {
    const ids = HUB_TOURS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every tour a title, summary, /hub startPath, and at least one step", () => {
    for (const tour of HUB_TOURS) {
      expect(tour.title.length).toBeGreaterThan(0)
      expect(tour.summary.length).toBeGreaterThan(0)
      expect(tour.startPath.startsWith("/hub")).toBe(true)
      expect(tour.steps.length).toBeGreaterThan(0)
    }
  })

  it("gives every step a unique id within its tour and non-empty title/body", () => {
    for (const tour of HUB_TOURS) {
      const stepIds = tour.steps.map((s) => s.id)
      expect(new Set(stepIds).size).toBe(stepIds.length)
      for (const step of tour.steps) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.body.length).toBeGreaterThan(0)
      }
    }
  })

  it("only uses non-empty CSS selectors for spotlight targets", () => {
    for (const tour of HUB_TOURS) {
      for (const step of tour.steps) {
        if (step.target !== undefined) {
          expect(step.target.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe("getTour", () => {
  it("returns the matching tour for a known id", () => {
    const tour = getTour("today-desk")
    expect(tour).toBeDefined()
    expect(tour?.id).toBe("today-desk")
  })

  it("returns undefined for an unknown id", () => {
    expect(getTour("does-not-exist")).toBeUndefined()
  })
})
