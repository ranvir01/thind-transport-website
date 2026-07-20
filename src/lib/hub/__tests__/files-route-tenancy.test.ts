/**
 * /api/hub/files/[name] served any locally stored file to ANY signed-in hub
 * user — a driver or broker/shipper portal user of carrier B could read
 * carrier A's PODs, CDL scans, invoice PDFs, and settlement statements by
 * URL. Being signed in is not tenancy: the route must resolve the owning
 * carrier and refuse everyone else (platform_admin excepted).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(async () => Buffer.from("%PDF-fake")),
}))

vi.mock("fs", () => ({ promises: { readFile: readFileMock } }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/documents", () => ({
  localUploadPath: vi.fn((name: string) => `/uploads/${name}`),
  fileOwnerCarrierId: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/portal", () => ({
  portalFileVisible: vi.fn(async () => false),
}))

import { getHubUser } from "@/lib/hub/session"
import { fileOwnerCarrierId } from "@/lib/hub/documents"
import { portalFileVisible } from "@/lib/hub/portal"
import { GET } from "@/app/api/hub/files/[name]/route"

const getHubUserMock = vi.mocked(getHubUser)
const ownerMock = vi.mocked(fileOwnerCarrierId)
const portalVisibleMock = vi.mocked(portalFileVisible)

const CARRIER_A = "11111111-1111-1111-1111-111111111111"
const CARRIER_B = "22222222-2222-2222-2222-222222222222"

function request(name = "uuid-pod.pdf") {
  return GET(new Request("http://localhost/api/hub/files/" + name), {
    params: Promise.resolve({ name }),
  })
}

beforeEach(() => {
  getHubUserMock.mockReset()
  ownerMock.mockReset()
  ownerMock.mockResolvedValue(null)
  portalVisibleMock.mockReset()
  portalVisibleMock.mockResolvedValue(false)
  readFileMock.mockClear()
})

describe("/api/hub/files/[name] tenancy", () => {
  it("401s when not signed in, without touching disk", async () => {
    getHubUserMock.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(401)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("404s a signed-in user of ANOTHER carrier — cross-tenant read by URL is refused", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Mallory", role: "driver", carrierId: CARRIER_B })
    ownerMock.mockResolvedValue(CARRIER_A)
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("404s a file no table claims, even for a signed-in office user", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    ownerMock.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("serves the file to a user of the owning carrier", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    ownerMock.mockResolvedValue(CARRIER_A)
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    // Office users are governed by tenancy alone — the portal ACL never runs.
    expect(portalVisibleMock).not.toHaveBeenCalled()
  })

  it("404s a SAME-carrier broker for a file the portal does not surface (settlements, CDL scans, other customers' invoices)", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-broker", name: "Bree", role: "broker", carrierId: CARRIER_A })
    ownerMock.mockResolvedValue(CARRIER_A)
    portalVisibleMock.mockResolvedValue(false)
    const res = await request("uuid-settlement.pdf")
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
    expect(portalVisibleMock).toHaveBeenCalledWith(CARRIER_A, "u-broker", "uuid-settlement.pdf")
  })

  it("404s a same-carrier shipper too when the portal ACL refuses", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-ship", name: "Sam", role: "shipper", carrierId: CARRIER_A })
    ownerMock.mockResolvedValue(CARRIER_A)
    portalVisibleMock.mockResolvedValue(false)
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("serves a portal-visible file (their customer's POD/invoice, packet docs) to a broker", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-broker", name: "Bree", role: "broker", carrierId: CARRIER_A })
    ownerMock.mockResolvedValue(CARRIER_A)
    portalVisibleMock.mockResolvedValue(true)
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
  })

  it("serves any claimed file to platform_admin (the one role without a tenant)", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Admin", role: "platform_admin", carrierId: null })
    ownerMock.mockResolvedValue(CARRIER_A)
    const res = await request()
    expect(res.status).toBe(200)
  })
})
