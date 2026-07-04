/**
 * canCancelLoad is the gate CancelLoadButton shows AND the server enforces
 * (setLoadStatusAction is cancel-only and refuses locked statuses). Once
 * delivery/money work starts, cancellation is an accounting decision.
 */
import { describe, expect, it } from "vitest"
import { CANCEL_LOCKED_STATUSES, LOAD_STATUSES, canCancelLoad } from "../types"

describe("canCancelLoad", () => {
  it("allows cancel from every pre-delivery status", () => {
    for (const status of ["quoted", "booked", "dispatched", "at_pickup", "in_transit"] as const) {
      expect(canCancelLoad(status)).toBe(true)
    }
  })

  it("locks cancel once delivery or money work starts", () => {
    for (const status of ["delivered", "pod_received", "invoiced", "paid", "settled", "cancelled"] as const) {
      expect(canCancelLoad(status)).toBe(false)
    }
  })

  it("partitions the full lifecycle — no status is unaccounted for", () => {
    const cancellable = LOAD_STATUSES.filter((s) => canCancelLoad(s))
    expect(cancellable.length + CANCEL_LOCKED_STATUSES.length).toBe(LOAD_STATUSES.length)
  })
})
