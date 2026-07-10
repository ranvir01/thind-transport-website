import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  saveCredentials: vi.fn(async () => undefined),
}))
vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }))
vi.mock("../documents", () => ({ saveDocument: vi.fn(async () => ({})) }))
vi.mock("../loads", () => ({ addLoadEvent: vi.fn(async () => {}) }))

import { saveCredentials } from "../credentials"
import { extractReference, isOAuthConfigured, pollDocsMailbox, resolveMailboxAuth } from "../mailbox"

const saveCredentialsMock = vi.mocked(saveCredentials)
const CARRIER = "44444444-4444-4444-4444-444444444444"

function mockFetchSequence(...responses: Array<{ ok: boolean; status?: number; json: () => Promise<unknown> }>) {
  const fn = vi.fn()
  for (const r of responses) fn.mockImplementationOnce(async () => r)
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("docs mailbox — reference extraction", () => {
  const cases: [string, string | null][] = [
    ["Rate con for THD-1042", "THD-1042"],
    ["FW: RE: thd-1042 pod attached", "THD-1042"],
    ["Load LD-23 paperwork", "LD-23"],
    ["CASC-100023 BOL", "CASC-100023"],
    ["Invoice INV-2026-... wait that's not a load", "INV-2026"],
    ["no reference here", null],
    ["", null],
  ]
  for (const [subject, expected] of cases) {
    it(`"${subject || "(empty)"}" → ${expected}`, () => {
      expect(extractReference(subject)).toBe(expected)
    })
  }
})

const PASSWORD_CREDS = { host: "imap.gmail.com", user: "docs@carrier.com", password: "app-pass" }
const OAUTH_CREDS = {
  host: "outlook.office365.com",
  user: "docs@carrier.com",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  clientId: "cid",
  clientSecret: "csec",
  refreshToken: "rtok",
}

describe("isOAuthConfigured", () => {
  it("is false for Gmail app-password creds", () => {
    expect(isOAuthConfigured(PASSWORD_CREDS)).toBe(false)
  })

  it("is true only once all four OAuth2 fields are present", () => {
    expect(isOAuthConfigured(OAUTH_CREDS)).toBe(true)
    const { refreshToken, ...missingRefreshToken } = OAUTH_CREDS
    expect(isOAuthConfigured(missingRefreshToken)).toBe(false)
  })
})

describe("resolveMailboxAuth", () => {
  beforeEach(() => {
    saveCredentialsMock.mockClear()
  })

  it("uses plain user/pass for Gmail app-password creds — no token fetch", async () => {
    const fetchMock = mockFetchSequence()
    const auth = await resolveMailboxAuth(CARRIER, PASSWORD_CREDS)
    expect(auth).toEqual({ user: "docs@carrier.com", pass: "app-pass" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("exchanges the refresh token for an access token (XOAUTH2) when OAuth2 fields are configured", async () => {
    mockFetchSequence({ ok: true, json: async () => ({ access_token: "atok" }) })
    const auth = await resolveMailboxAuth(CARRIER, OAUTH_CREDS)
    expect(auth).toEqual({ user: "docs@carrier.com", accessToken: "atok" })
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })

  it("persists a rotated refresh token so the next poll doesn't redeem a stale one", async () => {
    mockFetchSequence({ ok: true, json: async () => ({ access_token: "atok", refresh_token: "rtok-new" }) })
    await resolveMailboxAuth(CARRIER, OAUTH_CREDS)
    expect(saveCredentialsMock).toHaveBeenCalledWith(
      CARRIER,
      "mailbox",
      { ...OAUTH_CREDS, refreshToken: "rtok-new" },
      "system:mailbox"
    )
  })

  it("does not persist when the token response returns the same refresh token", async () => {
    mockFetchSequence({ ok: true, json: async () => ({ access_token: "atok", refresh_token: OAUTH_CREDS.refreshToken }) })
    await resolveMailboxAuth(CARRIER, OAUTH_CREDS)
    expect(saveCredentialsMock).not.toHaveBeenCalled()
  })

  it("surfaces a non-OK token response as an error rather than silently falling back", async () => {
    mockFetchSequence({ ok: false, status: 401, json: async () => ({}) })
    await expect(resolveMailboxAuth(CARRIER, OAUTH_CREDS)).rejects.toThrow(/401/)
  })
})

describe("pollDocsMailbox — connection gating", () => {
  it("reports not connected when neither a password nor OAuth2 fields are configured", async () => {
    const { getCredentials } = await import("../credentials")
    vi.mocked(getCredentials).mockResolvedValueOnce({ host: "imap.gmail.com", user: "docs@carrier.com" })
    await expect(pollDocsMailbox(CARRIER)).resolves.toEqual({ connected: false })
  })

  it("reports not connected with no credentials at all", async () => {
    const { getCredentials } = await import("../credentials")
    vi.mocked(getCredentials).mockResolvedValueOnce(null)
    await expect(pollDocsMailbox(CARRIER)).resolves.toEqual({ connected: false })
  })
})
