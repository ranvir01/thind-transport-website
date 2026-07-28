/**
 * credentials.ts — encrypt/decrypt round trip, tamper detection, and the
 * credentialsConfigured() gate that keeps every adapter on the CSV path
 * until CREDENTIALS_KEY is set. No other test in this repo exercises this
 * file directly (save-integration-credentials-action.test.ts mocks it out).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))

import { query, queryOne } from "../db"
import {
  credentialsConfigured,
  decryptPayload,
  deleteCredentials,
  encryptPayload,
  getCredentials,
  hasCredentials,
  saveCredentials,
} from "../credentials"

const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const CARRIER = "11111111-1111-1111-1111-111111111111"
const ORIGINAL_KEY = process.env.CREDENTIALS_KEY

beforeEach(() => {
  queryMock.mockReset().mockResolvedValue([])
  queryOneMock.mockReset().mockResolvedValue(null)
  process.env.CREDENTIALS_KEY = "a".repeat(32)
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.CREDENTIALS_KEY
  else process.env.CREDENTIALS_KEY = ORIGINAL_KEY
})

describe("credentialsConfigured", () => {
  it("is false when CREDENTIALS_KEY is unset", () => {
    delete process.env.CREDENTIALS_KEY
    expect(credentialsConfigured()).toBe(false)
  })

  it("is false when CREDENTIALS_KEY is shorter than 16 chars", () => {
    process.env.CREDENTIALS_KEY = "short"
    expect(credentialsConfigured()).toBe(false)
  })

  it("is true once CREDENTIALS_KEY reaches 16 chars", () => {
    process.env.CREDENTIALS_KEY = "sixteen-char-key"
    expect(credentialsConfigured()).toBe(true)
  })
})

describe("encryptPayload / decryptPayload", () => {
  it("round-trips an arbitrary credential payload", () => {
    const payload = { apiKey: "sk-live-123", webhookSecret: "whsec_abc", note: "" }
    const envelope = encryptPayload(payload)
    expect(decryptPayload(envelope)).toEqual(payload)
  })

  it("produces a fresh IV (and ciphertext) on every call, even for the same payload", () => {
    const payload = { apiKey: "sk-live-123" }
    const first = encryptPayload(payload)
    const second = encryptPayload(payload)
    expect(first).not.toBe(second)
    expect(decryptPayload(first)).toEqual(payload)
    expect(decryptPayload(second)).toEqual(payload)
  })

  it("throws when the ciphertext is tampered with (GCM auth tag mismatch)", () => {
    const envelope = encryptPayload({ apiKey: "sk-live-123" })
    const [iv, tag, data] = envelope.split(":")
    const tamperedByte = Buffer.from(data, "base64")
    tamperedByte[0] = tamperedByte[0] ^ 0xff
    const tampered = `${iv}:${tag}:${tamperedByte.toString("base64")}`
    expect(() => decryptPayload(tampered)).toThrow()
  })

  it("throws when the auth tag itself is tampered with", () => {
    const envelope = encryptPayload({ apiKey: "sk-live-123" })
    const [iv, tag, data] = envelope.split(":")
    const tamperedTag = Buffer.from(tag, "base64")
    tamperedTag[0] = tamperedTag[0] ^ 0xff
    const tampered = `${iv}:${tamperedTag.toString("base64")}:${data}`
    expect(() => decryptPayload(tampered)).toThrow()
  })
})

describe("getCredentials", () => {
  it("returns null without querying the db when credentialsConfigured() is false", async () => {
    delete process.env.CREDENTIALS_KEY
    const result = await getCredentials(CARRIER, "efs")
    expect(result).toBeNull()
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("returns null when no row exists for the carrier/provider pair", async () => {
    queryOneMock.mockResolvedValue(null)
    const result = await getCredentials(CARRIER, "efs")
    expect(result).toBeNull()
  })

  it("decrypts and returns the stored payload", async () => {
    const envelope = encryptPayload({ apiKey: "sk-live-123" })
    queryOneMock.mockResolvedValue({ encrypted: envelope })
    const result = await getCredentials(CARRIER, "efs")
    expect(result).toEqual({ apiKey: "sk-live-123" })
  })

  it("returns null instead of throwing when the stored envelope was encrypted with a different key", async () => {
    const envelope = encryptPayload({ apiKey: "sk-live-123" })
    queryOneMock.mockResolvedValue({ encrypted: envelope })
    process.env.CREDENTIALS_KEY = "b".repeat(32)
    const result = await getCredentials(CARRIER, "efs")
    expect(result).toBeNull()
  })
})

describe("saveCredentials / hasCredentials / deleteCredentials", () => {
  it("upserts an encrypted envelope keyed by carrier + provider", async () => {
    await saveCredentials(CARRIER, "efs", { apiKey: "sk-live-123" }, "user-1")
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toContain("ON CONFLICT (carrier_id, provider) DO UPDATE")
    expect(params[0]).toBe(CARRIER)
    expect(params[1]).toBe("efs")
    expect(decryptPayload(params[2] as string)).toEqual({ apiKey: "sk-live-123" })
    expect(params[3]).toBe("user-1")
  })

  it("hasCredentials reports true only when a row is found", async () => {
    queryOneMock.mockResolvedValue({ id: "row-1" })
    expect(await hasCredentials(CARRIER, "efs")).toBe(true)
    queryOneMock.mockResolvedValue(null)
    expect(await hasCredentials(CARRIER, "efs")).toBe(false)
  })

  it("hasCredentials returns false without querying the db when CREDENTIALS_KEY is unset", async () => {
    // The guard credentials.ts:83 depends on: rotating or dropping
    // CREDENTIALS_KEY must make every adapter's connected() check report
    // false again, not keep reporting a stale row exists that can no longer
    // be decrypted. A row present in the db must not leak through this path.
    queryOneMock.mockResolvedValue({ id: "row-1" })
    delete process.env.CREDENTIALS_KEY
    expect(await hasCredentials(CARRIER, "efs")).toBe(false)
    expect(queryOneMock).not.toHaveBeenCalled()
  })

  it("deleteCredentials scopes the delete to carrier + provider", async () => {
    await deleteCredentials(CARRIER, "efs")
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM hub.api_credentials"),
      [CARRIER, "efs"]
    )
  })
})
