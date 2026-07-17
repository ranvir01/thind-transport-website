import { describe, expect, it } from "vitest"
import { PUBLIC_LOAD_FLOW, publicLoadProgress } from "./LoadProgressBar"
import type { LoadStatus } from "@/lib/hub/types"

describe("publicLoadProgress", () => {
  it("maps each public stage to its own segment index", () => {
    PUBLIC_LOAD_FLOW.forEach((status, i) => {
      expect(publicLoadProgress(status).index).toBe(i)
    })
  })

  it("collapses money statuses to Delivered (never leaks internal labels)", () => {
    for (const status of ["pod_received", "invoiced", "paid", "settled"] as LoadStatus[]) {
      expect(publicLoadProgress(status)).toEqual({ label: "Delivered", index: PUBLIC_LOAD_FLOW.length - 1 })
    }
  })

  it("clamps unknown/pre-flow statuses to the first segment", () => {
    expect(publicLoadProgress("quoted" as LoadStatus).index).toBe(0)
  })
})
