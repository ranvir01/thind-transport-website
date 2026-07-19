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

import { getHubUser } from "@/lib/hub/session"
import { fileOwnerCarrierId } from "@/lib/hub/documents"
import { GET } from "@/app/api/hub/files/[name]/route"

const getHubUserMock = vi.mocked(getHubUser)
const ownerMock = vi.mocked(fileOwnerCarrierId)

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
  })

  it("serves any claimed file to platform_admin (the one role without a tenant)", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Admin", role: "platform_admin", carrierId: null })
    ownerMock.mockResolvedValue(CARRIER_A)
    const res = await request()
    expect(res.status).toBe(200)
  })
})
