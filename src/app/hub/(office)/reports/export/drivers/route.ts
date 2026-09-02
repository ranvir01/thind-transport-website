import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { resolvePnlRange, driverPnlRange, driverPnlRangeCsv } from "@/lib/hub/reports"

export const dynamic = "force-dynamic"

/**
 * Date-range per-driver P&L CSV — the driver half of ../route.ts. Same range
 * params and the same money:read gate: driver pay is payroll.
 */
export async function GET(req: Request) {
  const user = await getActiveHubUser()
  if (!user || !can(user.role, "money:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const params = new URL(req.url).searchParams
  const range = resolvePnlRange(params.get("from"), params.get("to"))
  const rows = await driverPnlRange(user.carrierId, range)
  const { filename, csv } = driverPnlRangeCsv(rows, range)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
