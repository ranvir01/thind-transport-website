/**
 * The hourly production smoke reported green for seven straight days while the
 * daily `compliance-scan` cron 500'd on every single run (Gmail rejecting the
 * SMTP app password, all five carriers, 2026-08-07 → 08-13). Nobody saw it: the
 * route's console.error and 500 land in Vercel's log drain and cron dashboard,
 * and the fleet has no human reading either. A week of unsent CDL / medical-card
 * / insurance expiry alerts is what "200 OK means healthy" actually bought.
 *
 * evaluateCronHealth is the verdict that would have caught it on the first
 * night. Pure so it can be pinned here without prod; the fetch plumbing lives
 * in the caller.
 */
import { describe, expect, it } from "vitest"
import { evaluateCronHealth } from "../../../../scripts/prod-smoke.mjs"

const healthy = (source: string) => ({ source, failing: 0, total: 5, sample_error: null })

describe("evaluateCronHealth", () => {
  it("passes when every cron's last run succeeded for every carrier", () => {
    const v = evaluateCronHealth([healthy("cron:compliance-scan"), healthy("cron:efs-sync")])
    expect(v.pass).toBe(true)
    expect(v.detail).toContain("2 cron(s)")
  })

  it("fails the real 2026-08-13 outage and names the job and the SMTP cause", () => {
    const v = evaluateCronHealth([
      healthy("cron:efs-sync"),
      {
        source: "cron:compliance-scan",
        failing: 5,
        total: 5,
        sample_error:
          "Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to\n535 5.7.8 https://support.google.com/mail/?p=BadCredentials",
      },
    ])
    expect(v.pass).toBe(false)
    expect(v.detail).toContain("cron:compliance-scan: 5/5 carrier run(s) failed")
    expect(v.detail).toContain("535-5.7.8")
    // Only the first line of the SMTP error — the rest is a support URL that
    // would swamp the one-line smoke output.
    expect(v.detail).not.toContain("support.google.com")
  })

  it("fails when a single tenant is broken and the others are fine", () => {
    // The per-source aggregate takes the latest run PER CARRIER precisely so
    // one failing tenant cannot hide behind four healthy ones.
    const v = evaluateCronHealth([
      { source: "cron:qbo-sync", failing: 1, total: 5, sample_error: "QBO token expired" },
    ])
    expect(v.pass).toBe(false)
    expect(v.detail).toContain("1/5")
  })

  it("reports every broken cron, not just the first", () => {
    const v = evaluateCronHealth([
      { source: "cron:compliance-scan", failing: 5, total: 5, sample_error: "Invalid login" },
      { source: "cron:owner-digest", failing: 5, total: 5, sample_error: "Invalid login" },
    ])
    expect(v.detail).toContain("cron:compliance-scan")
    expect(v.detail).toContain("cron:owner-digest")
  })

  it("treats an empty history as healthy — a fresh database has run nothing yet", () => {
    const v = evaluateCronHealth([])
    expect(v.pass).toBe(true)
  })

  it("fails loudly when the endpoint returns no crons array at all", () => {
    // A route that starts answering 200-with-HTML (auth redirect, rewrite) must
    // not read as "all crons healthy".
    for (const bad of [null, undefined, "crons"]) {
      const v = evaluateCronHealth(bad as never)
      expect(v.pass).toBe(false)
      expect(v.malformed).toBe(true)
    }
  })

  it("tolerates counts arriving as strings from the JSON payload", () => {
    // Postgres bigints serialize as strings through some drivers; the route
    // casts to ::int, but the verdict must not silently pass if that changes.
    const v = evaluateCronHealth([
      { source: "cron:compliance-scan", failing: "5", total: "5", sample_error: null } as never,
    ])
    expect(v.pass).toBe(false)
  })
})
