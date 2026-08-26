/**
 * Live adapters stay on CSV/mock while HAULDESK_MODE=simulation, even when
 * CREDENTIALS_KEY and a stored envelope exist.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { queryOne } from "../db"
import { encryptPayload, getCredentials, hasCredentials } from "../credentials"

const queryOneMock = vi.mocked(queryOne)
const ORIGINAL_MODE = process.env.HAULDESK_MODE
const ORIGINAL_KEY = process.env.CREDENTIALS_KEY
const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryOneMock.mockReset()
  process.env.CREDENTIALS_KEY = "a".repeat(32)
  process.env.HAULDESK_MODE = "simulation"
})

afterEach(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.HAULDESK_MODE
  else process.env.HAULDESK_MODE = ORIGINAL_MODE
  if (ORIGINAL_KEY === undefined) delete process.env.CREDENTIALS_KEY
  else process.env.CREDENTIALS_KEY = ORIGINAL_KEY
})

describe("simulation blocks live credentials", () => {
  it("getCredentials returns null without decrypting the stored envelope", async () => {
    queryOneMock.mockResolvedValue({ encrypted: encryptPayload({ apiKey: "sk-live-123" }) })
    expect(await getCredentials(CARRIER, "efs")).toBeNull()
    // liveIntegrationsAllowed short-circuits on env — never hits platform_state or the envelope.
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("hasCredentials reports disconnected so adapters stay on CSV fallback", async () => {
    queryOneMock.mockResolvedValue({ id: "row-1" })
    expect(await hasCredentials(CARRIER, "terminal")).toBe(false)
    expect(queryOneMock).not.toHaveBeenCalled()
  })
})
