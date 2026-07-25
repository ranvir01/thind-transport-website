/**
 * Documents & file-serving subsystem audit pins (AGENTS.md: every query
 * carrier-scoped; a signed-in user of carrier B must never touch carrier A's
 * files).
 *
 * - resolveHubFile: the /api/hub/files/[name] tenancy gate resolves the
 *   owning carrier from ALL THREE producers of file URLs (document uploads,
 *   generated invoice PDFs, settlement statements), applies path.basename to
 *   the client-supplied name, and refuses unclaimed files.
 * - storeFile/storeGeneratedPdf: blobs are written PRIVATE and both storage
 *   branches hand back the internal /api/hub/files/<safeName> URL, so no
 *   document is readable without a session.
 * - deleteDocument: carrier-scoped DELETE, and the stored bytes are removed
 *   too — a deleted document must stop being fetchable at its old URL.
 * (The static write sweep lives in documents-write-tenancy.test.ts — this
 * file mocks fs, which would break the sweep's directory walk.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

const { unlinkMock, delMock, putMock, getMock, readFileMock } = vi.hoisted(() => ({
  // Declared params so `.mock.calls[0][0]` is a typed string, not a never.
  unlinkMock: vi.fn(async (_target: string) => undefined),
  delMock: vi.fn(async () => undefined),
  putMock: vi.fn(async () => ({ url: "https://store.public.blob.vercel-storage.com/hub/x" })),
  getMock: vi.fn(),
  readFileMock: vi.fn(async (_target: string) => Buffer.from("")),
}))

vi.mock("fs", () => ({
  promises: {
    unlink: unlinkMock,
    mkdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
    readFile: readFileMock,
  },
}))
vi.mock("@vercel/blob", () => ({ put: putMock, del: delMock, get: getMock }))
vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import {
  deleteDocument, readStoredFileBytes, resolveHubFile, saveDocument, storeGeneratedPdf,
} from "../documents"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
  unlinkMock.mockClear()
  delMock.mockClear()
  putMock.mockClear()
  getMock.mockReset()
  readFileMock.mockClear()
  readFileMock.mockResolvedValue(Buffer.from(""))
  delete process.env.BLOB_READ_WRITE_TOKEN
})

describe("resolveHubFile — the tenancy gate for /api/hub/files/[name]", () => {
  it("checks every producer of file URLs: documents, invoice PDFs, settlement statements", async () => {
    await resolveHubFile("abc.pdf")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FROM hub.documents WHERE url = $1")
    expect(String(sql)).toContain("FROM hub.invoices WHERE pdf_url = $1")
    expect(String(sql)).toContain("FROM hub.settlements WHERE statement_url = $1")
    expect(params).toEqual(["/api/hub/files/abc.pdf", "/hub/abc.pdf", 12])
  })

  it("flattens a traversal-shaped name to its basename before the lookup", async () => {
    await resolveHubFile("../../secrets/env")
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual(["/api/hub/files/env", "/hub/env", 8])
  })

  it("matches a legacy absolute blob URL on an exact suffix compare, never a LIKE wildcard", async () => {
    await resolveHubFile("abc_1.pdf")
    const [sql, params] = queryMock.mock.calls[0]
    // safeName contains "_", which LIKE would treat as "any character" and could
    // cross-match another carrier's file — the suffix compare must be exact.
    expect(String(sql)).toContain("right(url, $3::int) = $2::text")
    expect(String(sql)).not.toContain("LIKE '%")
    expect((params as unknown[])[1]).toBe("/hub/abc_1.pdf")
    expect((params as unknown[])[2]).toBe("/hub/abc_1.pdf".length)
  })

  it("returns null for a file no table claims — unclaimed files are not served", async () => {
    expect(await resolveHubFile("orphan.pdf")).toBeNull()
  })

  it("returns the owning carrier and where the bytes live when a row claims the file", async () => {
    queryMock.mockResolvedValueOnce([
      { carrier_id: CARRIER, storage: "blob", url: "/api/hub/files/abc.pdf" },
    ])
    expect(await resolveHubFile("abc.pdf")).toEqual({
      carrierId: CARRIER,
      storage: "blob",
      url: "/api/hub/files/abc.pdf",
    })
  })

  it("reports storage null for generated invoice/settlement PDFs (no storage column)", async () => {
    queryMock.mockResolvedValueOnce([
      { carrier_id: CARRIER, storage: null, url: "/api/hub/files/THD-INV-1001.pdf" },
    ])
    expect((await resolveHubFile("THD-INV-1001.pdf"))?.storage).toBeNull()
  })
})

describe("uploads are never public — blobs are private and fronted by /api/hub/files", () => {
  const file = () =>
    new File([new Uint8Array([1, 2, 3])], "pod scan.jpg", { type: "image/jpeg" })

  it("saveDocument writes the blob PRIVATE under hub/ and stores the internal URL, not blob.url", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    queryMock.mockResolvedValueOnce([{ id: "doc-1" }])
    await saveDocument({
      carrierId: CARRIER, entityType: "load", entityId: "load-1", kind: "pod", file: file(),
    })
    const [pathname, , options] = putMock.mock.calls[0] as unknown as [string, unknown, { access: string }]
    expect(pathname.startsWith("hub/")).toBe(true)
    expect(options.access).toBe("private")

    const [, params] = queryMock.mock.calls[0]
    const storedUrl = (params as unknown[])[8] as string
    expect((params as unknown[])[7]).toBe("blob")
    expect(storedUrl.startsWith("/api/hub/files/")).toBe(true)
    expect(storedUrl).not.toContain("blob.vercel-storage.com")
    // The blob pathname is reconstructable from the stored URL.
    expect(pathname).toBe(`hub/${storedUrl.split("/").pop()}`)
  })

  it("storeGeneratedPdf keeps its bare-string contract but returns the internal URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    const url = await storeGeneratedPdf("THD-INV-1001.pdf", new Uint8Array([1]))
    const [pathname, , options] = putMock.mock.calls[0] as unknown as [
      string, unknown, { access: string; contentType: string },
    ]
    expect(options.access).toBe("private")
    expect(options.contentType).toBe("application/pdf")
    expect(url).toBe(`/api/hub/files/${pathname.slice("hub/".length)}`)
  })

  it("still stores the internal URL on the local-disk branch", async () => {
    queryMock.mockResolvedValueOnce([{ id: "doc-1" }])
    await saveDocument({
      carrierId: CARRIER, entityType: "load", entityId: "load-1", kind: "pod", file: file(),
    })
    const [, params] = queryMock.mock.calls[0]
    expect((params as unknown[])[7]).toBe("local")
    expect(String((params as unknown[])[8]).startsWith("/api/hub/files/")).toBe(true)
    expect(putMock).not.toHaveBeenCalled()
  })
})

/**
 * Stored urls are now the auth-gated /api/hub/files route, so the server-side
 * attachment paths (carrier packet email, invoice email with POD/BOL, factoring
 * packet) can no longer fetch() them: a relative url throws, and an absolutised
 * one 401s because an outbound server fetch carries no session. Every one of
 * those call sites swallows attachment errors, so the failure mode is a silent
 * email with the POD missing. readStoredFileBytes is the direct read they need.
 */
describe("readStoredFileBytes — server-side reads that bypass the HTTP route", () => {
  it("reads a blob-stored file PRIVATELY by pathname, never over HTTP", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    getMock.mockResolvedValueOnce({
      statusCode: 200,
      stream: new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(new Uint8Array([7, 8])); c.close() },
      }),
      blob: { contentType: "application/pdf" },
    })
    const bytes = await readStoredFileBytes("/api/hub/files/uuid-pod.pdf", "blob")
    expect(getMock).toHaveBeenCalledWith("hub/uuid-pod.pdf", { access: "private" })
    expect(bytes && new Uint8Array(bytes)).toEqual(new Uint8Array([7, 8]))
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("reads a local-stored file off disk by basename", async () => {
    const bytes = await readStoredFileBytes("/api/hub/files/uuid-pod.pdf", "local")
    expect(bytes).not.toBeNull()
    const target = readFileMock.mock.calls.at(-1)![0]
    expect(target.endsWith(path.join("data", "uploads", "uuid-pod.pdf"))).toBe(true)
  })

  it("falls back to blob for a generated PDF (storage null) when a token is configured", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    getMock.mockResolvedValueOnce({
      statusCode: 200,
      stream: new ReadableStream<Uint8Array>({ start(c) { c.close() } }),
      blob: { contentType: "application/pdf" },
    })
    await readStoredFileBytes("/api/hub/files/THD-INV-1001.pdf", null)
    expect(getMock).toHaveBeenCalledWith("hub/THD-INV-1001.pdf", { access: "private" })
  })

  it("still fetches a LEGACY absolute blob url, which is public and needs no session", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([4])))
    vi.stubGlobal("fetch", fetchMock)
    const url = "https://store.public.blob.vercel-storage.com/hub/legacy.pdf"
    const bytes = await readStoredFileBytes(url, "blob")
    expect(fetchMock).toHaveBeenCalledWith(url)
    expect(bytes && new Uint8Array(bytes)).toEqual(new Uint8Array([4]))
    vi.unstubAllGlobals()
  })

  it("returns null instead of throwing when the bytes are gone — attachments stay best-effort", async () => {
    readFileMock.mockRejectedValueOnce(new Error("ENOENT"))
    expect(await readStoredFileBytes("/api/hub/files/gone.pdf", "local")).toBeNull()
  })
})

describe("deleteDocument — carrier-scoped, and removes the bytes", () => {
  it("the DELETE itself is carrier-guarded and returns storage + url for cleanup", async () => {
    await deleteDocument(CARRIER, "doc-1")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("WHERE carrier_id = $1 AND id = $2")
    expect(String(sql)).toContain("RETURNING id, storage, url")
    expect(params).toEqual([CARRIER, "doc-1"])
  })

  it("returns false and touches no storage when the row is another carrier's", async () => {
    expect(await deleteDocument(CARRIER, "foreign-doc")).toBe(false)
    expect(unlinkMock).not.toHaveBeenCalled()
    expect(delMock).not.toHaveBeenCalled()
  })

  it("unlinks the local file named by the deleted row's url", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "doc-1", storage: "local", url: "/api/hub/files/uuid-pod.jpg" },
    ])
    expect(await deleteDocument(CARRIER, "doc-1")).toBe(true)
    expect(unlinkMock).toHaveBeenCalledTimes(1)
    const target = unlinkMock.mock.calls[0][0]
    expect(target.endsWith(path.join("data", "uploads", "uuid-pod.jpg"))).toBe(true)
  })

  it("deletes the blob by pathname — blob rows now store the internal URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    queryMock.mockResolvedValueOnce([
      { id: "doc-1", storage: "blob", url: "/api/hub/files/uuid-pod.jpg" },
    ])
    expect(await deleteDocument(CARRIER, "doc-1")).toBe(true)
    expect(delMock).toHaveBeenCalledWith("hub/uuid-pod.jpg")
    expect(unlinkMock).not.toHaveBeenCalled()
  })

  it("deletes a LEGACY blob row by its stored absolute URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "token"
    queryMock.mockResolvedValueOnce([
      { id: "doc-1", storage: "blob", url: "https://blob.example/hub/uuid-pod.jpg" },
    ])
    expect(await deleteDocument(CARRIER, "doc-1")).toBe(true)
    expect(delMock).toHaveBeenCalledWith("https://blob.example/hub/uuid-pod.jpg")
    expect(unlinkMock).not.toHaveBeenCalled()
  })

  it("still reports success when the bytes are already gone — the row delete is authoritative", async () => {
    queryMock.mockResolvedValueOnce([
      { id: "doc-1", storage: "local", url: "/api/hub/files/gone.pdf" },
    ])
    unlinkMock.mockRejectedValueOnce(new Error("ENOENT"))
    expect(await deleteDocument(CARRIER, "doc-1")).toBe(true)
  })
})
