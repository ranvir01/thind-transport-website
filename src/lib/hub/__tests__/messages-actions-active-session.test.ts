/**
 * Messaging actions called getHubUser() and nothing else, so the JWT-vs-DB
 * gap every other guard closes (session.ts:33-38) was wide open here: a fired
 * dispatcher or a suspended tenant kept reading and writing carrier threads
 * for the life of the token (~30 days). openThread, sendMessageAction and
 * markThreadReadAction must all re-check hub.users.active and
 * hub.carriers.status = 'active' on every request, carrier-scoped, BEFORE any
 * thread work happens.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/messages", () => ({
  ensureDirectThread: vi.fn(async () => "thread-1"),
  ensureLoadThread: vi.fn(async () => "thread-1"),
  getThread: vi.fn(async () => ({ id: "thread-1", kind: "direct", driver_id: "drv-1", load_id: null })),
  markThreadRead: vi.fn(async () => undefined),
  sendMessage: vi.fn(async () => ({ id: 1 })),
}))
vi.mock("@/lib/hub/documents", () => ({ saveDocument: vi.fn(async () => ({ id: "doc-1" })) }))
vi.mock("@/lib/hub/notify", () => ({
  notifyDriver: vi.fn(async () => undefined),
  notifyRoles: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/db", () => ({ queryOne: vi.fn(async () => null) }))

import { getHubUser } from "@/lib/hub/session"
import { queryOne } from "@/lib/hub/db"
import { ensureDirectThread, ensureLoadThread, markThreadRead, sendMessage } from "@/lib/hub/messages"
import { markThreadReadAction, openThread, sendMessageAction } from "@/app/hub/_actions/messages"

const getHubUserMock = vi.mocked(getHubUser)
const queryOneMock = vi.mocked(queryOne)
const sendMessageMock = vi.mocked(sendMessage)
const markThreadReadMock = vi.mocked(markThreadRead)
const ensureDirectThreadMock = vi.mocked(ensureDirectThread)
const ensureLoadThreadMock = vi.mocked(ensureLoadThread)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const DISPATCHER = { id: "u1", name: "Dee", email: "dee@dispatch.test", role: "dispatcher" as const, carrierId: CARRIER }

/** hub.users × hub.carriers state behind the session's JWT. */
function mockDbState(state: { userActive: boolean; carrierActive: boolean } | null) {
  queryOneMock.mockImplementation(async (sql: unknown) => {
    const text = String(sql)
    if (text.includes("carrier_active")) {
      return state ? { user_active: state.userActive, carrier_active: state.carrierActive } : null
    }
    if (text.includes("driver_id FROM hub.users")) return { driver_id: "drv-1" }
    return { id: "load-1" }
  })
}

function messageForm() {
  const form = new FormData()
  form.set("thread_id", "thread-1")
  form.set("body", "where are you?")
  return form
}

beforeEach(() => {
  vi.clearAllMocks()
  getHubUserMock.mockResolvedValue(DISPATCHER)
  mockDbState({ userActive: true, carrierActive: true })
})

describe("sendMessageAction active re-check", () => {
  it("refuses a deactivated user and never writes a message", async () => {
    mockDbState({ userActive: false, carrierActive: true })
    expect(await sendMessageAction(messageForm())).toEqual({ ok: false, error: "Account deactivated" })
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it("refuses a user of a suspended carrier and never writes a message", async () => {
    mockDbState({ userActive: true, carrierActive: false })
    expect(await sendMessageAction(messageForm())).toEqual({ ok: false, error: "Workspace suspended" })
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it("refuses a user whose row is gone entirely", async () => {
    mockDbState(null)
    expect(await sendMessageAction(messageForm())).toEqual({ ok: false, error: "Account deactivated" })
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it("still sends for an active user of an active carrier", async () => {
    const result = await sendMessageAction(messageForm())
    expect(result.ok).toBe(true)
    expect(sendMessageMock).toHaveBeenCalledTimes(1)
  })

  it("re-checks against the session's own carrier (tenant-scoped), joining carriers", async () => {
    await sendMessageAction(messageForm())
    const call = queryOneMock.mock.calls.find(([sql]) => String(sql).includes("carrier_active"))
    expect(call).toBeDefined()
    expect(String(call![0])).toContain("u.carrier_id = $2")
    expect(String(call![0])).toContain("JOIN hub.carriers c ON c.id = u.carrier_id")
    expect(call![1]).toEqual(["u1", CARRIER])
  })
})

describe("openThread active re-check", () => {
  it("refuses a deactivated driver before creating or finding a thread", async () => {
    getHubUserMock.mockResolvedValue({ ...DISPATCHER, role: "driver" as const })
    mockDbState({ userActive: false, carrierActive: true })
    expect(await openThread({ driverId: "drv-1" })).toEqual({ ok: false, error: "Account deactivated" })
    expect(ensureDirectThreadMock).not.toHaveBeenCalled()
  })

  it("refuses a suspended carrier before creating or finding a load thread", async () => {
    mockDbState({ userActive: true, carrierActive: false })
    expect(await openThread({ loadId: "load-1" })).toEqual({ ok: false, error: "Workspace suspended" })
    expect(ensureLoadThreadMock).not.toHaveBeenCalled()
  })

  it("opens the thread for an active user", async () => {
    expect(await openThread({ loadId: "load-1" })).toEqual({ ok: true, threadId: "thread-1" })
  })

  it("refuses platform_admin outright — no tenant scope, so no tenant threads", async () => {
    getHubUserMock.mockResolvedValue({ ...DISPATCHER, role: "platform_admin" as const, carrierId: "" })
    expect(await openThread({ driverId: "drv-1" })).toEqual({ ok: false, error: "Not signed in" })
    expect(queryOneMock).not.toHaveBeenCalled()
    expect(ensureDirectThreadMock).not.toHaveBeenCalled()
  })
})

describe("markThreadReadAction active re-check", () => {
  it("refuses a deactivated user without touching read receipts", async () => {
    mockDbState({ userActive: false, carrierActive: true })
    expect(await markThreadReadAction("thread-1")).toEqual({ ok: false, error: "Account deactivated" })
    expect(markThreadReadMock).not.toHaveBeenCalled()
  })

  it("marks read for an active user", async () => {
    expect(await markThreadReadAction("thread-1")).toEqual({ ok: true })
    expect(markThreadReadMock).toHaveBeenCalledWith("thread-1", "u1")
  })
})
