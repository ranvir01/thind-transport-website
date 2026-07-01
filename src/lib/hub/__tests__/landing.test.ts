import { describe, expect, it } from "vitest"
import { hubLandingPath, hubRoleLabel } from "../landing"

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

describe("hubRoleLabel", () => {
  it("formats known roles for the login badge", () => {
    expect(hubRoleLabel("dispatcher")).toBe("Dispatcher")
    expect(hubRoleLabel("accountant")).toBe("Accountant")
  })
})
