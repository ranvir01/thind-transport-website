import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { query } from "./db"
import type { DocumentKind, HubDocument } from "./types"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

/**
 * Store a file: Vercel Blob when BLOB_READ_WRITE_TOKEN is configured (production),
 * local disk under data/uploads otherwise (development).
 */
async function storeFile(file: File): Promise<{ storage: "local" | "blob"; url: string }> {
  const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob")
    const blob = await put(`hub/${safeName}`, file, { access: "public" })
    return { storage: "blob", url: blob.url }
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(UPLOAD_DIR, safeName), buffer)
  return { storage: "local", url: `/api/hub/files/${safeName}` }
}

export async function saveDocument(input: {
  carrierId: string
  entityType: HubDocument["entity_type"]
  entityId: string
  kind: DocumentKind
  file: File
  expiry?: string | null
  uploadedBy?: string | null
}): Promise<HubDocument> {
  const { storage, url } = await storeFile(input.file)
  const rows = await query<HubDocument>(
    `INSERT INTO hub.documents (carrier_id, entity_type, entity_id, kind, file_name, mime_type, size_bytes, storage, url, expiry, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.carrierId, input.entityType, input.entityId, input.kind, input.file.name,
      input.file.type || null, input.file.size, storage, url, input.expiry ?? null,
      input.uploadedBy ?? null,
    ]
  )
  return rows[0]
}

/** Store a generated file (e.g. a PDF) as a hub document URL without a DB row. */
export async function storeGeneratedPdf(fileName: string, bytes: Uint8Array): Promise<string> {
  const safeName = `${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob")
    const blob = await put(`hub/${safeName}`, Buffer.from(bytes), {
      access: "public",
      contentType: "application/pdf",
    })
    return blob.url
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, safeName), Buffer.from(bytes))
  return `/api/hub/files/${safeName}`
}

export async function listDocuments(
  carrierId: string,
  entityType: HubDocument["entity_type"],
  entityId: string
): Promise<HubDocument[]> {
  return query<HubDocument>(
    `SELECT * FROM hub.documents WHERE carrier_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY created_at DESC`,
    [carrierId, entityType, entityId]
  )
}

export async function deleteDocument(carrierId: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM hub.documents WHERE carrier_id = $1 AND id = $2 RETURNING id`,
    [carrierId, id]
  )
  return rows.length > 0
}

export function localUploadPath(fileName: string): string {
  // Prevent path traversal — serve only flat files from the upload dir.
  return path.join(UPLOAD_DIR, path.basename(fileName))
}
