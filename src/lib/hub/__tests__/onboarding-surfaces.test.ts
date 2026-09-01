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

describe("the first-run tour does not eat the e2e rig's first click", () => {
  /**
   * The autostarted tour is a real `fixed inset-0` modal whose scrim closes it
   * on click. Every smoke launches a fresh browser profile, so localStorage is
   * empty and the tour opens ~700ms after any landing on /hub — and the next
   * click anywhere is spent dismissing it instead of hitting its target. That
   * cost e2e-safety-smoke step 6 a long stretch of CI red that read as "the
   * OS&D notification never arrived" when the row was in the database all
   * along. e2e-lib.mjs pre-marks the tour seen; these assertions keep the two
   * copies of the key and the id from drifting apart, because if they drift
   * the suppression silently stops working and the reds come back looking like
   * product bugs again.
   */
  it("e2e-lib pre-marks the tour with the exact key and id HubTour reads", () => {
    const tour = read("src/components/hub/HubTour.tsx")
    const lib = read("scripts/e2e-lib.mjs")

    const storageKey = tour.match(/const STORAGE_KEY = "([^"]+)"/)?.[1]
    const autostartId = tour.match(/const AUTOSTART_TOUR_ID = "([^"]+)"/)?.[1]
    expect(storageKey).toBeTruthy()
    expect(autostartId).toBeTruthy()

    expect(lib).toContain(`const TOUR_STORAGE_KEY = "${storageKey}"`)
    expect(lib).toContain(`const AUTOSTART_TOUR_ID = "${autostartId}"`)
  })

  it("every smoke gets the suppression, because login() applies it", () => {
    const lib = read("scripts/e2e-lib.mjs")
    expect(lib).toMatch(/export async function skipFirstRunTour\(page\)/)
    // Inside login(), before the submit that lands on /hub.
    const login = lib.slice(lib.indexOf("export async function login("))
    expect(login.slice(0, login.indexOf("\n}"))).toContain("await skipFirstRunTour(page)")
  })
})
