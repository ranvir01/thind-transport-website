import { describe, expect, it } from "vitest"
import {
  ensureGithubIssue,
  findExactTitle,
  parseLabels,
} from "../../../scripts/ensure-github-issue.mjs"

type GhExec = (command: string, options?: { encoding?: string }) => string

describe("ensureGithubIssue", () => {
  it("splits comma-separated labels", () => {
    expect(parseLabels("should, venture:loadoff, needs-owner")).toEqual([
      "should",
      "venture:loadoff",
      "needs-owner",
    ])
  })

  it("matches issues by exact title only", () => {
    const issues = [
      { number: 1, title: "[fleet] E2E suite red", state: "OPEN" },
      { number: 2, title: "[fleet] E2E suite red — follow-up", state: "OPEN" },
    ]
    expect(findExactTitle(issues, "[fleet] E2E suite red")?.number).toBe(1)
    expect(findExactTitle(issues, "missing")).toBeNull()
  })

  it("creates when no exact title exists", () => {
    const calls: string[] = []
    const execFn: GhExec = (cmd) => {
      calls.push(cmd)
      if (cmd.startsWith("gh issue list")) return "[]"
      return "https://github.com/ranvir01/thind-transport-website/issues/4"
    }
    const result = ensureGithubIssue(
      {
        title: "[fleet] Integrator stalled",
        body: "stall",
        labels: ["should", "venture:loadoff"],
      },
      execFn
    )
    expect(result.action).toBe("created")
    expect(calls.some((c) => c.startsWith("gh label create"))).toBe(true)
    expect(calls.find((c) => c.startsWith("gh label create"))).toMatch(/"should"/)
    expect(calls.some((c) => c.startsWith("gh issue create"))).toBe(true)
    expect(calls.find((c) => c.startsWith("gh issue create"))).toMatch(/--label "should"/)
  })

  it("comments on an existing open issue (idempotent by title)", () => {
    const calls: string[] = []
    const execFn: GhExec = (cmd) => {
      calls.push(cmd)
      if (cmd.startsWith("gh issue list")) {
        return JSON.stringify([{ number: 7, title: "[fleet] E2E suite red", state: "OPEN" }])
      }
      return ""
    }
    const result = ensureGithubIssue(
      { title: "[fleet] E2E suite red", comment: "still red" },
      execFn
    )
    expect(result).toEqual({ action: "commented", number: 7 })
    expect(calls.some((c) => c.includes("gh issue comment 7"))).toBe(true)
    expect(calls.some((c) => c.startsWith("gh issue create"))).toBe(false)
  })

  it("reopens a closed issue before commenting", () => {
    const calls: string[] = []
    const execFn: GhExec = (cmd) => {
      calls.push(cmd)
      if (cmd.startsWith("gh issue list")) {
        return JSON.stringify([{ number: 8, title: "[fleet] Integrator stalled", state: "CLOSED" }])
      }
      return ""
    }
    ensureGithubIssue({ title: "[fleet] Integrator stalled", comment: "stalled again" }, execFn)
    expect(calls.some((c) => c.includes("gh issue reopen 8"))).toBe(true)
    expect(calls.some((c) => c.includes("gh issue comment 8"))).toBe(true)
  })
})
