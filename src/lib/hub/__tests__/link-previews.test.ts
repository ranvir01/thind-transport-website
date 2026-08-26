/**
 * Link-preview fixture invariants. The one that matters most: every id the
 * Toolbox (workbench.ts) or the integrations registry can render MUST have a
 * committed fixture — the preview cards render from this data alone, with no
 * runtime fetching, so a missing entry is a silently degraded card.
 */
import { describe, expect, it } from "vitest"
import { WORKBENCH_RESOURCES } from "../workbench"
import { PROVIDERS } from "../integrations/registry"
import {
  LINK_PREVIEWS,
  LINK_PREVIEW_ICONS,
  LINK_PREVIEW_TINTS,
  linkPreview,
} from "../link-previews"

describe("link-preview fixtures", () => {
  it("covers every workbench resource id", () => {
    for (const r of WORKBENCH_RESOURCES) {
      expect(LINK_PREVIEWS[r.id], `missing fixture for workbench resource "${r.id}"`).toBeTruthy()
    }
  })

  it("covers every integration provider id", () => {
    for (const p of PROVIDERS) {
      expect(LINK_PREVIEWS[p.id], `missing fixture for provider "${p.id}"`).toBeTruthy()
    }
  })

  it("keys match their entry ids", () => {
    for (const [key, entry] of Object.entries(LINK_PREVIEWS)) {
      expect(entry.id, `key "${key}" carries id "${entry.id}"`).toBe(key)
    }
  })

  it("every url is https:// or null — never http, never a bare path", () => {
    for (const entry of Object.values(LINK_PREVIEWS)) {
      if (entry.url === null) continue
      expect(entry.url.startsWith("https://"), `${entry.id}: ${entry.url}`).toBe(true)
    }
  })

  it("domains are bare hostnames — no protocol, no path, no port", () => {
    for (const entry of Object.values(LINK_PREVIEWS)) {
      expect(entry.domain.includes("://"), `${entry.id}: protocol in domain`).toBe(false)
      expect(entry.domain.includes("/"), `${entry.id}: path in domain`).toBe(false)
      expect(entry.domain.includes(":"), `${entry.id}: port in domain`).toBe(false)
      expect(entry.domain.includes(" "), `${entry.id}: whitespace in domain`).toBe(false)
    }
  })

  it("an empty domain means a null url (mailbox/factor style entries) and vice versa is allowed", () => {
    for (const entry of Object.values(LINK_PREVIEWS)) {
      if (entry.domain === "") {
        expect(entry.url, `${entry.id}: empty domain must not carry a url`).toBeNull()
      }
    }
  })

  it("titles and blurbs are non-empty", () => {
    for (const entry of Object.values(LINK_PREVIEWS)) {
      expect(entry.title.trim().length, `${entry.id}: empty title`).toBeGreaterThan(0)
      expect(entry.blurb.trim().length, `${entry.id}: empty blurb`).toBeGreaterThan(0)
    }
  })

  it("tint and icon values stay inside their unions", () => {
    const tints = new Set<string>(LINK_PREVIEW_TINTS)
    const icons = new Set<string>(LINK_PREVIEW_ICONS)
    for (const entry of Object.values(LINK_PREVIEWS)) {
      expect(tints.has(entry.tint), `${entry.id}: tint "${entry.tint}"`).toBe(true)
      expect(icons.has(entry.icon), `${entry.id}: icon "${entry.icon}"`).toBe(true)
    }
  })

  it("linkPreview() returns the entry for known ids and null for unknown ones", () => {
    expect(linkPreview("safer")).toBe(LINK_PREVIEWS.safer)
    expect(linkPreview("qbo")).toBe(LINK_PREVIEWS.qbo)
    expect(linkPreview("not-a-real-id")).toBeNull()
    expect(linkPreview("")).toBeNull()
  })
})
