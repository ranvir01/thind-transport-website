import { describe, expect, it, vi } from "vitest"
import { actionError, actionErrorMessage, isInternalActionError } from "../action-error"

describe("isInternalActionError", () => {
  it("flags Postgres and infrastructure messages", () => {
    expect(isInternalActionError('duplicate key value violates unique constraint "hub_invoices_pkey"')).toBe(true)
    expect(isInternalActionError("insert or update on table violates foreign key constraint")).toBe(true)
    expect(isInternalActionError("relation hub.loads does not exist")).toBe(true)
    expect(isInternalActionError("fetch failed")).toBe(true)
    expect(isInternalActionError("POSTGRES_URL is not set — the Hub requires a Postgres database")).toBe(true)
  })

  it("allows intentional business and permission messages", () => {
    expect(isInternalActionError("Forbidden: dispatcher cannot money:write")).toBe(false)
    expect(isInternalActionError("Not signed in")).toBe(false)
    expect(isInternalActionError("Load not found")).toBe(false)
    expect(isInternalActionError("Already invoiced as INV-1001")).toBe(false)
    expect(isInternalActionError("Invoice total mismatch — aborted")).toBe(false)
    expect(isInternalActionError("dat is not connected")).toBe(false)
  })
})

describe("actionErrorMessage", () => {
  it("returns fallback for internal errors and logs", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error('duplicate key value violates unique constraint "hub_invoices_pkey"')
    expect(actionErrorMessage(err, "Failed to create invoice")).toBe("Failed to create invoice")
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("returns the message for user-facing errors", () => {
    const err = new Error("Load has no customer")
    expect(actionErrorMessage(err, "Failed to create invoice")).toBe("Load has no customer")
  })

  it("returns fallback for non-Error throws", () => {
    expect(actionErrorMessage("boom", "Failed to record payment")).toBe("Failed to record payment")
  })
})

describe("actionError", () => {
  it("wraps actionErrorMessage in ActionResult shape", () => {
    expect(actionError(new Error("Settlement not found"), "Failed to approve settlement")).toEqual({
      ok: false,
      error: "Settlement not found",
    })
  })
})
