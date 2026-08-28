import { describe, expect, it } from "vitest"
import { buildDigestBody } from "../../../scripts/portfolio-digest.mjs"

describe("buildDigestBody", () => {
  it("groups should-issues by venture label and lists needs-owner separately", () => {
    const body = buildDigestBody({
      shouldIssues: [
        {
          number: 11,
          title: "shared COMMITTED_STATUSES",
          labels: [{ name: "should" }, { name: "venture:loadoff" }],
        },
        { number: 12, title: "unlabeled polish", labels: [{ name: "should" }] },
      ],
      ownerIssues: [
        {
          number: 4,
          title: "open AR Payments bank",
          labels: [{ name: "needs-owner" }, { name: "venture:ar-payments" }],
        },
      ],
      generatedAt: "2026-08-28T20:41:00.000Z",
      fleetSnippet: "Claude Corps is 9 tasks",
    })
    expect(body).toContain("### venture:loadoff")
    expect(body).toContain("#11 shared COMMITTED_STATUSES")
    expect(body).toContain("### venture:unlabeled")
    expect(body).toContain("#12 unlabeled polish")
    expect(body).toContain("#4 open AR Payments bank")
    expect(body).toContain("Claude Corps is 9 tasks")
  })
})
