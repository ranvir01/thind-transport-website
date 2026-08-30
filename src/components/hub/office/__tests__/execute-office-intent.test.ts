import { describe, expect, it, vi } from "vitest"

import type { OfficeQueuedIntent } from "../offline-queue"

/**
 * executeOfficeIntent is the office replay dispatch table (mirror of the
 * driver one) — this only asserts *which* action gets called and *what*
 * it's called with for each intent kind, with every server action mocked.
 */
vi.mock("@/app/hub/_actions/loads", () => ({
  advanceLoadStatusAction: vi.fn(async () => ({ ok: true })),
  logCheckCallAction: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@/app/hub/_actions/tasks", () => ({
  completeTaskAction: vi.fn(async () => ({ ok: true })),
  toggleChecklistAction: vi.fn(async () => ({ ok: true })),
}))

const loads = await import("@/app/hub/_actions/loads")
const tasks = await import("@/app/hub/_actions/tasks")
const { executeOfficeIntent } = await import("../execute-office-intent")

function intent(overrides: Partial<OfficeQueuedIntent>): OfficeQueuedIntent {
  return { id: "x", queuedAt: 1, ...overrides } as OfficeQueuedIntent
}

describe("executeOfficeIntent", () => {
  it("dispatches advance-status with the load id", async () => {
    await executeOfficeIntent(intent({ kind: "advance-status", payload: { loadId: "L1" } }))
    expect(loads.advanceLoadStatusAction).toHaveBeenCalledWith("L1")
  })

  it("dispatches check-call with load id and note, in that order", async () => {
    await executeOfficeIntent(intent({ kind: "check-call", payload: { loadId: "L2", note: "driver at gate" } }))
    expect(loads.logCheckCallAction).toHaveBeenCalledWith("L2", "driver at gate")
  })

  it("dispatches task-complete with the task id", async () => {
    await executeOfficeIntent(intent({ kind: "task-complete", payload: { taskId: "T1" } }))
    expect(tasks.completeTaskAction).toHaveBeenCalledWith("T1")
  })

  it("dispatches task-checklist with id, index, done positionally", async () => {
    await executeOfficeIntent(intent({ kind: "task-checklist", payload: { taskId: "T2", index: 3, done: true } }))
    expect(tasks.toggleChecklistAction).toHaveBeenCalledWith("T2", 3, true)
  })

  it("drops unknown kinds as ok so a future build's rows can't jam the queue", async () => {
    const result = await executeOfficeIntent(
      intent({ kind: "from-the-future" as OfficeQueuedIntent["kind"], payload: { loadId: "L9" } })
    )
    expect(result).toEqual({ ok: true })
    expect(loads.advanceLoadStatusAction).toHaveBeenCalledTimes(1) // only the earlier test's call
  })

  it("surfaces a server rejection unchanged — replay must count it as failed", async () => {
    vi.mocked(loads.advanceLoadStatusAction).mockResolvedValueOnce({ ok: false, error: "No permission" })
    const result = await executeOfficeIntent(intent({ kind: "advance-status", payload: { loadId: "L3" } }))
    expect(result).toEqual({ ok: false, error: "No permission" })
  })
})
