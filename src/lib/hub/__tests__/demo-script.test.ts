import { describe, expect, it } from "vitest"
import { DEMO_DATA, DEMO_SCENES, demoRuntimeMs, demoScene } from "@/lib/hub/demo-script"

describe("demo script", () => {
  it("has unique scene ids and non-empty copy", () => {
    const ids = DEMO_SCENES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const scene of DEMO_SCENES) {
      expect(scene.title.length).toBeGreaterThan(0)
      expect(scene.caption.length).toBeGreaterThan(0)
    }
  })

  it("auto-advances every scene except the wrap", () => {
    for (const scene of DEMO_SCENES.slice(0, -1)) {
      expect(scene.durationMs).toBeGreaterThanOrEqual(4000)
      expect(scene.durationMs).toBeLessThanOrEqual(12000)
    }
    expect(DEMO_SCENES[DEMO_SCENES.length - 1].durationMs).toBe(0)
  })

  it("step reveals are ascending and fit inside the scene", () => {
    for (const scene of DEMO_SCENES) {
      for (let i = 1; i < scene.stepsMs.length; i++) {
        expect(scene.stepsMs[i]).toBeGreaterThan(scene.stepsMs[i - 1])
      }
      if (scene.durationMs > 0) {
        expect(scene.stepsMs[scene.stepsMs.length - 1]).toBeLessThan(scene.durationMs)
      }
    }
  })

  it("runs roughly ninety seconds and looks up scenes by id", () => {
    expect(demoRuntimeMs()).toBeGreaterThan(60_000)
    expect(demoRuntimeMs()).toBeLessThan(120_000)
    expect(demoScene("ratecon")?.title).toBe("Rate con")
    expect(demoScene("nope")).toBeNull()
  })

  it("keeps the fabricated money consistent", () => {
    expect(DEMO_DATA.linehaulCents + DEMO_DATA.detentionCents).toBe(300000)
    expect(DEMO_DATA.fuelGallonsFlagged).toBeGreaterThan(DEMO_DATA.tankCapacity)
  })
})
