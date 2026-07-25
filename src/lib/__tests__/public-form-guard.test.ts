/**
 * Rate-limit guard for the four public forms (lead capture, pre-qualify,
 * application, schedule-meeting). Pins the key shapes — an IP key namespaced
 * `ip:<addr>` and the raw submitted email with its tighter budget — plus the
 * two behaviours that keep the guard fair: a blocked submission is never
 * charged (a sliding window that charges blocked attempts would lock a shared
 * office NAT out indefinitely), and an accepted submission is charged on
 * every key so the SMTP/PDF cost is what the budget actually meters.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }))
vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("../hub/auth-throttle", () => ({
  isLockedOut: vi.fn(async () => false),
  recordAttempt: vi.fn(async () => undefined),
}))

import { isLockedOut, recordAttempt } from "../hub/auth-throttle"
import { publicFormBlocked } from "../public-form-guard"
import { HONEYPOT_FIELD, honeypotTripped } from "../honeypot"

const isLockedOutMock = vi.mocked(isLockedOut)
const recordAttemptMock = vi.mocked(recordAttempt)

const withHeaders = (h: Record<string, string>) =>
  headersMock.mockResolvedValue(new Headers(h))

beforeEach(() => {
  isLockedOutMock.mockReset().mockResolvedValue(false)
  recordAttemptMock.mockReset().mockResolvedValue(undefined)
  headersMock.mockReset()
  withHeaders({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })
})

describe("publicFormBlocked", () => {
  it("keys the IP as ip:<first-forwarded-hop> and the email raw, charging both when allowed", async () => {
    expect(await publicFormBlocked("Driver@Example.com")).toBe(false)

    expect(isLockedOutMock).toHaveBeenCalledWith("ip:203.0.113.9", "public-form", undefined)
    expect(isLockedOutMock).toHaveBeenCalledWith("Driver@Example.com", "public-form", 6)
    expect(recordAttemptMock).toHaveBeenCalledWith("ip:203.0.113.9", false, "public-form")
    expect(recordAttemptMock).toHaveBeenCalledWith("Driver@Example.com", false, "public-form")
  })

  it("blocks on a locked IP and does NOT charge any key (no lockout extension)", async () => {
    isLockedOutMock.mockResolvedValueOnce(true)
    expect(await publicFormBlocked("driver@example.com")).toBe(true)
    expect(recordAttemptMock).not.toHaveBeenCalled()
  })

  it("blocks on a locked email even when the IP is clean", async () => {
    isLockedOutMock
      .mockResolvedValueOnce(false) // ip
      .mockResolvedValueOnce(true) // email
    expect(await publicFormBlocked("driver@example.com")).toBe(true)
    expect(recordAttemptMock).not.toHaveBeenCalled()
  })

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    withHeaders({ "x-real-ip": "198.51.100.7" })
    await publicFormBlocked()
    expect(isLockedOutMock).toHaveBeenCalledWith("ip:198.51.100.7", "public-form", undefined)
  })

  it("skips the IP key entirely when no client IP is known (dev, tests)", async () => {
    withHeaders({})
    expect(await publicFormBlocked("driver@example.com")).toBe(false)
    const keys = isLockedOutMock.mock.calls.map((c) => c[0])
    expect(keys).toEqual(["driver@example.com"])
  })

  it("ignores an email that is not an email (never throttles on garbage keys)", async () => {
    await publicFormBlocked("not-an-address")
    const keys = isLockedOutMock.mock.calls.map((c) => c[0])
    expect(keys).toEqual(["ip:203.0.113.9"])
  })
})

describe("honeypotTripped", () => {
  const fd = (value?: string) => {
    const f = new FormData()
    if (value !== undefined) f.append(HONEYPOT_FIELD, value)
    return f
  }

  it("trips only on a non-blank value", () => {
    expect(honeypotTripped(fd("https://spam.example"))).toBe(true)
    expect(honeypotTripped(fd(""))).toBe(false)
    expect(honeypotTripped(fd("   "))).toBe(false)
  })

  it("never trips when the form doesn't render the field at all", () => {
    expect(honeypotTripped(fd())).toBe(false)
  })
})
