import { describe, expect, it } from "vitest"
import { PUBLIC_FLOW, publicStatus } from "./LoadProgressBar"
import type { LoadStatus } from "@/lib/hub/types"

describe("publicStatus", () => {
  it("maps each public stage to its own segment index", () => {
    PUBLIC_FLOW.forEach((status, i) => {
      expect(publicStatus(status).index).toBe(i)
    })
  })

  it("collapses money statuses to Delivered (never leaks internal labels)", () => {
    for (const status of ["pod_received", "invoiced", "paid", "settled"] as LoadStatus[]) {
      expect(publicStatus(status)).toEqual({ label: "Delivered", index: PUBLIC_FLOW.length - 1 })
    }
  })

  it("clamps unknown/pre-flow statuses to the first segment", () => {
    expect(publicStatus("quoted" as LoadStatus).index).toBe(0)
  })
})
