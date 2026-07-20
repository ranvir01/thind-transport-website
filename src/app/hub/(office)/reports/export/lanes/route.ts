import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { resolvePnlRange, laneLeaderboardRange, laneLeaderboardRangeCsv } from "@/lib/hub/reports"

export const dynamic = "force-dynamic"

/**
 * Date-range lane leaderboard CSV (M10), matching the Reports page table.
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD, both inclusive; malformed or missing params
 * fall back to the trailing 92 days. The all-time hub.lanes export stays at
 * /api/hub/exports/lanes.
 */
export async function GET(req: Request) {
  const user = await getHubUser()
  if (!user || !can(user.role, "money:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const params = new URL(req.url).searchParams
  const range = resolvePnlRange(params.get("from"), params.get("to"))
  const rows = await laneLeaderboardRange(user.carrierId, range, 1000)
  const { filename, csv } = laneLeaderboardRangeCsv(rows, range)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
