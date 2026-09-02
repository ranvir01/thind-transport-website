import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { query } from "./db"
import type { DocumentKind, HubDocument } from "./types"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

/** Every hub object lives under this blob pathname prefix. */
const BLOB_PREFIX = "hub/"

/** True for a legacy stored URL: the absolute public blob URL, not our internal one. */
function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * The blob pathname for a stored URL. New rows hold `/api/hub/files/<safeName>`
 * and the blob lives at `hub/<safeName>`; legacy rows hold the absolute blob URL,
 * which the SDK accepts in place of a pathname.
 */
export function blobPathnameFor(url: string): string {
  return isAbsoluteUrl(url) ? url : `${BLOB_PREFIX}${path.basename(url)}`
}

/**
 * Store a file: Vercel Blob when BLOB_READ_WRITE_TOKEN is configured (production),
 * local disk under data/uploads otherwise (development).
 *
 * Both branches return the SAME internal URL, `/api/hub/files/<safeName>`, so every
 * byte leaves through /api/hub/files/[name], which checks session + owning carrier +
 * the portal ACL. Blobs are written `access: 'private'`: PODs, CDL scans, medical
 * cards, W-9s and settlement statements are driver PII and must not be readable by
 * anyone holding the link. A forwarded link is now useless without a session, and
 * deleting the row revokes access.
 */
async function storeFile(file: File): Promise<{ storage: "local" | "blob"; url: string }> {
  const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob")
    await put(`${BLOB_PREFIX}${safeName}`, file, { access: "private" })
    return { storage: "blob", url: `/api/hub/files/${safeName}` }
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

/**
 * Store a generated file (e.g. a PDF) as a hub document URL without a DB row.
 * Same treatment as uploads: private blob, internal URL. Invoice PDFs and
 * settlement statements carry customer rates and driver pay.
 */
export async function storeGeneratedPdf(fileName: string, bytes: Uint8Array): Promise<string> {
  const safeName = `${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob")
    await put(`${BLOB_PREFIX}${safeName}`, Buffer.from(bytes), {
      access: "private",
      contentType: "application/pdf",
    })
    return `/api/hub/files/${safeName}`
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, safeName), Buffer.from(bytes))
  return `/api/hub/files/${safeName}`
}

/**
 * Raw bytes for a stored file, read the way the SERVER can read them.
 *
 * Server-side consumers (packet email, invoice email with POD/BOL, factoring
 * packet) must call this instead of `fetch()`ing the stored url. Stored urls are
 * now `/api/hub/files/<safeName>`: relative, so `fetch()` throws outright, and
 * even absolutised against NEXTAUTH_URL that route demands a session an outbound
 * server fetch does not carry — it would 401 and, because every one of those call
 * sites swallows attachment errors, the email would ship silently missing its POD.
 * Read the bytes directly instead; the caller has already proven tenancy.
 *
 * Returns null rather than throwing: attachments stay best-effort.
 */
export async function readStoredFileBytes(
  url: string,
  storage: "local" | "blob" | null
): Promise<Buffer | null> {
  try {
    // Legacy rows still hold the absolute public blob URL — fetchable as-is.
    if (isAbsoluteUrl(url)) {
      const res = await fetch(url)
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null
    }
    // Generated PDFs have no storage column; fall back to the rule they were written by.
    const where = storage ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local")
    if (where === "blob") {
      const { get } = await import("@vercel/blob")
      const blob = await get(blobPathnameFor(url), { access: "private" })
      if (!blob || blob.statusCode !== 200) return null
      return Buffer.from(await new Response(blob.stream).arrayBuffer())
    }
    return await fs.readFile(localUploadPath(url))
  } catch {
    return null
  }
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

/**
 * Remove a stored file's bytes. Best-effort by design: callers have already
 * deleted (or are about to delete) the row, which is the authoritative act —
 * a file whose row is gone is unreachable through /api/hub/files either way.
 */
export async function deleteStoredFile(url: string, storage: string | null): Promise<void> {
  try {
    if (storage === "blob") {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { del } = await import("@vercel/blob")
        // The row stores the internal URL, not the blob URL — delete by pathname.
        await del(blobPathnameFor(url))
      }
    } else {
      const name = url.split("/").pop()
      if (name) await fs.unlink(path.join(UPLOAD_DIR, path.basename(name)))
    }
  } catch {
    // Bytes already gone or storage unreachable; the row is the record.
  }
}

export async function deleteDocument(carrierId: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string; storage: string; url: string }>(
    `DELETE FROM hub.documents WHERE carrier_id = $1 AND id = $2 RETURNING id, storage, url`,
    [carrierId, id]
  )
  const doc = rows[0]
  if (!doc) return false
  // Remove the bytes too — a deleted document must stop being fetchable at its
  // old URL.
  await deleteStoredFile(doc.url, doc.storage)
  return true
}

export interface StoredHubFile {
  /** Owning carrier — the tenancy gate for /api/hub/files/[name]. */
  carrierId: string | null
  /** `hub.documents.storage`; null for generated PDFs, which have no such column. */
  storage: "local" | "blob" | null
  /** The URL exactly as stored: internal, or a legacy absolute blob URL. */
  url: string
}

/**
 * Which carrier owns a stored file, and where its bytes live. Exactly three
 * producers write `/api/hub/files/*` URLs: document uploads (hub.documents.url),
 * generated invoice PDFs (hub.invoices.pdf_url), and settlement statements
 * (hub.settlements.statement_url). A file no table claims is not served —
 * being signed in is not tenancy.
 *
 * LEGACY: rows written while blobs were `access: 'public'` hold the absolute
 * `https://<store>.public.blob.vercel-storage.com/hub/<safeName>` URL instead of
 * the internal one, so they are also matched on that `/hub/<safeName>` suffix —
 * an exact `right()` compare, never a LIKE suffix, because safeName contains `_`
 * and `_` is a LIKE wildcard that would cross-match another carrier's file.
 * Those objects are STILL PUBLIC and need a one-time migration: re-upload
 * private and rewrite the three url columns. Until then this only re-fronts them.
 */
export async function resolveHubFile(name: string): Promise<StoredHubFile | null> {
  const safeName = path.basename(name)
  const url = `/api/hub/files/${safeName}`
  const legacySuffix = `/${BLOB_PREFIX}${safeName}`
  const rows = await query<{ carrier_id: string | null; storage: string | null; url: string }>(
    `SELECT carrier_id, storage, url FROM hub.documents WHERE url = $1
       OR (url LIKE 'https://%' AND right(url, $3::int) = $2::text)
     UNION ALL
     SELECT carrier_id, NULL::text AS storage, pdf_url AS url FROM hub.invoices WHERE pdf_url = $1
       OR (pdf_url LIKE 'https://%' AND right(pdf_url, $3::int) = $2::text)
     UNION ALL
     SELECT carrier_id, NULL::text AS storage, statement_url AS url FROM hub.settlements WHERE statement_url = $1
       OR (statement_url LIKE 'https://%' AND right(statement_url, $3::int) = $2::text)
     LIMIT 1`,
    [url, legacySuffix, legacySuffix.length]
  )
  const row = rows[0]
  if (!row) return null
  return {
    carrierId: row.carrier_id ?? null,
    storage: row.storage === "blob" || row.storage === "local" ? row.storage : null,
    url: row.url,
  }
}

export function localUploadPath(fileName: string): string {
  // Prevent path traversal — serve only flat files from the upload dir.
  return path.join(UPLOAD_DIR, path.basename(fileName))
}
