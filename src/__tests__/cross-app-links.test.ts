/**
 * Marketing → /hub links must be plain `<a>`, never `next/link`.
 *
 * The failure this guards is invisible in code review and invisible in a
 * desktop browser. It only shows up on an iPhone, at the last step of the one
 * flow that matters: Add to Home Screen offers "Thind Transport →
 * thindtransport.com" instead of "LoadOff → /hub", because a `next/link` soft
 * navigation never makes Safari re-parse the manifest. Full reasoning in
 * src/lib/cross-app-link.ts.
 *
 * Anyone adding a LoadOff call-to-action will reach for `<Link>` by reflex —
 * it is the house style everywhere else in this app. This test is the thing
 * that catches it.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve, relative } from "node:path"

const SRC = resolve(__dirname, "..")

/** Files under these paths are already inside the app; soft nav is correct there. */
const INSIDE_THE_APP = ["app/hub", "components/hub"]

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full))
    else if (entry.endsWith(".tsx")) out.push(full)
  }
  return out
}

/**
 * A `<Link ... href="/hub...">` anywhere in the file. Deliberately tolerant of
 * attributes and newlines between the tag name and href, because the real
 * regression will be a prettier-formatted multi-line JSX element.
 */
const LINK_TO_HUB = /<Link\b[^>]*?href=\{?["'`]\/hub/s

describe("cross-app links force a full page load", () => {
  const offending = tsxFiles(SRC)
    .filter((f) => {
      const rel = relative(SRC, f).replace(/\\/g, "/")
      return !INSIDE_THE_APP.some((p) => rel.startsWith(p))
    })
    .filter((f) => LINK_TO_HUB.test(readFileSync(f, "utf8")))
    .map((f) => relative(SRC, f))

  it("scans a real tree", () => {
    expect(tsxFiles(SRC).length).toBeGreaterThan(100)
  })

  it("no marketing component uses next/link to reach /hub", () => {
    expect(
      offending,
      `These files soft-navigate into the app:\n  ${offending.join("\n  ")}\n\n` +
        `Use <a href="/hub..."> instead of <Link href="/hub...">.\n` +
        `A next/link navigation does not reload the document, so iOS Safari keeps ` +
        `the marketing manifest and "Add to Home Screen" saves the WEBSITE ` +
        `(name "Thind Transport", start_url "/") instead of the app. ` +
        `See src/lib/cross-app-link.ts.`
    ).toEqual([])
  })

  it("the two products really do declare different manifests", () => {
    // If this ever stops being true the whole hazard disappears and this test
    // can go. Until then it is the reason the rule exists.
    const root = readFileSync(join(SRC, "app/layout.tsx"), "utf8")
    const hub = readFileSync(join(SRC, "app/hub/layout.tsx"), "utf8")
    expect(root).toContain("/site.webmanifest")
    expect(hub).toContain("/api/hub/manifest")
  })
})
