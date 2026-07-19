import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { localUploadPath, fileOwnerCarrierId } from "@/lib/hub/documents"

/**
 * Serves locally stored Hub documents (dev / non-Blob environments).
 * Auth required, and the file must belong to the requester's carrier —
 * a signed-in driver or portal user of carrier B must never read carrier A's
 * PODs, CDL scans, or settlement statements by URL.
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
  const owner = await fileOwnerCarrierId(name)
  if (!owner || (user.role !== "platform_admin" && owner !== user.carrierId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  try {
    const filePath = localUploadPath(name)
    const data = await fs.readFile(filePath)
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    const mime =
      ext === "pdf" ? "application/pdf"
      : ext === "png" ? "image/png"
      : ["jpg", "jpeg"].includes(ext) ? "image/jpeg"
      : ext === "webp" ? "image/webp"
      : "application/octet-stream"
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
