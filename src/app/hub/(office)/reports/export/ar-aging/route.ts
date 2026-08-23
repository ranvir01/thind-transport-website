import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { arAgingTrend, arAgingTrendCsv } from "@/lib/hub/reports"

export const dynamic = "force-dynamic"

/**
 * AR aging trend CSV, matching the owner-dashboard bars panel. ?weeks=
 * defaults to 8 (the panel's window); non-numeric or out-of-range values
 * fall back to the default rather than erroring.
 */
export async function GET(req: Request) {
  const user = await getActiveHubUser()
  if (!user || !can(user.role, "money:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const weeksParam = Number(new URL(req.url).searchParams.get("weeks"))
  const weeks = Number.isInteger(weeksParam) && weeksParam > 0 && weeksParam <= 52 ? weeksParam : 8
  const rows = await arAgingTrend(user.carrierId, weeks)
  const { filename, csv } = arAgingTrendCsv(rows, weeks)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
