import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import {
  ExportInputError,
  exportCsv,
  exportQboIif,
  exportQboIifInvoices,
  exportQboIifPayments,
  exportQboIifSettlements,
} from "@/lib/hub/expenses"
import { accidentRegisterCsv } from "@/lib/hub/incidents"
import { exportFuelSpendCsv } from "@/lib/hub/reports"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const user = await getActiveHubUser()
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

  if (kind === "fuel-spend") {
    const { filename, csv } = await exportFuelSpendCsv(user.carrierId)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const QBO_IIF_EXPORTERS = {
    "qbo-iif": exportQboIif,
    "qbo-iif-invoices": exportQboIifInvoices,
    "qbo-iif-payments": exportQboIifPayments,
    "qbo-iif-settlements": exportQboIifSettlements,
  } as const

  if (kind in QBO_IIF_EXPORTERS) {
    const { filename, iif } = await QBO_IIF_EXPORTERS[kind as keyof typeof QBO_IIF_EXPORTERS](user.carrierId)
    return new NextResponse(iif, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  // ?year= picks the 1099-NEC filing year; omitted falls back to last year
  // (the year Q1 files). Garbage is rejected by exportCsv, not defaulted.
  const yearParam = new URL(req.url).searchParams.get("year")
  try {
    const { filename, csv } = await exportCsv(user.carrierId, kind, {
      year: yearParam ? Number(yearParam) : undefined,
    })
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    // Only a bad ?year= is the caller's fault and safe to echo. A query
    // failure keeps its old behaviour (a 500 with nothing leaked) rather
    // than becoming a 400 that hands the client a database error message.
    if (err instanceof ExportInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
