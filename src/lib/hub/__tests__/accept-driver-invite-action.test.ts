/**
 * acceptDriverInviteAction (src/app/hub/_actions/onboarding.ts) — the action
 * wrapper around acceptDriverInvite (driver-invite.ts, covered on its own in
 * driver-invite.test.ts). Only the wrapper's own logic is in scope here: the
 * <8-char password guard before the lib call ever runs, and the actionError
 * catch path when the lib call throws instead of returning an { ok: false }.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ hubDb: vi.fn(), queryOne: vi.fn(async () => null), query: vi.fn(async () => []) }))
vi.mock("../session", () => ({ getHubUser: vi.fn(), requireOwner: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("../driver-invite", () => ({ acceptDriverInvite: vi.fn() }))

import { acceptDriverInvite } from "../driver-invite"
import { acceptDriverInviteAction } from "@/app/hub/_actions/onboarding"

const acceptDriverInviteMock = vi.mocked(acceptDriverInvite)

beforeEach(() => {
  acceptDriverInviteMock.mockClear()
})

describe("acceptDriverInviteAction", () => {
  it("rejects a password under 8 characters without calling the lib function", async () => {
    const result = await acceptDriverInviteAction("tok", { password: "short" })

    expect(result).toEqual({ ok: false, error: "Password needs 8+ characters" })
    expect(acceptDriverInviteMock).not.toHaveBeenCalled()
  })

  it("rejects a missing password without calling the lib function", async () => {
    const result = await acceptDriverInviteAction("tok", { password: "" })

    expect(result).toEqual({ ok: false, error: "Password needs 8+ characters" })
    expect(acceptDriverInviteMock).not.toHaveBeenCalled()
  })

  it("delegates a long-enough password straight through to the lib function", async () => {
    acceptDriverInviteMock.mockResolvedValueOnce({ ok: true, email: "amar@example.com" })

    const result = await acceptDriverInviteAction("tok", { password: "password123" })

    expect(acceptDriverInviteMock).toHaveBeenCalledWith("tok", { password: "password123" })
    expect(result).toEqual({ ok: true, email: "amar@example.com" })
  })

  it("passes through the lib function's own failure result unchanged", async () => {
    acceptDriverInviteMock.mockResolvedValueOnce({ ok: false, error: "This driver already has app access — just sign in" })

    const result = await acceptDriverInviteAction("tok", { password: "password123" })

    expect(result).toEqual({ ok: false, error: "This driver already has app access — just sign in" })
  })

  it("catches a thrown error and falls back to a safe message instead of throwing", async () => {
    acceptDriverInviteMock.mockRejectedValueOnce(new Error("connection terminated unexpectedly"))

    const result = await acceptDriverInviteAction("tok", { password: "password123" })

    expect(result).toEqual({ ok: false, error: "Could not create the account" })
  })
})
