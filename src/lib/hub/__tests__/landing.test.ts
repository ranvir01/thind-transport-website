import { describe, expect, it } from "vitest"
import { hubLandingPath, hubRoleLabel, postLoginPath, LEGACY_DRIVER_HOME } from "../landing"

describe("hubLandingPath (Phase 3 role redirects)", () => {
  it("sends office roles to their primary screens", () => {
    expect(hubLandingPath("owner")).toBe("/hub")
    expect(hubLandingPath("dispatcher")).toBe("/hub/loadboard")
    expect(hubLandingPath("accountant")).toBe("/hub/money")
  })

  it("sends non-office roles to their apps", () => {
    expect(hubLandingPath("driver")).toBe("/hub/driver")
    expect(hubLandingPath("broker")).toBe("/hub/portal")
    expect(hubLandingPath("platform_admin")).toBe("/hub/admin")
  })

  it("falls back to Today for unknown roles", () => {
    expect(hubLandingPath(null)).toBe("/hub")
    expect(hubLandingPath(undefined)).toBe("/hub")
  })
})

describe("postLoginPath (legacy driver-portal accounts)", () => {
  it("routes hub roles through hubLandingPath", () => {
    expect(postLoginPath({ role: "dispatcher" })).toBe("/hub/loadboard")
    expect(postLoginPath({ role: "driver" })).toBe("/hub/driver")
  })

  it("sends a signed-in user WITHOUT a hub role to the legacy driver portal", () => {
    expect(postLoginPath({ role: null })).toBe(LEGACY_DRIVER_HOME)
    expect(postLoginPath({})).toBe(LEGACY_DRIVER_HOME)
  })

  it("falls back to /hub when the session fetch failed (proxy routes by token)", () => {
    expect(postLoginPath(null)).toBe("/hub")
    expect(postLoginPath(undefined)).toBe("/hub")
  })
})

describe("hubRoleLabel", () => {
  it("formats known roles for the login badge", () => {
    expect(hubRoleLabel("dispatcher")).toBe("Dispatcher")
    expect(hubRoleLabel("accountant")).toBe("Accountant")
  })
})
