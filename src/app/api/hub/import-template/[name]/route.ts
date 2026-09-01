import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"

const ALLOWED = new Set([
  "drivers.csv",
  "trucks.csv",
  "trailers.csv",
  "customers.csv",
  "pay-tariffs.csv",
  "recurring-transactions.csv",
  "open-ar.csv",
  "loadboard.csv",
  "fuel.csv",
  "tolls.csv",
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getActiveHubUser()
  if (!user || !can(user.role, "imports:run")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name } = await params
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), "docs", "production-intake", "templates", name)
  const csv = await fs.readFile(filePath, "utf8")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}
