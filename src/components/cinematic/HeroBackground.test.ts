import { describe, expect, it } from "vitest"
import { shouldLoadHeroVideo } from "./HeroBackground"

/**
 * The hero MP4 is ~3MB; drivers apply from phones on weak LTE. The video is
 * a desktop/tablet enhancement — phones keep the 44KB poster (regression
 * guard for the mobile load-speed fix; see responsive-performance skill).
 */
describe("shouldLoadHeroVideo", () => {
  it("skips the 3MB video on phone viewports (390px)", () => {
    expect(shouldLoadHeroVideo({ viewportWidth: 390, saveData: false, reducedMotion: false })).toBe(false)
  })

  it("loads on tablet-and-up viewports", () => {
    expect(shouldLoadHeroVideo({ viewportWidth: 768, saveData: false, reducedMotion: false })).toBe(true)
    expect(shouldLoadHeroVideo({ viewportWidth: 1440, saveData: false, reducedMotion: false })).toBe(true)
  })

  it("respects Save-Data even on desktop", () => {
    expect(shouldLoadHeroVideo({ viewportWidth: 1440, saveData: true, reducedMotion: false })).toBe(false)
  })

  it("respects prefers-reduced-motion even on desktop", () => {
    expect(shouldLoadHeroVideo({ viewportWidth: 1440, saveData: false, reducedMotion: true })).toBe(false)
  })

  it("stays on the poster just below the tablet breakpoint", () => {
    expect(shouldLoadHeroVideo({ viewportWidth: 767, saveData: false, reducedMotion: false })).toBe(false)
  })
})
