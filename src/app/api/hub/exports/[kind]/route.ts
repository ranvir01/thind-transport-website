import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { exportCsv } from "@/lib/hub/expenses"
import { accidentRegisterCsv } from "@/lib/hub/incidents"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const user = await getHubUser()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { kind } = await params

  // Safety exports gate on compliance, money exports on money.
  if (kind === "accident-register") {
    if (!can(user.role, "compliance:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const csv = await accidentRegisterCsv(user.carrierId)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="accident-register.csv"`,
      },
    })
  }

  if (!can(user.role, "money:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { filename, csv } = await exportCsv(user.carrierId, kind)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 400 }
    )
  }
}
