/**
 * createInvoiceFromLoad's existing-invoice guard (getInvoiceForLoad) was a
 * pre-check, not atomic with the INSERT — two concurrent requests for the
 * same load could both pass the check and each insert an invoice. Migration
 * 018 adds a unique index on hub.invoices(carrier_id, load_id); the INSERT
 * now uses ON CONFLICT DO NOTHING and the loser re-fetches the winner instead
 * of double-invoicing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryOneMock } = vi.hoisted(() => ({ queryOneMock: vi.fn() }))

vi.mock("../db", () => ({
  query: vi.fn(async (sql: string) => (sql.includes("INSERT INTO hub.invoices") ? [] : [])),
  queryOne: queryOneMock,
}))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport", address: "123 Main St" })),
  getCarrierSettings: vi.fn(async () => ({
    invoice: { defaultTermsDays: 30 },
    factoring: { remitName: null, remitAddress: null },
    branding: { accent: null },
  })),
  nextInvoiceNumber: vi.fn(async () => "THD-INV-1001"),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(async () => ({
    id: "load-1", customer_id: "cust-1", status: "pod_received", reference: "THD-1001",
    linehaul_cents: 240000, fuel_surcharge_cents: 0, accessorials: [], factored: false,
  })),
  getLoadStops: vi.fn(async () => [
    { type: "pickup", city: "Kent", state: "WA" },
    { type: "delivery", city: "Boise", state: "ID" },
  ]),
  changeLoadStatus: vi.fn(),
}))
vi.mock("../customers", () => ({
  getCustomer: vi.fn(async () => ({
    id: "cust-1", name: "Cascade Produce Co.", billing_email: "ap@cascade.test",
    payment_terms_days: 30, factored: false,
  })),
}))
vi.mock("../documents", () => ({
  listDocuments: vi.fn(async () => []),
  storeGeneratedPdf: vi.fn(async () => "/generated/THD-INV-1001.pdf"),
}))
vi.mock("../pdf", () => ({ buildInvoicePdf: vi.fn(async () => new Uint8Array([1])) }))
vi.mock("../money", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../money")>()
  return { ...actual, invoiceTotalCents: vi.fn(() => 240000) }
})
vi.mock("../types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../types")>()
  return { ...actual, loadTotalCents: vi.fn(() => 240000) }
})
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => false),
  createMailTransport: vi.fn(),
  mailFrom: vi.fn(() => "billing@test"),
}))

import { createInvoiceFromLoad } from "../invoices"

describe("createInvoiceFromLoad — double-invoice race", () => {
  beforeEach(() => {
    queryOneMock.mockReset()
  })

  it("reports the winner's invoice number instead of inserting a second invoice", async () => {
    // Pre-check (before INSERT): no invoice yet, from this caller's point of view.
    queryOneMock.mockResolvedValueOnce(null)
    // Post-conflict re-fetch: a concurrent request already landed one.
    queryOneMock.mockResolvedValueOnce({ id: "inv-winner", number: "THD-INV-1001" })

    await expect(
      createInvoiceFromLoad("carrier-1", "load-1", { id: "u1", name: "Office" })
    ).rejects.toThrow("Already invoiced as THD-INV-1001")
  })
})
