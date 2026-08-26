/**
 * Regression: when SMTP was unconfigured, createInvoiceFromLoad returned early
 * after inserting the invoice and never moved the load to "invoiced" — the
 * dispatch board kept offering invoice creation (duplicate risk) and workflow
 * views showed the load as still delivered.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { changeLoadStatus, isEmailConfigured } = vi.hoisted(() => ({
  changeLoadStatus: vi.fn(),
  isEmailConfigured: vi.fn(),
}))

vi.mock("../db", () => ({
  query: vi.fn(async (sql: string) =>
    sql.includes("INSERT INTO hub.invoices")
      ? [{ id: "inv-1", number: "THD-INV-1001", status: "draft" }]
      : []
  ),
  queryOne: vi.fn(async () => null),
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
  changeLoadStatus,
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
  isEmailConfigured,
  mailShouldSend: async () => isEmailConfigured(),
  createMailTransport: vi.fn(),
  mailFrom: vi.fn(() => "billing@test"),
}))
vi.mock("../mode", () => ({ isSimulation: vi.fn(async () => false) }))

import { createInvoiceFromLoad } from "../invoices"

describe("createInvoiceFromLoad without SMTP", () => {
  beforeEach(() => {
    changeLoadStatus.mockClear()
    isEmailConfigured.mockReturnValue(false)
  })

  it("still moves the load to invoiced and surfaces the email warning", async () => {
    const result = await createInvoiceFromLoad("carrier-1", "load-1", { id: "u1", name: "Office" })

    expect(result.emailed).toBe(false)
    expect(result.error).toMatch(/Email not configured/)
    expect(changeLoadStatus).toHaveBeenCalledWith("carrier-1", "load-1", "invoiced", { id: "u1", name: "Office" })
  })
})
