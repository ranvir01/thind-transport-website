import { describe, expect, it } from "vitest"
import {
  isDeployMetaItem,
  isPickable,
  normalizeBullet,
  parseBacklogBullets,
  rankItem,
  splitCurrentAndOlder,
  topPickItem,
} from "../../scripts/collect-backlog.mjs"

type Item = { text: string; hash: string; subject: string; commitIndex: number }

const item = (text: string, commitIndex: number): Item => ({
  text,
  hash: "abc1234",
  subject: "test",
  commitIndex,
})

describe("parseBacklogBullets", () => {
  it("joins wrapped continuation lines into one bullet", () => {
    const bullets = parseBacklogBullets(
      "- first item that wraps\n  onto a second line\n- second item\n"
    )
    expect(bullets).toEqual(["first item that wraps onto a second line", "second item"])
  })
})

describe("normalizeBullet", () => {
  it("collapses case, whitespace, and trailing periods", () => {
    expect(normalizeBullet("npm audit 3 vulnerabilities — next pass.")).toBe(
      normalizeBullet("NPM audit 3  vulnerabilities — next pass")
    )
  })

  it("keeps genuinely different bullets distinct", () => {
    expect(normalizeBullet("fix dispatch board")).not.toBe(normalizeBullet("fix expenses page"))
  })
})

describe("splitCurrentAndOlder", () => {
  it("treats only the newest Backlog block as current", () => {
    const items = [
      item("still open item", 0),
      item("resolved long ago — 500s locally", 2),
    ]
    const { current, older } = splitCurrentAndOlder(items)
    expect(current.map((i: { text: string }) => i.text)).toEqual(["still open item"])
    expect(older.map((i: { text: string }) => i.text)).toEqual(["resolved long ago — 500s locally"])
  })
})

describe("topPickItem", () => {
  it("never picks an older-mention bullet when the newest Backlog has pickable work", () => {
    const current = [item("prune resolved bullets from ranking", 0)]
    const older = [item("driver-db-postgres 500s locally (already fixed)", 3)]
    const { pick, stale } = topPickItem(current, older)
    expect(pick?.text).toBe("prune resolved bullets from ranking")
    expect(stale).toBe(false)
  })

  it("skips owner-only and integrator-meta items in the current list", () => {
    const current = [
      item("Owner: approve nodemailer 9.x bump", 0),
      item("new tenants zero IFTA rates — owner call on seed-from-matrix UX.", 0),
      item("11 pending claude/* session branches — integrator absorbs one per :00 run.", 0),
      item("real product work", 0),
    ]
    const { pick } = topPickItem(current, [])
    expect(pick?.text).toBe("real product work")
  })

  it("skips Vercel owner-dashboard deploy blockers for the next pickable item", () => {
    const current = [
      item("[CRITICAL] Vercel auto-deploy from main stalled — owner dashboard check.", 0),
      item("Quote .env.example SMTP_FROM for bash source compatibility (lane-docs).", 0),
    ]
    const { pick } = topPickItem(current, [])
    expect(pick?.text).toContain("SMTP_FROM")
  })

  it("falls back to older mentions, flagged stale, when nothing current is pickable", () => {
    const current = [item("Owner: fleet config call", 0)]
    const older = [item("verify legacy portal login path", 1)]
    const { pick, stale } = topPickItem(current, older)
    expect(pick?.text).toBe("verify legacy portal login path")
    expect(stale).toBe(true)
  })

  it("returns null when nothing anywhere is pickable", () => {
    const current = [item("CATCH-UP MODE: integrator 4 commits ahead", 0)]
    const { pick } = topPickItem(current, [])
    expect(pick).toBeNull()
  })

  it("skips hyphenated AGENT_INTEROP tags that the prose owner-regex misses", () => {
    const smtp =
      "[needs-owner] rotate Gmail app password and repaste SMTP_USER/SMTP_PASS in Vercel Production"
    const browser = "[needs-browser] Confirm e2e-safety-smoke step 6 on a Chrome rig"
    const sidecars = "[needs-sidecars] regenerate the Rust golden fixtures to match ifta.test.ts"
    const blocked = "[blocked-by claude/lane-office] the token migration this depends on is unmerged there"
    expect(isPickable(item(smtp, 0))).toBe(false)
    expect(isPickable(item(browser, 0))).toBe(false)
    expect(isPickable(item(sidecars, 0))).toBe(false)
    expect(isPickable(item(blocked, 0))).toBe(false)

    const current = [
      item(smtp, 0),
      item(browser, 0),
      item("caniuse-lite is stale (cosmetic, lockfile-wide — own cycle)", 0),
    ]
    const { pick } = topPickItem(current, [])
    expect(pick?.text).toContain("caniuse-lite")
  })
})

describe("rankItem production regex", () => {
  it("does not treat a Vercel environment name as a production outage", () => {
    const smtp = "rotate Gmail app password and repaste SMTP_USER/SMTP_PASS in Vercel Production"
    const polish = rankItem("tweak button copy")
    expect(rankItem(smtp)).toBe(polish)
    expect(rankItem("login fail on deploy")).toBeLessThan(polish)
  })
})

describe("isDeployMetaItem", () => {
  it("flags session-branch and catch-up snapshots", () => {
    expect(isDeployMetaItem("11 pending claude/* session branches — integrator absorbs one per :00 run.")).toBe(true)
    expect(isDeployMetaItem("33 other pending claude/* branches — run npm run agent:branches.")).toBe(true)
    expect(isDeployMetaItem("Next merge: claude/lane-docs (mailbox IMAP scout docs).")).toBe(true)
    expect(isDeployMetaItem("Ops: Cursor Automations + Vercel creds.")).toBe(true)
    expect(isDeployMetaItem("CATCH-UP MODE: draining integrator")).toBe(true)
    expect(isDeployMetaItem("wire comdata cron sync")).toBe(false)
  })

  it("skips branch-inventory meta so TOP PICK falls through to shippable work", () => {
    const current = [
      item("[CRITICAL] Vercel auto-deploy from main stalled — owner dashboard check.", 0),
      item("new tenants zero IFTA rates — owner call on seed-from-matrix UX.", 0),
      item("33 other pending claude/* branches — run npm run agent:branches.", 0),
      item("Next merge: claude/lane-docs (mailbox IMAP scout docs).", 0),
      item("nodemailer 9.x — owner approval.", 0),
      item("Ops: Cursor Automations + Vercel creds.", 0),
    ]
    const older = [
      item(
        "e2e-driver-smoke.mjs needs reseed() so the suite is order-independent (lane-tests).",
        1
      ),
    ]
    const { pick, stale } = topPickItem(current, older)
    expect(pick?.text).toContain("e2e-driver-smoke")
    expect(stale).toBe(true)
  })
})
