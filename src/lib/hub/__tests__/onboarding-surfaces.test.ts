/**
 * The three things that tell a new owner what to do next, and how each one
 * managed to be invisible.
 *
 * Every one of these existed and worked. None of them were reachable:
 *
 *  - the today-desk spotlight tour ran only from `?tour=`, a URL set by a link
 *    in the Help Center that a first-time owner has no reason to open
 *  - the setup checklist was X-dismissible into localStorage and then returned
 *    null forever, with nothing on Today mentioning setup again
 *  - the sandbox — a whole seeded practice carrier — was linked only from
 *    SandboxBanner, which renders once you are already inside it
 *
 * Built, shipped, unreachable. These assertions are about reachability rather
 * than behaviour, because reachability is what failed.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf-8")

describe("first-run guidance is reachable", () => {
  it("the Today tour starts itself, once", () => {
    const src = read("src/components/hub/HubTour.tsx")
    expect(src).toMatch(/const AUTOSTART_TOUR_ID = "today-desk"/)
    // Guarded on completion, or it reopens on every visit to Today forever.
    expect(src).toMatch(/if \(tourCompleted\(tour\.id\)\) return/)
    // An explicit ?tour= must still win over the auto-start.
    expect(src).toMatch(/if \(tourId\) return/)
    // Only on the tour's own start path; the steps spotlight Today's elements.
    expect(src).toMatch(/pathname !== tour\.startPath/)
  })

  it("the tour it starts still exists, and starts on Today", () => {
    // A rename in help.ts would silently switch the auto-start back off.
    const help = read("src/lib/hub/help.ts")
    expect(help).toMatch(/id: "today-desk"/)
    expect(help).toMatch(/startPath: "\/hub"/)
  })

  it("dismissing the setup checklist demotes it instead of deleting it", () => {
    const src = read("src/components/hub/SetupProgressCard.tsx")
    // The bug: `dismissed !== false` returned null for the dismissed case too,
    // so the X was permanent and /hub/guide was the only way back.
    expect(src).toMatch(/if \(dismissed === null \|\| !next\) return null/)
    expect(src).toMatch(/const restore = \(\) =>/)
    expect(src).toMatch(/localStorage\.removeItem\(DISMISS_KEY\)/)
    // The demoted state has to say what is left, or it is just a stray link.
    expect(src).toMatch(/Setup \{done\} of \{steps\.length\} — next: \{next\.label\}/)
  })

  it("Today offers the sandbox, gated on the kill switch and on not being in it", () => {
    const today = read("src/app/hub/(office)/page.tsx")
    expect(today).toMatch(/<SandboxInvite \/>/)
    // HUB_DEMO_LOGIN=false refuses every sandbox login, so the invite would
    // otherwise lead to a door that will not open.
    expect(today).toMatch(/demoLoginEnabled\(\) && !isSandboxCarrier\(user\.carrierId\)/)
  })

  it("the sandbox invite warns that a seat replaces your session", () => {
    // SeatPicker calls signIn(): it does not open a second session. Without
    // this line, an owner trying the sandbox concludes the app signed them out
    // of their own company.
    const src = read("src/components/hub/SandboxInvite.tsx")
    expect(src).toMatch(/href="\/hub\/sandbox"/)
    expect(src).toMatch(/swaps your session/)
    expect(read("src/app/hub/sandbox/SeatPicker.tsx")).toMatch(/signIn\("credentials"/)
  })

  it("/hub/sandbox stays reachable without a session", () => {
    // The picker signs you IN, so it cannot sit behind the sign-in gate.
    expect(read("src/proxy.ts")).toMatch(/pathname === "\/hub\/sandbox"/)
  })
})
