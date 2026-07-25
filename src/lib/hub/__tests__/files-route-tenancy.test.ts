/**
 * /api/hub/files/[name] served any locally stored file to ANY signed-in hub
 * user — a driver or broker/shipper portal user of carrier B could read
 * carrier A's PODs, CDL scans, invoice PDFs, and settlement statements by
 * URL. Being signed in is not tenancy: the route must resolve the owning
 * carrier and refuse everyone else (platform_admin excepted).
 *
 * It is now also the chokepoint for BLOB-stored documents (production):
 * uploads are written `access: 'private'`, so every guard below must hold on
 * the blob branch too, and no blob may be fetched before they all pass.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { readFileMock, blobGetMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(async () => Buffer.from("%PDF-fake")),
  blobGetMock: vi.fn(async () => ({
    statusCode: 200 as const,
    stream: new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close() },
    }),
    blob: { contentType: "image/jpeg" },
  })),
}))

vi.mock("fs", () => ({ promises: { readFile: readFileMock } }))
vi.mock("@vercel/blob", () => ({ get: blobGetMock }))
vi.mock("@/lib/hub/session", () => ({ getHubUser: vi.fn() }))
vi.mock("@/lib/hub/documents", () => ({
  localUploadPath: vi.fn((name: string) => `/uploads/${name}`),
  blobPathnameFor: vi.fn((url: string) =>
    /^https?:\/\//i.test(url) ? url : `hub/${url.split("/").pop()}`
  ),
  resolveHubFile: vi.fn(async () => null),
}))
vi.mock("@/lib/hub/portal", () => ({
  portalFileVisible: vi.fn(async () => false),
}))

import { getHubUser } from "@/lib/hub/session"
import { resolveHubFile } from "@/lib/hub/documents"
import { portalFileVisible } from "@/lib/hub/portal"
import { GET } from "@/app/api/hub/files/[name]/route"

const getHubUserMock = vi.mocked(getHubUser)
const resolveMock = vi.mocked(resolveHubFile)
const portalVisibleMock = vi.mocked(portalFileVisible)

const CARRIER_A = "11111111-1111-1111-1111-111111111111"
const CARRIER_B = "22222222-2222-2222-2222-222222222222"

/** A local-disk row owned by `carrierId`. */
const local = (carrierId: string | null, name = "uuid-pod.pdf") =>
  ({ carrierId, storage: "local" as const, url: `/api/hub/files/${name}` })
/** A blob row owned by `carrierId` — production shape after uploads went private. */
const blob = (carrierId: string | null, name = "uuid-pod.pdf") =>
  ({ carrierId, storage: "blob" as const, url: `/api/hub/files/${name}` })

function request(name = "uuid-pod.pdf") {
  return GET(new Request("http://localhost/api/hub/files/" + name), {
    params: Promise.resolve({ name }),
  })
}

beforeEach(() => {
  getHubUserMock.mockReset()
  resolveMock.mockReset()
  resolveMock.mockResolvedValue(null)
  portalVisibleMock.mockReset()
  portalVisibleMock.mockResolvedValue(false)
  readFileMock.mockClear()
  blobGetMock.mockClear()
  delete process.env.BLOB_READ_WRITE_TOKEN
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
    resolveMock.mockResolvedValue(local(CARRIER_A))
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("404s a file no table claims, even for a signed-in office user", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("serves the file to a user of the owning carrier", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(local(CARRIER_A))
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    // Office users are governed by tenancy alone — the portal ACL never runs.
    expect(portalVisibleMock).not.toHaveBeenCalled()
  })

  it("404s a SAME-carrier broker for a file the portal does not surface (settlements, CDL scans, other customers' invoices)", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-broker", name: "Bree", role: "broker", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(local(CARRIER_A, "uuid-settlement.pdf"))
    portalVisibleMock.mockResolvedValue(false)
    const res = await request("uuid-settlement.pdf")
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
    expect(portalVisibleMock).toHaveBeenCalledWith(CARRIER_A, "u-broker", "uuid-settlement.pdf")
  })

  it("404s a same-carrier shipper too when the portal ACL refuses", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-ship", name: "Sam", role: "shipper", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(local(CARRIER_A))
    portalVisibleMock.mockResolvedValue(false)
    const res = await request()
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("serves a portal-visible file (their customer's POD/invoice, packet docs) to a broker", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-broker", name: "Bree", role: "broker", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(local(CARRIER_A))
    portalVisibleMock.mockResolvedValue(true)
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
  })

  it("serves any claimed file to platform_admin (the one role without a tenant)", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Admin", role: "platform_admin", carrierId: null })
    resolveMock.mockResolvedValue(local(CARRIER_A))
    const res = await request()
    expect(res.status).toBe(200)
  })
})

describe("/api/hub/files/[name] blob branch — the same guards, in production", () => {
  it("401s an UNAUTHENTICATED request and never reaches the blob store", async () => {
    getHubUserMock.mockResolvedValue(null)
    resolveMock.mockResolvedValue(blob(CARRIER_A))
    const res = await request()
    expect(res.status).toBe(401)
    expect(blobGetMock).not.toHaveBeenCalled()
  })

  it("404s a FOREIGN-CARRIER user and never reaches the blob store", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Mallory", role: "driver", carrierId: CARRIER_B })
    resolveMock.mockResolvedValue(blob(CARRIER_A))
    const res = await request()
    expect(res.status).toBe(404)
    expect(blobGetMock).not.toHaveBeenCalled()
  })

  it("404s a same-carrier broker the portal ACL refuses, without reaching the blob store", async () => {
    getHubUserMock.mockResolvedValue({ id: "u-broker", name: "Bree", role: "broker", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(blob(CARRIER_A, "uuid-cdl.jpg"))
    portalVisibleMock.mockResolvedValue(false)
    const res = await request("uuid-cdl.jpg")
    expect(res.status).toBe(404)
    expect(blobGetMock).not.toHaveBeenCalled()
  })

  it("streams the blob to the owning carrier, reading it PRIVATELY by hub/ pathname", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(blob(CARRIER_A, "uuid-pod.jpg"))
    const res = await request("uuid-pod.jpg")
    expect(res.status).toBe(200)
    expect(blobGetMock).toHaveBeenCalledWith("hub/uuid-pod.jpg", { access: "private" })
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=3600")
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("ignores the content type stored on the blob — an uploader cannot make this origin serve HTML", async () => {
    // file.type is uploader-supplied and @vercel/blob persists it, so a doc named
    // "invoice.pdf" can carry contentType text/html. These bytes now leave from the
    // hub's OWN origin (they used to come off *.blob.vercel-storage.com), so echoing
    // that type back would be stored XSS against every signed-in session.
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(blob(CARRIER_A, "invoice.pdf"))
    blobGetMock.mockResolvedValueOnce({
      statusCode: 200 as const,
      stream: new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(new Uint8Array([1])); c.close() },
      }),
      blob: { contentType: "text/html" },
    })
    const res = await request("invoice.pdf")
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("serves an unrecognised extension as octet-stream, never as the blob's own type", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(blob(CARRIER_A, "note.html"))
    blobGetMock.mockResolvedValueOnce({
      statusCode: 200 as const,
      stream: new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(new Uint8Array([1])); c.close() },
      }),
      blob: { contentType: "text/html" },
    })
    const res = await request("note.html")
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("404s when the blob is gone instead of throwing", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue(blob(CARRIER_A))
    blobGetMock.mockResolvedValueOnce(null as never)
    expect((await request()).status).toBe(404)
  })

  it("reads a generated invoice PDF (storage null) from blob when a token is configured", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue({ carrierId: CARRIER_A, storage: null, url: "/api/hub/files/INV.pdf" })
    expect((await request("INV.pdf")).status).toBe(200)
    expect(blobGetMock).toHaveBeenCalledWith("hub/INV.pdf", { access: "private" })
  })

  it("reads a generated invoice PDF from disk when no blob token is configured", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue({ carrierId: CARRIER_A, storage: null, url: "/api/hub/files/INV.pdf" })
    expect((await request("INV.pdf")).status).toBe(200)
    expect(blobGetMock).not.toHaveBeenCalled()
    expect(readFileMock).toHaveBeenCalled()
  })
})

describe("/api/hub/files/[name] legacy public-blob rows", () => {
  const LEGACY = "https://store.public.blob.vercel-storage.com/hub/uuid-pod.pdf"
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([9]), { headers: { "content-type": "application/pdf" } })
    )
    vi.stubGlobal("fetch", fetchMock)
  })

  it("still serves a row that holds an absolute blob URL, rather than 404ing", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue({ carrierId: CARRIER_A, storage: "blob", url: LEGACY })
    const res = await request()
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(LEGACY)
    expect(blobGetMock).not.toHaveBeenCalled()
  })

  it("still refuses a foreign carrier a legacy row — the guards run before the fetch", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Mallory", role: "driver", carrierId: CARRIER_B })
    resolveMock.mockResolvedValue({ carrierId: CARRIER_A, storage: "blob", url: LEGACY })
    const res = await request()
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("ignores the legacy response's content type too", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue({ carrierId: CARRIER_A, storage: "blob", url: LEGACY })
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([9]), { headers: { "content-type": "text/html" } })
    )
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("refuses an absolute URL that is not the blob store — this route is not an open proxy", async () => {
    getHubUserMock.mockResolvedValue({ id: "u1", name: "Dana", role: "owner", carrierId: CARRIER_A })
    resolveMock.mockResolvedValue({
      carrierId: CARRIER_A, storage: "blob", url: "http://169.254.169.254/latest/meta-data/",
    })
    const res = await request()
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
})
