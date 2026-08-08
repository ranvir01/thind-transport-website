import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../credentials", () => ({
  getCredentials: vi.fn(async () => null),
  hasCredentials: vi.fn(async () => false),
}))

import { getCredentials, hasCredentials } from "../credentials"
import { memorySink } from "../integrations/mock"
import {
  normalizeTruckstopPosting,
  parseLoadSearchResponse,
  truckstopPostingToLoadDraft,
  truckstopSource,
} from "../integrations/truckstop"

const getCredentialsMock = vi.mocked(getCredentials)
const hasCredentialsMock = vi.mocked(hasCredentials)
const CARRIER = "11111111-1111-1111-1111-111111111111"

function loadSearchResponseXml(results: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetLoadSearchResultsResponse xmlns="http://webservices.truckstop.com/v12">
      <GetLoadSearchResultsResult>${results}</GetLoadSearchResultsResult>
    </GetLoadSearchResultsResponse>
  </soap:Body>
</soap:Envelope>`
}

describe("normalizeTruckstopPosting (pure — the one place the assumed posting shape is read)", () => {
  it("maps the assumed Truckstop.com posting shape into a TruckstopLoadPosting", () => {
    const row = normalizeTruckstopPosting({
      LoadId: "POST-1",
      PostedDate: "2026-06-01T12:00:00Z",
      Equipment: "Van",
      OriginCity: "Kent",
      OriginState: "WA",
      DestinationCity: "Boise",
      DestinationState: "ID",
      TripMiles: "420",
      TotalRate: "1250.50",
      PickupDate: "2026-06-02",
      ContactPhone: "555-0100",
    })
    expect(row).toEqual({
      external_id: "POST-1",
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
    const row = normalizeTruckstopPosting({ LoadId: "POST-2" })
    expect(row.external_id).toBe("POST-2")
    expect(row.equipment).toBeNull()
    expect(row.miles).toBeNull()
    expect(row.rateTotalCents).toBeNull()
  })

  it("falls back to an empty external_id when LoadId is absent", () => {
    expect(normalizeTruckstopPosting({}).external_id).toBe("")
  })
})

describe("parseLoadSearchResponse (pure — the one place the assumed SOAP/XML wire shape is read)", () => {
  it("extracts every LoadSearchResult block into a field record", () => {
    const xml = loadSearchResponseXml(
      "<LoadSearchResult><LoadId>A</LoadId><OriginState>WA</OriginState><DestinationState>ID</DestinationState><TripMiles>400</TripMiles></LoadSearchResult>" +
        "<LoadSearchResult><LoadId>B</LoadId><OriginState>WA</OriginState><DestinationState>OR</DestinationState><TripMiles>180</TripMiles></LoadSearchResult>"
    )
    const rows = parseLoadSearchResponse(xml)
    expect(rows).toHaveLength(2)
    expect(rows[0].LoadId).toBe("A")
    expect(rows[1].LoadId).toBe("B")
  })

  it("returns an empty array when the response has no LoadSearchResult blocks", () => {
    expect(parseLoadSearchResponse(loadSearchResponseXml(""))).toEqual([])
  })

  it("decodes XML entities in element text", () => {
    const xml = loadSearchResponseXml(
      "<LoadSearchResult><LoadId>A&amp;B</LoadId><OriginCity>Coeur d&apos;Alene</OriginCity></LoadSearchResult>"
    )
    const [row] = parseLoadSearchResponse(xml)
    expect(row.LoadId).toBe("A&B")
    expect(row.OriginCity).toBe("Coeur d'Alene")
  })

  it("throws on a SOAP fault instead of returning zero postings silently", () => {
    const xml = `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>Invalid credentials</faultstring></soap:Fault></soap:Body></soap:Envelope>`
    expect(() => parseLoadSearchResponse(xml)).toThrow(/Invalid credentials/)
  })

  it("also extracts LoadSearchItem blocks — the 2026-07-25 scout lead's alternate wrapper name, unconfirmed either way", () => {
    const xml = loadSearchResponseXml(
      "<LoadSearchItem><LoadId>A</LoadId><OriginState>WA</OriginState><DestinationState>ID</DestinationState><TripMiles>400</TripMiles></LoadSearchItem>" +
        "<LoadSearchItem><LoadId>B</LoadId><OriginState>WA</OriginState><DestinationState>OR</DestinationState><TripMiles>180</TripMiles></LoadSearchItem>"
    )
    const rows = parseLoadSearchResponse(xml)
    expect(rows).toHaveLength(2)
    expect(rows[0].LoadId).toBe("A")
    expect(rows[1].LoadId).toBe("B")
  })

  it("prefers LoadSearchResult over LoadSearchItem if a response somehow carried both", () => {
    const xml = loadSearchResponseXml(
      "<LoadSearchResult><LoadId>real</LoadId></LoadSearchResult><LoadSearchItem><LoadId>ignored</LoadId></LoadSearchItem>"
    )
    const rows = parseLoadSearchResponse(xml)
    expect(rows).toHaveLength(1)
    expect(rows[0].LoadId).toBe("real")
  })
})

describe("truckstopPostingToLoadDraft (pure — prefills createLoad()'s input from a posting)", () => {
  it("maps a fully-populated posting onto LoadInput-shaped fields, minus customer_id", () => {
    const posting = normalizeTruckstopPosting({
      LoadId: "POST-1",
      Equipment: "Reefer",
      OriginCity: "Kent",
      OriginState: "WA",
      DestinationCity: "Boise",
      DestinationState: "ID",
      TripMiles: "420",
      TotalRate: "1250.50",
      PickupDate: "2026-06-02",
      ContactPhone: "555-0100",
    })
    const draft = truckstopPostingToLoadDraft(posting)
    expect(draft).toEqual({
      customer_reference: "POST-1",
      equipment: "reefer",
      commodity: null,
      linehaul_cents: 125050,
      fuel_surcharge_cents: 0,
      accessorials: [],
      loaded_miles: 420,
      source: "truckstop",
      notes: "Truckstop posting contact: 555-0100",
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
  ])("maps Truckstop equipment string %s to %s, defaulting unknowns to dry_van", (raw, expected) => {
    const posting = normalizeTruckstopPosting({ LoadId: "P", Equipment: raw })
    expect(truckstopPostingToLoadDraft(posting).equipment).toBe(expected)
  })

  it("degrades to empty stop cities/no rate/no notes when the posting is missing fields", () => {
    const posting = normalizeTruckstopPosting({ LoadId: "P" })
    const draft = truckstopPostingToLoadDraft(posting)
    expect(draft.stops).toEqual([
      { type: "pickup", city: "", state: "", appt_start: null },
      { type: "delivery", city: "", state: "" },
    ])
    expect(draft.linehaul_cents).toBe(0)
    expect(draft.notes).toBeNull()
  })
})

describe("truckstopSource (SyncSource<TruckstopLoadPosting> + search contract)", () => {
  beforeEach(() => {
    getCredentialsMock.mockReset()
    hasCredentialsMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  const CREDS = { integrationId: "123456", username: "user1", password: "pass1" }

  it("reports not connected without credentials, and pull/search refuse instead of guessing", async () => {
    hasCredentialsMock.mockResolvedValue(false)
    getCredentialsMock.mockResolvedValue(null)
    const source = truckstopSource(CARRIER)
    await expect(source.connected()).resolves.toBe(false)
    await expect(source.pull()).rejects.toThrow(/not connected/)
    await expect(source.search({ originState: "WA" })).rejects.toThrow(/not connected/)
  })

  it("refuses when only some of the three credential fields are saved", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue({ integrationId: "123456" })
    const source = truckstopSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/not connected/)
  })

  it("searches and normalizes postings once credentials resolve", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          loadSearchResponseXml(
            "<LoadSearchResult><LoadId>A</LoadId><OriginState>WA</OriginState><DestinationState>ID</DestinationState><TripMiles>400</TripMiles></LoadSearchResult>" +
              "<LoadSearchResult><LoadId>B</LoadId><OriginState>WA</OriginState><DestinationState>OR</DestinationState><TripMiles>180</TripMiles></LoadSearchResult>"
          ),
      }))
    )
    const source = truckstopSource(CARRIER)
    const rows = await source.search({ originState: "WA", equipment: "Van" })
    expect(rows.map((r) => r.external_id)).toEqual(["A", "B"])
  })

  it("POSTs a SOAP envelope with the SOAPAction header and credentials in the body", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, text: async () => loadSearchResponseXml("") }))
    vi.stubGlobal("fetch", fetchMock)
    const source = truckstopSource(CARRIER)
    await source.search({ originState: "WA", destState: "ID", equipment: "Reefer" })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://testws.truckstop.com/v13/Searching/LoadSearch.svc")
    expect(init.method).toBe("POST")
    const headers = init.headers as Record<string, string>
    expect(headers["Content-Type"]).toBe("text/xml; charset=utf-8")
    expect(headers.SOAPAction).toBe("http://webservices.truckstop.com/v12/ILoadSearch/GetLoadSearchResults")

    const body = init.body as string
    expect(body).toContain("<IntegrationId>123456</IntegrationId>")
    expect(body).toContain("<UserName>user1</UserName>")
    expect(body).toContain("<Password>pass1</Password>")
    expect(body).toContain("<OriginStates><string>WA</string></OriginStates>")
    expect(body).toContain("<DestinationStates><string>ID</string></DestinationStates>")
    expect(body).toContain("<Equipment>Reefer</Equipment>")
  })

  it("deterministic external ids replay idempotently through the shared memory sink", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => loadSearchResponseXml("<LoadSearchResult><LoadId>A</LoadId><TripMiles>100</TripMiles></LoadSearchResult>"),
      }))
    )
    const source = truckstopSource(CARRIER)
    const sink = memorySink()
    const first = sink.ingest(CARRIER, "truckstop", await source.pull())
    const replay = sink.ingest(CARRIER, "truckstop", await source.pull())
    expect(first).toEqual({ inserted: 1, skipped: 0 })
    expect(replay).toEqual({ inserted: 0, skipped: 1 })
  })

  it("surfaces a non-OK search response as an error rather than swallowing it", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })))
    const source = truckstopSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/503/)
  })

  it("surfaces a SOAP fault as a thrown error rather than an empty result", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () =>
        `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultstring>Invalid credentials</faultstring></soap:Fault></soap:Body></soap:Envelope>`,
    })))
    const source = truckstopSource(CARRIER)
    await expect(source.pull()).rejects.toThrow(/Invalid credentials/)
  })

  it("returns an empty result when the response body has no LoadSearchResult blocks", async () => {
    hasCredentialsMock.mockResolvedValue(true)
    getCredentialsMock.mockResolvedValue(CREDS)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => loadSearchResponseXml("") })))
    const source = truckstopSource(CARRIER)
    await expect(source.pull()).resolves.toEqual([])
  })
})
