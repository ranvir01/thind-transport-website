import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { localUploadPath, resolveHubFile, blobPathnameFor } from "@/lib/hub/documents"
import { portalFileVisible } from "@/lib/hub/portal"

const isAbsolute = (url: string) => /^https?:\/\//i.test(url)

/** A legacy row's URL must point at the Vercel Blob store and nowhere else. */
function isBlobHost(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === "https:" && hostname.endsWith(".blob.vercel-storage.com")
  } catch {
    return false
  }
}

/**
 * Serves stored Hub documents — local disk in dev, Vercel Blob in production.
 * This route is the ONLY way bytes leave storage: blobs are written
 * `access: 'private'` (src/lib/hub/documents.ts), so an unguessable link that
 * has been forwarded into broker email or a factoring packet is worthless
 * without a session, and deleting the row revokes access.
 *
 * Auth required, and the file must belong to the requester's carrier —
 * a signed-in driver or portal user of carrier B must never read carrier A's
 * PODs, CDL scans, or settlement statements by URL. External broker/shipper
 * accounts are held to the portal contract on top of tenancy: only files the
 * portal itself surfaces for THEIR customer (POD/BOL, packet docs, their
 * invoice PDFs) — same-carrier is not enough for an external party.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getHubUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name } = await params
  const file = await resolveHubFile(name)
  if (!file?.carrierId || (user.role !== "platform_admin" && file.carrierId !== user.carrierId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (
    (user.role === "broker" || user.role === "shipper") &&
    !(await portalFileVisible(user.carrierId, user.id, name))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const mime =
    ext === "pdf" ? "application/pdf"
    : ext === "png" ? "image/png"
    : ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : "application/octet-stream"
  // The extension allowlist above is the ONLY source of Content-Type — never the
  // type stored on the blob or echoed by the legacy fetch. Those come from the
  // uploader's `file.type`. Until now blob bytes were served from
  // *.blob.vercel-storage.com, a foreign origin where a `text/html` upload could
  // not touch a hub session; they now leave from the hub's OWN origin, so
  // honouring an uploader-chosen type here would be stored XSS against every
  // signed-in user. Anything unrecognised downloads as octet-stream.
  const headers = {
    "Content-Type": mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600",
  }
  try {
    // LEGACY PUBLIC BLOBS: rows written while uploads were `access: 'public'`
    // hold the absolute https://<store>.public.blob.vercel-storage.com/... URL.
    // Those objects are STILL WORLD-READABLE at that URL and need a one-time
    // migration (re-upload private + rewrite hub.documents.url,
    // hub.invoices.pdf_url, hub.settlements.statement_url). Serve them as-is
    // meanwhile so old PODs, invoices and statements keep opening.
    // Only the blob host: this endpoint proxies with the caller's auth already
    // spent, so it must never be talked into fetching an arbitrary URL.
    if (isAbsolute(file.url)) {
      if (!isBlobHost(file.url)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const res = await fetch(file.url)
      if (!res.ok || !res.body) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return new NextResponse(res.body, { headers })
    }
    // hub.documents carries `storage`; generated invoice/settlement PDFs have no
    // such column, so fall back to the same rule storeGeneratedPdf wrote them by.
    const storage = file.storage ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local")
    if (storage === "blob") {
      const { get } = await import("@vercel/blob")
      const blob = await get(blobPathnameFor(file.url), { access: "private" })
      if (!blob || blob.statusCode !== 200) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return new NextResponse(blob.stream, { headers })
    }
    const filePath = localUploadPath(name)
    const data = await fs.readFile(filePath)
    return new NextResponse(new Uint8Array(data), { headers })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
