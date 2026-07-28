/**
 * The public authority badge. Two things matter and both are tested here:
 * it must never break the page when FMCSA is down, and it must never present
 * cached data as live — a shipper who acts on a stale "authority active" and
 * finds otherwise does not come back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { getAuthoritySnapshot, saferUrlFor, snapshotFromQc, TRUST_FACTS } from "../fmcsa-authority"

const realFetch = globalThis.fetch
const realKey = process.env.FMCSA_WEBKEY

afterEach(() => {
  globalThis.fetch = realFetch
  if (realKey === undefined) delete process.env.FMCSA_WEBKEY
  else process.env.FMCSA_WEBKEY = realKey
})

describe("snapshotFromQc — field mapping", () => {
  it("maps a live QCMobile carrier onto the badge", () => {
    const snap = snapshotFromQc(
      {
        legalName: "THIND TRANSPORT LLC",
        allowedToOperate: "Y",
        commonAuthorityStatus: "A",
      },
      "2523064",
      "876103"
    )
    expect(snap).toMatchObject({
      legalName: "THIND TRANSPORT LLC",
      dotNumber: "2523064",
      mcNumber: "876103",
      allowedToOperate: true,
      authorityStatus: "A",
      source: "live",
    })
    expect(snap.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("tolerates FMCSA's two spellings of the operate flag", () => {
    // The API ships both `allowedToOperate` and `allowToOperate` depending on
    // the endpoint. Getting this wrong silently renders "status unknown".
    expect(snapshotFromQc({ allowToOperate: "Y" }, "1", "2").allowedToOperate).toBe(true)
    expect(snapshotFromQc({ allowedToOperate: "N" }, "1", "2").allowedToOperate).toBe(false)
    expect(snapshotFromQc({}, "1", "2").allowedToOperate).toBeNull()
  })

  it("falls back to the DBA name, then to the known legal name", () => {
    expect(snapshotFromQc({ dbaName: "THIND" }, "1", "2").legalName).toBe("THIND")
    expect(snapshotFromQc({}, "1", "2").legalName).toBe("THIND TRANSPORT LLC")
    // Whitespace-only is not a name.
    expect(snapshotFromQc({ legalName: "   " }, "1", "2").legalName).toBe("THIND TRANSPORT LLC")
  })
})

describe("getAuthoritySnapshot — never breaks the page", () => {
  beforeEach(() => {
    process.env.FMCSA_WEBKEY = "test-key"
  })

  it("returns the cached snapshot when FMCSA_WEBKEY is unset", async () => {
    delete process.env.FMCSA_WEBKEY
    const called = vi.fn()
    globalThis.fetch = called as never

    const snap = await getAuthoritySnapshot()
    expect(snap.source).toBe("cached")
    expect(snap.dotNumber).toBe("2523064")
    expect(called).not.toHaveBeenCalled()
  })

  it("returns the cached snapshot when the API 500s", async () => {
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as never
    const snap = await getAuthoritySnapshot()
    expect(snap.source).toBe("cached")
    expect(snap.allowedToOperate).toBe(true)
  })

  it("returns the cached snapshot when the request throws (outage/timeout)", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT")
    }) as never
    const snap = await getAuthoritySnapshot()
    expect(snap.source).toBe("cached")
  })

  it("returns the cached snapshot when the body is malformed", async () => {
    globalThis.fetch = vi.fn(async () => Response.json({ nonsense: true })) as never
    expect((await getAuthoritySnapshot()).source).toBe("cached")
  })

  it("uses live data when the API answers, and marks it live", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        content: [{ carrier: { legalName: "THIND TRANSPORT LLC", allowedToOperate: "Y", commonAuthorityStatus: "A" } }],
      })
    ) as never

    const snap = await getAuthoritySnapshot()
    expect(snap.source).toBe("live")
    expect(snap.allowedToOperate).toBe(true)
    expect(snap.asOf).toBe(new Date().toISOString().slice(0, 10))
  })

  it("tries the docket-number endpoint when the DOT lookup comes back empty", async () => {
    const urls: string[] = []
    globalThis.fetch = vi.fn(async (url: string) => {
      urls.push(String(url))
      return urls.length === 1
        ? Response.json({ content: [] })
        : Response.json({ content: [{ carrier: { allowedToOperate: "Y" } }] })
    }) as never

    const snap = await getAuthoritySnapshot()
    expect(urls).toHaveLength(2)
    expect(urls[1]).toContain("docket-number")
    expect(snap.source).toBe("live")
  })

  it("caches for a day rather than calling FMCSA on every page view", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ content: [{ carrier: { allowedToOperate: "Y" } }] })
    )
    globalThis.fetch = fetchMock as never
    await getAuthoritySnapshot()
    const init = fetchMock.mock.calls[0]![1] as unknown as { next?: { revalidate?: number } }
    expect(init.next?.revalidate).toBe(86_400)
  })

  it("always offers a SAFER link so the visitor can check for themselves", async () => {
    delete process.env.FMCSA_WEBKEY
    const snap = await getAuthoritySnapshot()
    expect(snap.saferUrl).toContain("safer.fmcsa.dot.gov")
    expect(snap.saferUrl).toContain("2523064")
  })
})

describe("saferUrlFor", () => {
  it("builds a company-snapshot query by USDOT", () => {
    const url = saferUrlFor("2523064")
    expect(url).toContain("queryCarrierSnapshot")
    expect(url).toContain("query_param=USDOT")
    expect(url).toContain("2523064")
  })
})

describe("TRUST_FACTS", () => {
  it("is null until the owner supplies real figures", () => {
    // This test exists to be deliberately broken. Publishing a plausible-looking
    // insurance limit or on-time percentage on a page aimed at shippers is a
    // misrepresentation — and it is the first thing a broker verifies. When
    // Ranvir provides the real numbers, update this test with them.
    expect(TRUST_FACTS.autoLiabilityDollars).toBeNull()
    expect(TRUST_FACTS.cargoDollars).toBeNull()
    expect(TRUST_FACTS.onTimePercent).toBeNull()
    expect(TRUST_FACTS.claimsRatioPercent).toBeNull()
  })
})
