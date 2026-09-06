import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import { datPostingToLoadDraft, datSource, normalizeDatPosting } from "../integrations/dat"

const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "11111111-1111-1111-1111-111111111111"

const DAT_CREDS = {
  serviceAccountEmail: "svc@carrier.com",
  password: "p",
  actingUserEmail: "dispatch@carrier.com",
}

/** Mocks the two-step DAT identity flow, then the freight search GET. */
function mockDatFetch(options: {
  orgToken?: string
  userToken?: string
  orgStatus?: number
  userStatus?: number
  searchStatus?: number
  searchBody?: unknown
  orgBody?: unknown
  userBody?: unknown
} = {}) {
  const {
    orgToken = "org-token",
    userToken = "user-token",
    orgStatus = 200,
    userStatus = 200,
    searchStatus = 200,
    searchBody = { matches: [] },
    orgBody,
    userBody,
  } = options
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/access/v1/token/organization")) {
      return {
        ok: orgStatus >= 200 && orgStatus < 300,
        status: orgStatus,
        json: async () => orgBody ?? { accessToken: orgToken },
      }
    }
    if (url.includes("/access/v1/token/user")) {
      return {
        ok: userStatus >= 200 && userStatus < 300,
        status: userStatus,
        json: async () => userBody ?? { accessToken: userToken },
      }
    }
    return {
      ok: searchStatus >= 200 && searchStatus < 300,
      status: searchStatus,
      json: async () => searchBody,
    }
  })
}

describe("normalizeDatPosting (pure — the one place the assumed match shape is read)", () => {
  it("maps the assumed DAT freight-match shape into a DatLoadPosting", () => {
    const row = normalizeDatPosting({
      matchId: "MATCH-1",
      postedAt: "2026-06-01T12:00:00Z",
      equipmentType: "Van",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      tripMiles: 420,
      rateTotal: 1250.5,
      pickupDate: "2026-06-02",
      contactPhone: "555-0100",
    })
    expect(row).toEqual({
      external_id: "MATCH-1",
      postedAt: "2026-06-01T12:00:00Z",
      equipment: "Van",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      miles: 420,
      rateTotalCents: 125050,
      pickupDate: "2026-06-02",
      contactPhone: "555-0100",
      raw: expect.any(Object),
    })
  })

  it("degrades gracefully when optional fields are missing", () => {
    const row = normalizeDatPosting({ matchId: "MATCH-2" })
    expect(row.external_id).toBe("MATCH-2")
    expect(row.equipment).toBeNull()
    expect(row.miles).toBeNull()
    expect(row.rateTotalCents).toBeNull()
  })

  it("falls back to an empty external_id when matchId is absent", () => {
    expect(normalizeDatPosting({}).external_id).toBe("")
  })
})

describe("datPostingToLoadDraft (pure — prefills createLoad()'s input from a posting)", () => {
  it("maps a fully-populated posting onto LoadInput-shaped fields, minus customer_id", () => {
    const posting = normalizeDatPosting({
      matchId: "MATCH-1",
      equipmentType: "Reefer",
      originCity: "Kent",
      originState: "WA",
      destCity: "Boise",
      destState: "ID",
      tripMiles: 420,
      rateTotal: 1250.5,
      pickupDate: "2026-06-02",
      contactPhone: "555-0100",
    })
    const draft = datPostingToLoadDraft(posting)
    expect(draft).toEqual({
      customer_reference: "MATCH-1",
      equipment: "reefer",
      commodity: null,
      linehaul_cents: 125050,
      fuel_surcharge_cents: 0,
      accessorials: [],
      loaded_miles: 420,
      source: "dat",
      notes: "DAT posting contact: 555-0100",
      stops: [
        { type: "pickup", city: "Kent", state: "WA", appt_start: "2026-06-02" },
        { type: "delivery", city: "Boise", state: "ID" },
      ],
    })
    expect(draft).not.toHaveProperty("customer_id")
  })

  it.each([
    ["Van", "dry_van"],
    ["V", "dry_van"],
    ["Reefer", "reefer"],
    ["R", "reefer"],
    ["Flatbed", "flatbed"],
    ["F", "flatbed"],
    ["Power Only", "dry_van"],
  ])("maps DAT equipment string %s to %s, defaulting unknowns to dry_van", (raw, expected) => {
    const posting = normalizeDatPosting({ matchId: "M", equipmentType: raw })
    expect(datPostingToLoadDraft(posting).equipment).toBe(expected)
  })

  it("degrades to empty stop cities/no rate/no notes when the posting is missing fields", () => {
    const posting = normalizeDatPosting({ matchId: "M" })
    const draft = datPostingToLoadDraft(posting)
    expect(draft.stops).toEqual([
      { type: "pickup", city: "", state: "", appt_start: null },
      { type: "delivery", city: "", state: "" },
    ])
    expect(draft.linehaul_cents).toBe(0)
    expect(draft.notes).toBeNull()
  })
})

describe("datSource (SyncSource<DatLoadPosting> + search contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("reports not connected without credentials, and pull/search refuse instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = datSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(
      /missing service account email, password, acting user email/
    )
  })

  it("refuses to search when the acting-user email is missing (service account alone cannot authenticate)", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ serviceAccountEmail: "u@carrier.com", password: "p" })
    const source = datSource(CARRIER)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/missing acting user email/)
  })

  it("exchanges org + user tokens then searches with Bearer auth", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    const fetchMock = mockDatFetch({
      searchBody: {
        matches: [
          { matchId: "A", originState: "WA", destState: "ID", tripMiles: 400 },
          { matchId: "B", originState: "WA", destState: "OR", tripMiles: 180 },
        ],
      },
    })
    vi.stubGlobal("fetch", fetchMock)
    const source = datSource(CARRIER)
    const rows = await source.search({ originState: "WA", equipment: "Van" })
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const orgCall = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(orgCall[0]).toContain("/access/v1/token/organization")
    expect(JSON.parse(String(orgCall[1]?.body))).toEqual({
      username: DAT_CREDS.serviceAccountEmail,
      password: DAT_CREDS.password,
    })
    const userCall = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(userCall[0]).toContain("/access/v1/token/user")
    expect(userCall[1]?.headers).toMatchObject({ Authorization: "Bearer org-token" })
    expect(JSON.parse(String(userCall[1]?.body))).toEqual({ username: DAT_CREDS.actingUserEmail })
    const searchCall = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(searchCall[0]).toContain("/loads/search")
    expect(searchCall[1]?.headers).toMatchObject({ Authorization: "Bearer user-token" })
  })

  it("carries the search criteria into the query string", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    const fetchMock = mockDatFetch()
    vi.stubGlobal("fetch", fetchMock)
    const source = datSource(CARRIER)
    await source.search({ originCity: "Kent", originState: "WA", destState: "ID", equipment: "Reefer", radiusMiles: 50 })
    const searchUrl = String((fetchMock.mock.calls[2] as unknown[])[0])
    expect(searchUrl).toContain("originCity=Kent")
    expect(searchUrl).toContain("originState=WA")
    expect(searchUrl).toContain("destState=ID")
    expect(searchUrl).toContain("equipmentType=Reefer")
    expect(searchUrl).toContain("radiusMiles=50")
  })

  it("uses staging identity host when DAT_API_BASE points at staging freight", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubEnv("DAT_API_BASE", "https://freight.api.staging.dat.com/v3")
    const fetchMock = mockDatFetch()
    vi.stubGlobal("fetch", fetchMock)
    const source = datSource(CARRIER)
    await source.search({ originState: "WA" })
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("identity.api.staging.dat.com")
    vi.unstubAllEnvs()
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubGlobal(
      "fetch",
      mockDatFetch({ searchBody: { matches: [{ matchId: "A", tripMiles: 100 }] } })
    )
    const source = datSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "dat", await source.pull())
    const replay = sink.ingest(CARRIER, "dat", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces org-token HTTP failure", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubGlobal("fetch", mockDatFetch({ orgStatus: 401 }))
    const source = datSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/DAT org token → HTTP 401/)
  })

  it("surfaces user-token HTTP failure", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubGlobal("fetch", mockDatFetch({ userStatus: 403 }))
    const source = datSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/DAT user token → HTTP 403/)
  })

  it("surfaces a non-OK search response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubGlobal("fetch", mockDatFetch({ searchStatus: 503 }))
    const source = datSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/DAT search → HTTP 503/)
  })

  it("returns an empty result when the response body has no matches array", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(DAT_CREDS)
    vi.stubGlobal("fetch", mockDatFetch({ searchBody: {} }))
    const source = datSource(CARRIER)
    await expect(source.pull()).resolves.toEqual([])
  })
})
