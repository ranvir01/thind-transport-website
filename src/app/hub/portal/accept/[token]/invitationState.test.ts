import { describe, expect, it } from "vitest"
import { resolveInvitationState } from "./invitationState"

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString()

describe("resolveInvitationState", () => {
  it("is invalid for a missing/unknown token", () => {
    expect(resolveInvitationState(null)).toBe("invalid")
  })

  it("is valid for an unexpired, unaccepted invitation", () => {
    expect(resolveInvitationState({ expires_at: FUTURE, accepted_user_id: null })).toBe("valid")
  })

  it("is expired once expires_at has passed", () => {
    expect(resolveInvitationState({ expires_at: PAST, accepted_user_id: null })).toBe("expired")
  })

  it("is used once accepted, even before it would otherwise expire", () => {
    expect(resolveInvitationState({ expires_at: FUTURE, accepted_user_id: "user-1" })).toBe("used")
  })

  it("prefers 'used' over 'expired' when an accepted invitation has also passed its expiry", () => {
    expect(resolveInvitationState({ expires_at: PAST, accepted_user_id: "user-1" })).toBe("used")
  })
})
