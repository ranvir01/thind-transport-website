import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The push payload carries the recipient's unread total so the service worker
 * can set a numeric app-icon badge. These tests pin the two halves of that
 * contract: the count rides along (carrier-scoped), and a failed count never
 * blocks the push itself.
 */

const queryMock = vi.fn()
vi.mock("../db", () => ({
  query: (text: string, params: unknown[]) => queryMock(text, params),
}))

const sendNotification = vi.fn(async (..._args: unknown[]) => {})
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: (...args: unknown[]) => sendNotification(...args) },
}))

// VAPID keys must be present BEFORE the module loads: notify.ts caches
// ensureVapid()'s verdict in module state for the life of the process.
vi.stubEnv("VAPID_PUBLIC_KEY", "test-public-key")
vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key")
const { notifyUser } = await import("../notify")

const SUB_ROW = { id: "sub1", endpoint: "https://push.example/e1", p256dh: "p", auth: "a" }

function mockQueries({ unreadFails = false } = {}) {
  queryMock.mockImplementation(async (text: string) => {
    if (text.includes("INSERT INTO hub.notifications")) return []
    if (text.includes("FROM hub.push_subscriptions")) return [SUB_ROW]
    if (text.includes("COUNT(*)")) {
      if (unreadFails) throw new Error("db gone")
      return [{ count: "3" }]
    }
    return []
  })
}

function sentPayload(): Record<string, unknown> {
  expect(sendNotification).toHaveBeenCalledTimes(1)
  return JSON.parse(sendNotification.mock.calls[0][1] as string)
}

beforeEach(() => {
  queryMock.mockReset()
  sendNotification.mockClear()
})

describe("push payload unread badge", () => {
  it("carries the unread total alongside title/body/link", async () => {
    mockQueries()
    await notifyUser("carrier1", "user1", { kind: "test", title: "New dispatch", link: "/hub/loads/1" })
    expect(sentPayload()).toEqual({
      title: "New dispatch",
      body: "",
      link: "/hub/loads/1",
      unread: 3,
    })
  })

  it("counts unread scoped to both carrier and user", async () => {
    mockQueries()
    await notifyUser("carrier1", "user1", { kind: "test", title: "t" })
    const countCall = queryMock.mock.calls.find(([text]) => (text as string).includes("COUNT(*)"))
    expect(countCall).toBeDefined()
    expect(countCall?.[0]).toMatch(/carrier_id = \$1 AND user_id = \$2/)
    expect(countCall?.[1]).toEqual(["carrier1", "user1"])
  })

  it("still sends the push, without an unread key, when the count query fails", async () => {
    mockQueries({ unreadFails: true })
    await notifyUser("carrier1", "user1", { kind: "test", title: "t" })
    const payload = sentPayload()
    expect(payload.title).toBe("t")
    expect("unread" in payload).toBe(false)
  })
})
