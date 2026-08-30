import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Shortcuts on the LIVE manifest (/api/hub/manifest). The static
 * public/hub.webmanifest grew shortcuts first, then the per-tenant route
 * replaced it and silently dropped them — a manifest typo breaks install
 * surfaces with no build error, so this suite pins the served JSON: valid
 * shortcut URLs inside the app scope, icons that actually ship, and the
 * role branch (a driver's icon must not offer a dispatch board their
 * account can't open).
 */

vi.mock("../session", () => ({ getHubUser: vi.fn() }))
vi.mock("../settings", () => ({ getCarrierSettings: vi.fn() }))

import { getHubUser } from "../session"
import { getCarrierSettings } from "../settings"
import { buildManifest, DRIVER_SHORTCUTS, OFFICE_SHORTCUTS } from "@/app/api/hub/manifest/route"

const getHubUserMock = vi.mocked(getHubUser)
const getCarrierSettingsMock = vi.mocked(getCarrierSettings)
const publicDir = join(process.cwd(), "public")

function sessionUser(role: string) {
  return {
    id: "u1",
    name: "Maya",
    email: "m@a.com",
    role,
    carrierId: "11111111-1111-1111-1111-111111111111",
  }
}

beforeEach(() => {
  getHubUserMock.mockReset()
  getCarrierSettingsMock.mockReset()
  getCarrierSettingsMock.mockResolvedValue({
    branding: { accent: null },
  } as Awaited<ReturnType<typeof getCarrierSettings>>)
})

describe("live manifest shortcuts", () => {
  it("a signed-out install still gets shortcuts, all inside the app", async () => {
    getHubUserMock.mockResolvedValue(null)
    const m = await buildManifest()
    expect(m.display).toBe("standalone")
    expect(m.shortcuts.length).toBeGreaterThanOrEqual(3)
    for (const s of m.shortcuts) {
      expect(s.url.startsWith("/hub"), `${s.name} leaves scope: ${s.url}`).toBe(true)
      expect(s.name.length, `${s.name} truncates on Android`).toBeLessThanOrEqual(25)
    }
  })

  it("ships every icon the manifest references", async () => {
    getHubUserMock.mockResolvedValue(null)
    const m = await buildManifest()
    const icons = [...m.icons, ...m.shortcuts.flatMap((s) => s.icons ?? [])]
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(existsSync(join(publicDir, icon.src)), `missing ${icon.src}`).toBe(true)
    }
  })

  it("office roles get the office set: dispatch and money one press away", async () => {
    getHubUserMock.mockResolvedValue(sessionUser("dispatcher"))
    const urls = (await buildManifest()).shortcuts.map((s) => s.url)
    expect(urls).toContain("/hub/dispatch")
    expect(urls).toContain("/hub/money")
  })

  it("drivers get driver shortcuts only — no office screens on their icon", async () => {
    getHubUserMock.mockResolvedValue(sessionUser("driver"))
    const urls = (await buildManifest()).shortcuts.map((s) => s.url)
    expect(urls.length).toBeGreaterThanOrEqual(2)
    for (const url of urls) {
      expect(url.startsWith("/hub/driver"), `office url on driver icon: ${url}`).toBe(true)
    }
  })

  it("both shortcut tables stay well-formed", () => {
    for (const s of [...OFFICE_SHORTCUTS, ...DRIVER_SHORTCUTS]) {
      expect(s.url.startsWith("/hub")).toBe(true)
      expect(s.name.length).toBeLessThanOrEqual(25)
      expect(s.icons?.length).toBeGreaterThan(0)
    }
  })
})

describe("static fallback manifest (public/hub.webmanifest)", () => {
  // Nothing links it any more, but it still ships as the documented fallback —
  // keep it honest while it exists.
  const manifest = JSON.parse(readFileSync(join(publicDir, "hub.webmanifest"), "utf8"))

  it("keeps start_url and scope on the hub with shipped icons", () => {
    expect(manifest.scope).toBe("/hub")
    expect(manifest.start_url.startsWith("/hub")).toBe(true)
    for (const icon of manifest.icons) {
      expect(existsSync(join(publicDir, icon.src)), `missing ${icon.src}`).toBe(true)
    }
  })
})
