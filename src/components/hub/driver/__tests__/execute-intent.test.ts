import { describe, expect, it, vi } from "vitest"

import type { QueuedIntent } from "../offline-queue"

/**
 * executeIntent is OfflineSync's replay dispatch table, extracted so a
 * drifted intent → action mapping fails a fast unit test instead of surfacing
 * as a silently-wrong replay in the field (mirrors replayQueue's extraction).
 * Every server action is mocked — this only asserts *which* action gets
 * called and *what* it's called with for each intent kind.
 */
vi.mock("@/app/hub/_actions/driver", () => ({
  driverAdvanceStatus: vi.fn(async () => ({ ok: true })),
  driverStopTimestamp: vi.fn(async () => ({ ok: true })),
  driverAcknowledgeDispatch: vi.fn(async () => ({ ok: true })),
  driverAcknowledgeAnnouncement: vi.fn(async () => ({ ok: true })),
  driverUploadDocument: vi.fn(async () => ({ ok: true })),
  driverAddFacilityNote: vi.fn(async () => ({ ok: true })),
  driverRequestTimeOff: vi.fn(async () => ({ ok: true })),
  driverRequestAdvance: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@/app/hub/_actions/dvir", () => ({
  submitDvirAction: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@/app/hub/_actions/safety", () => ({
  fileDriverIncidentReport: vi.fn(async () => ({ ok: true })),
}))

const driverActions = await import("@/app/hub/_actions/driver")
const { submitDvirAction } = await import("@/app/hub/_actions/dvir")
const { fileDriverIncidentReport } = await import("@/app/hub/_actions/safety")
const { executeIntent } = await import("../execute-intent")

function baseIntent(overrides: Partial<QueuedIntent>): QueuedIntent {
  return { id: "x", queuedAt: 1, ...overrides } as QueuedIntent
}

describe("executeIntent", () => {
  it("dispatches status to driverAdvanceStatus with the load id", async () => {
    await executeIntent(baseIntent({ kind: "status", payload: { loadId: "L1" } }))
    expect(driverActions.driverAdvanceStatus).toHaveBeenCalledWith("L1")
  })

  it("dispatches stop to driverStopTimestamp with all four positional args, including the tap-time timestamp", async () => {
    await executeIntent(
      baseIntent({
        kind: "stop",
        payload: { stopId: "S1", loadId: "L1", field: "arrived_at", at: "2026-07-28T12:00:00.000Z" },
      })
    )
    expect(driverActions.driverStopTimestamp).toHaveBeenCalledWith(
      "S1", "L1", "arrived_at", "2026-07-28T12:00:00.000Z"
    )
  })

  it("dispatches ack to driverAcknowledgeDispatch with the load id", async () => {
    await executeIntent(baseIntent({ kind: "ack", payload: { loadId: "L2" } }))
    expect(driverActions.driverAcknowledgeDispatch).toHaveBeenCalledWith("L2")
  })

  it("dispatches announcement-ack with the announcement id and signature", async () => {
    await executeIntent(
      baseIntent({
        kind: "announcement-ack",
        payload: { announcementId: "A1", signature: "data:image/png;base64,abc" },
      })
    )
    expect(driverActions.driverAcknowledgeAnnouncement).toHaveBeenCalledWith("A1", "data:image/png;base64,abc")
  })

  it("dispatches dvir, incident, facility-note, time-off, and advance straight through as their input object", async () => {
    const dvirInput = { loadId: "L1" } as Parameters<typeof submitDvirAction>[0]
    await executeIntent(baseIntent({ kind: "dvir", payload: dvirInput }))
    expect(submitDvirAction).toHaveBeenCalledWith(dvirInput)

    const incidentInput = { loadId: "L1" } as Parameters<typeof fileDriverIncidentReport>[0]
    await executeIntent(baseIntent({ kind: "incident", payload: incidentInput }))
    expect(fileDriverIncidentReport).toHaveBeenCalledWith(incidentInput)

    const noteInput = { facilityId: "F1", body: "gate 4", tags: ["fast"] }
    await executeIntent(baseIntent({ kind: "facility-note", payload: noteInput }))
    expect(driverActions.driverAddFacilityNote).toHaveBeenCalledWith(noteInput)

    const timeOffInput = { startDate: "2026-08-01", endDate: "2026-08-03", kind: "vacation" }
    await executeIntent(baseIntent({ kind: "time-off", payload: timeOffInput }))
    expect(driverActions.driverRequestTimeOff).toHaveBeenCalledWith(timeOffInput)

    const advanceInput = { amount: "200" }
    await executeIntent(baseIntent({ kind: "advance", payload: advanceInput }))
    expect(driverActions.driverRequestAdvance).toHaveBeenCalledWith(advanceInput)
  })

  it("builds upload FormData with only the fields present on the payload", async () => {
    await executeIntent(
      baseIntent({
        kind: "upload",
        payload: { loadId: "L1", kind: "pod" },
      })
    )
    const formData = vi.mocked(driverActions.driverUploadDocument).mock.calls.at(-1)![0]
    expect(formData.get("load_id")).toBe("L1")
    expect(formData.get("kind")).toBe("pod")
    expect(formData.get("request_id")).toBeNull()
    expect(formData.get("osd")).toBeNull()
    expect(formData.get("amount")).toBeNull()
    expect(formData.get("file")).toBeNull()
  })

  it("includes request_id, osd, amount, and the file when the upload payload carries them", async () => {
    await executeIntent(
      baseIntent({
        kind: "upload",
        payload: { loadId: "L1", kind: "receipt", requestId: "R1", osd: 1, amount: "42.50" },
        file: { name: "receipt.jpg", type: "image/jpeg", buffer: new TextEncoder().encode("fake").buffer },
      })
    )
    const formData = vi.mocked(driverActions.driverUploadDocument).mock.calls.at(-1)![0]
    expect(formData.get("request_id")).toBe("R1")
    expect(formData.get("osd")).toBe("1")
    expect(formData.get("amount")).toBe("42.50")
    const file = formData.get("file") as File
    expect(file.name).toBe("receipt.jpg")
    expect(file.type).toBe("image/jpeg")
  })

  it("drops an intent kind no longer known to this app version instead of throwing", async () => {
    const result = await executeIntent(baseIntent({ kind: "future-kind" } as unknown as QueuedIntent))
    expect(result).toEqual({ ok: true })
  })
})
