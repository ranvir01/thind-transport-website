/**
 * Documents & file-serving subsystem audit pins (AGENTS.md: every query
 * carrier-scoped; a signed-in user of carrier B must never touch carrier A's
 * files).
 *
 * - fileOwnerCarrierId: the /api/hub/files/[name] tenancy gate resolves the
 *   owning carrier from ALL THREE producers of local file URLs (document
 *   uploads, generated invoice PDFs, settlement statements), applies
 *   path.basename to the client-supplied name, and refuses unclaimed files.
 * - deleteDocument: carrier-scoped DELETE, and the stored bytes are removed
 *   too — a deleted document must stop being fetchable at its old URL.
 * (The static write sweep lives in documents-write-tenancy.test.ts — this
 * file mocks fs, which would break the sweep's directory walk.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

const { unlinkMock, delMock } = vi.hoisted(() => ({
  unlinkMock: vi.fn(async () => undefined),
  delMock: vi.fn(async () => undefined),
}))

vi.mock("fs", () => ({
  promises: {
    unlink: unlinkMock,
    mkdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
    readFile: vi.fn(async () => Buffer.from("")),
  },
}))
vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: delMock }))
vi.mock("../db", () => ({ query: vi.fn(async () => []) }))

import { query } from "../db"
import { deleteDocument, fileOwnerCarrierId } from "../documents"

const queryMock = vi.mocked(query)

const CARRIER = "11111111-1111-1111-1111-111111111111"

beforeEach(() => {
  queryMock.mockClear()
  queryMock.mockResolvedValue([])
  unlinkMock.mockClear()
  delMock.mockClear()
  delete process.env.BLOB_READ_WRITE_TOKEN
})

describe("fileOwnerCarrierId — the tenancy gate for /api/hub/files/[name]", () => {
  it("checks every producer of local file URLs: documents, invoice PDFs, settlement statements", async () => {
    await fileOwnerCarrierId("abc.pdf")
    const [sql, params] = queryMock.mock.calls[0]
    expect(String(sql)).toContain("FROM hub.documents WHERE url = $1")
    expect(String(sql)).toContain("FROM hub.invoices WHERE pdf_url = $1")
    expect(String(sql)).toContain("FROM hub.settlements WHERE statement_url = $1")
    expect(params).toEqual(["/api/hub/files/abc.pdf"])
  })

  it("flattens a traversal-shaped name to its basename before the lookup", async () => {
    await fileOwnerCarrierId("../../secrets/env")
    const [, params] = queryMock.mock.calls[0]
    expect(params).toEqual(["/api/hub/files/env"])
  })

  it("returns null for a file no table claims — unclaimed files are not served", async () => {
    expect(await fileOwnerCarrierId("orphan.pdf")).toBeNull()
  })

  it("returns the owning carrier when a row claims the file", async () => {
    queryMock.mockResolvedValueOnce([{ carrier_id: CARRIER }])
    expect(await fileOwnerCarrierId("abc.pdf")).toBe(CARRIER)
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
    const target = unlinkMock.mock.calls[0][0] as string
    expect(target.endsWith(path.join("data", "uploads", "uuid-pod.jpg"))).toBe(true)
  })

  it("deletes the blob when the row was blob-stored and a token is configured", async () => {
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
