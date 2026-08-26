/**
 * P2.1: createInvoiceFromLoad's only caller was a human clicking "Invoice" on
 * /hub/money. vercel.json had 17 crons and not one of them billed anything, so
 * a delivered load nobody remembered never became cash — while draftSettlements
 * paid the driver for hauling it regardless.
 *
 * Two guarantees pinned here:
 *   1. the cron path drafts an invoice and NEVER emails — an unattended job
 *      must not put a money document in a broker's inbox unread;
 *   2. one bad load does not stop the rest of the run.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, queryOneMock, settingsMock, transportMock, sendMailMock, getLoadMock, getCustomerMock } =
  vi.hoisted(() => {
    const sendMail = vi.fn(async () => undefined)
    return {
      queryMock: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
      queryOneMock: vi.fn(async () => null),
      settingsMock: vi.fn(),
      sendMailMock: sendMail,
      transportMock: vi.fn(() => ({ sendMail })),
      getLoadMock: vi.fn(),
      getCustomerMock: vi.fn(),
    }
  })

vi.mock("../db", () => ({ query: queryMock, queryOne: queryOneMock, hubDb: vi.fn() }))
vi.mock("../settings", () => ({
  getCarrierSettings: settingsMock,
  getCarrier: vi.fn(async () => ({ name: "Thind Transport", address: "Kent, WA" })),
  nextInvoiceNumber: vi.fn(async () => "INV-1000"),
}))
vi.mock("../loads", () => ({
  getLoad: getLoadMock,
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async () => undefined),
}))
vi.mock("../customers", () => ({ getCustomer: getCustomerMock }))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(async () => []),
  storeGeneratedPdf: vi.fn(async () => "/api/hub/files/INV-1000.pdf"),
  readStoredFileBytes: vi.fn(async () => null),
}))
vi.mock("../pdf", () => ({
  buildInvoicePdf: vi.fn(async () => new Uint8Array([1])),
  buildStatementPdf: vi.fn(),
}))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  mailShouldSend: vi.fn(async () => true),
  createMailTransport: transportMock,
  mailFrom: vi.fn((n: string) => n),
}))
vi.mock("../mode", () => ({ isSimulation: vi.fn(async () => false) }))

import { createInvoiceFromLoad, runAutoInvoicing, unbilledLoads } from "../invoices"

const CARRIER = "carrier-1"
const ACTOR = { id: "u1", name: "Dana" }

const settings = (autoInvoiceOnPod: boolean) => ({
  invoice: { prefix: "INV-", nextNumber: 1000, defaultTermsDays: 30, autoInvoiceOnPod },
  factoring: { company: null, remitName: null, remitAddress: null, email: null },
  branding: { accent: null },
})

const load = {
  id: "load-1", reference: "THD-1001", customer_id: "cust-1", status: "pod_received",
  linehaul_cents: 200000, fuel_surcharge_cents: 0, accessorials: [],
  customer_reference: null, factored: false,
}
const customer = {
  id: "cust-1", name: "Acme Freight", billing_email: "broker@example.com",
  billing_address: null, payment_terms_days: 30, factored: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  settingsMock.mockResolvedValue(settings(true))
  queryOneMock.mockResolvedValue(null)
  // Any query() here is either the unbilled scan (overridden per test) or the
  // invoice INSERT, which must return a row or the function reports a race.
  queryMock.mockResolvedValue([{ id: "inv-1", number: "INV-1000", status: "draft" }])
  getLoadMock.mockResolvedValue(load)
  getCustomerMock.mockResolvedValue(customer)
})

describe("unbilledLoads", () => {
  it("asks only for POD-in-hand loads with a customer and no invoice row", async () => {
    queryMock.mockResolvedValueOnce([])
    await unbilledLoads(CARRIER)
    const sql = String(queryMock.mock.calls[0][0])
    expect(sql).toContain("status IN ('delivered','pod_received')")
    expect(sql).toContain("l.customer_id IS NOT NULL")
    expect(sql).toContain("NOT EXISTS")
    expect(sql).toContain("i.carrier_id = l.carrier_id AND i.load_id = l.id")
    expect(sql).toContain("l.deleted_at IS NULL")
    expect(queryMock.mock.calls[0][1]).toEqual([CARRIER])
  })
})

describe("createInvoiceFromLoad email flag", () => {
  it("emails by default — the office click is unchanged", async () => {
    const result = await createInvoiceFromLoad(CARRIER, "load-1", ACTOR)
    expect(transportMock).toHaveBeenCalled()
    expect(sendMailMock).toHaveBeenCalled()
    expect(result.emailed).toBe(true)
  })

  it("with email:false, drafts the invoice and sends nothing", async () => {
    const result = await createInvoiceFromLoad(CARRIER, "load-1", ACTOR, { email: false })
    expect(transportMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
    expect(result.emailed).toBe(false)
    // Not an error state — the caller asked for a draft.
    expect(result.error).toBeUndefined()
    expect(result.invoice).toBeTruthy()
  })
})

describe("runAutoInvoicing", () => {
  const twoLoads = [
    { id: "load-1", reference: "THD-1001", amount_cents: 200000, pod_at: "2026-01-02" },
    { id: "load-2", reference: "THD-1002", amount_cents: 150000, pod_at: "2026-01-03" },
  ]

  it("drafts one invoice per unbilled load and mails nobody", async () => {
    queryMock.mockResolvedValueOnce(twoLoads)
    const result = await runAutoInvoicing(CARRIER)
    expect(result).toMatchObject({ eligible: 2, invoiced: 2, failed: 0 })
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it("keeps going when one load cannot be invoiced, and names it", async () => {
    queryMock.mockResolvedValueOnce(twoLoads)
    getLoadMock.mockResolvedValueOnce({ ...load, customer_id: null }) // first load is broken
    const result = await runAutoInvoicing(CARRIER)
    expect(result).toMatchObject({ eligible: 2, invoiced: 1, failed: 1 })
    expect(result.errors[0].reference).toBe("THD-1001")
    expect(result.errors[0].error).toMatch(/customer/i)
  })

  it("respects the autoInvoiceOnPod switch without inventing invoices", async () => {
    settingsMock.mockResolvedValue(settings(false))
    queryMock.mockResolvedValueOnce(twoLoads)
    const result = await runAutoInvoicing(CARRIER)
    expect(result).toMatchObject({ eligible: 2, invoiced: 0, failed: 0 })
    expect(result.skipped).toMatch(/autoInvoiceOnPod is off/)
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it("reports nothing to do on a fully-billed book", async () => {
    queryMock.mockResolvedValueOnce([])
    expect(await runAutoInvoicing(CARRIER)).toMatchObject({ eligible: 0, invoiced: 0, failed: 0 })
  })
})
