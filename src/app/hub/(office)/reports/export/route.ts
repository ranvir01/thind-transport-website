import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { resolvePnlRange, truckPnlRange, truckPnlRangeCsv } from "@/lib/hub/reports"

export const dynamic = "force-dynamic"

/**
 * Date-range per-truck P&L CSV (M10 "date-range reports exportable to CSV").
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD, both inclusive; malformed or missing params
 * fall back to the trailing 92 days. The fixed-window exports stay at
 * /api/hub/exports/[kind].
 */
export async function GET(req: Request) {
  const user = await getActiveHubUser()
  if (!user || !can(user.role, "money:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const params = new URL(req.url).searchParams
  const range = resolvePnlRange(params.get("from"), params.get("to"))
  const rows = await truckPnlRange(user.carrierId, range)
  const { filename, csv } = truckPnlRangeCsv(rows, range)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
