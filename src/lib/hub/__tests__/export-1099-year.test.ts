/**
 * The 1099-NEC export hardcoded `new Date().getFullYear()`, so the January
 * filing run — the only time anyone pulls this file — returned an empty CSV
 * for a year with no settlements yet, instead of the year being filed. The
 * year is now an explicit parameter threaded from ?year= on
 * /api/hub/exports/1099, defaulting to the PREVIOUS calendar year and
 * validated rather than silently replaced (a tax export for the wrong year is
 * worse than a visible error).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null), hubDb: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/session", () => ({ getActiveHubUser: vi.fn() }))

import { query } from "../db"
import { getActiveHubUser } from "@/lib/hub/session"
import { exportCsv } from "../expenses"
import { GET } from "@/app/api/hub/exports/[kind]/route"

const queryMock = vi.mocked(query)
const getActiveHubUserMock = vi.mocked(getActiveHubUser)

const CARRIER = "11111111-1111-1111-1111-111111111111"

/**
 * Pinned mid-year, midday UTC (compliance.test.ts pattern): THIS_YEAR was
 * captured from the real clock at module load while the route computed its
 * default year at call time, so a run straddling New Year midnight asserted
 * the wrong filing year. Mid-June also keeps the local calendar year equal to
 * the UTC one for any timezone offset.
 */
const PINNED_CLOCK = new Date(Date.UTC(2026, 5, 15, 12)) // 2026-06-15T12:00Z
const THIS_YEAR = PINNED_CLOCK.getUTCFullYear()
const LAST_YEAR = THIS_YEAR - 1

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
})

beforeEach(() => {
  vi.setSystemTime(PINNED_CLOCK)
})

afterAll(() => {
  vi.useRealTimers()
})

const PAYEE_ROW = { payee: "Dana Ruiz", nonemployee_compensation: 84210.55 }

/** The year bound into the 1099 aggregate query. */
function queriedYear() {
  const call = queryMock.mock.calls.find(([sql]) => String(sql).includes("EXTRACT(YEAR FROM s.period_end)"))
  expect(call).toBeDefined()
  return (call![1] as unknown[])[1]
}

function exportRequest(kind: string, search = "") {
  return GET(new Request(`http://localhost/api/hub/exports/${kind}${search}`), {
    params: Promise.resolve({ kind }),
  })
}

beforeEach(() => {
  queryMock.mockReset()
  queryMock.mockResolvedValue([PAYEE_ROW])
  getActiveHubUserMock.mockReset()
  getActiveHubUserMock.mockResolvedValue({ id: "u1", name: "Ollie", email: "ollie@carrier.test", role: "owner", carrierId: CARRIER })
})

describe("exportCsv 1099 filing year", () => {
  it("defaults to the PREVIOUS calendar year — the year Q1 is filing", async () => {
    const { filename, csv } = await exportCsv(CARRIER, "1099")
    expect(queriedYear()).toBe(LAST_YEAR)
    expect(filename).toBe(`1099-nec-${LAST_YEAR}.csv`)
    expect(csv).toContain(`Dana Ruiz,84210.55,${LAST_YEAR}`)
  })

  it("uses an explicit year for amended or catch-up filings", async () => {
    const { filename, csv } = await exportCsv(CARRIER, "1099", { year: 2024 })
    expect(queriedYear()).toBe(2024)
    expect(filename).toBe("1099-nec-2024.csv")
    expect(csv).toContain("Dana Ruiz,84210.55,2024")
  })

  it("still allows the current year (an in-progress preview)", async () => {
    await exportCsv(CARRIER, "1099", { year: THIS_YEAR })
    expect(queriedYear()).toBe(THIS_YEAR)
  })

  it("stays carrier-scoped whichever year is asked for", async () => {
    await exportCsv(CARRIER, "1099", { year: 2024 })
    const call = queryMock.mock.calls.find(([sql]) => String(sql).includes("EXTRACT(YEAR FROM s.period_end)"))
    expect(String(call![0])).toContain("s.carrier_id = $1")
    expect((call![1] as unknown[])[0]).toBe(CARRIER)
  })

  it.each([
    ["a year before the product existed", 1999],
    ["a non-integer year", 2024.5],
    ["a parse failure (NaN)", Number.NaN],
    ["a year that cannot have settlements yet", THIS_YEAR + 2],
  ])("rejects %s instead of quietly exporting a different year", async (_label, year) => {
    await expect(exportCsv(CARRIER, "1099", { year })).rejects.toThrow(/filing year/i)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("ignores the year for exports that are not year-scoped", async () => {
    const { filename } = await exportCsv(CARRIER, "expenses", { year: 2024 })
    expect(filename).toBe("expenses.csv")
  })
})

describe("/api/hub/exports/1099 year threading", () => {
  it("passes ?year= through to the export", async () => {
    const res = await exportRequest("1099", "?year=2024")
    expect(res.status).toBe(200)
    expect(queriedYear()).toBe(2024)
    expect(res.headers.get("Content-Disposition")).toContain("1099-nec-2024.csv")
  })

  it("defaults to last year when the caller omits ?year=", async () => {
    const res = await exportRequest("1099")
    expect(res.status).toBe(200)
    expect(queriedYear()).toBe(LAST_YEAR)
    expect(res.headers.get("Content-Disposition")).toContain(`1099-nec-${LAST_YEAR}.csv`)
  })

  it("400s a garbage year instead of exporting the wrong one", async () => {
    const res = await exportRequest("1099", "?year=not-a-year")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: expect.stringMatching(/filing year/i) })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("400s an out-of-range year", async () => {
    const res = await exportRequest("1099", `?year=${THIS_YEAR + 5}`)
    expect(res.status).toBe(400)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("does not hand a database failure back to the client as a 400", async () => {
    queryMock.mockRejectedValue(new Error('relation "hub.settlements" does not exist'))
    await expect(exportRequest("1099", "?year=2024")).rejects.toThrow(/hub\.settlements/)
  })

  it("still refuses a role without money:read, year or no year", async () => {
    getActiveHubUserMock.mockResolvedValue({ id: "d1", name: "Dana", email: "dana@driver.test", role: "driver", carrierId: CARRIER })
    const res = await exportRequest("1099", "?year=2024")
    expect(res.status).toBe(403)
    expect(queryMock).not.toHaveBeenCalled()
  })
})
