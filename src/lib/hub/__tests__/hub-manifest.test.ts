import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The webmanifest is what makes the hub installable — a typo here silently
 * breaks install prompts on every phone, with no build error. Keep it honest:
 * valid JSON, every referenced icon actually shipped, every URL inside the
 * /hub scope (out-of-scope shortcut URLs open a browser tab, not the app).
 */
const publicDir = join(process.cwd(), "public")
const manifest = JSON.parse(readFileSync(join(publicDir, "hub.webmanifest"), "utf8"))

describe("hub.webmanifest", () => {
  it("keeps start_url and scope on the hub", () => {
    expect(manifest.scope).toBe("/hub")
    expect(manifest.start_url.startsWith("/hub")).toBe(true)
    expect(manifest.display).toBe("standalone")
  })

  it("ships every icon it references", () => {
    const icons = [
      ...manifest.icons,
      ...(manifest.shortcuts ?? []).flatMap((s: { icons?: { src: string }[] }) => s.icons ?? []),
    ]
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(existsSync(join(publicDir, icon.src)), `missing ${icon.src}`).toBe(true)
    }
  })

  it("keeps every shortcut inside the app scope", () => {
    expect(manifest.shortcuts?.length).toBeGreaterThanOrEqual(3)
    for (const s of manifest.shortcuts) {
      expect(s.url.startsWith("/hub"), `${s.name} leaves scope: ${s.url}`).toBe(true)
      expect(s.name.length).toBeLessThanOrEqual(25) // Android truncates long names
    }
  })
})
