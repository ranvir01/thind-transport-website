import { NextResponse } from "next/server"
import { getActiveHubUser } from "@/lib/hub/session"
import { can } from "@/lib/hub/permissions"
import { getCustomerStatementDetail } from "@/lib/hub/invoices"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { buildStatementPdf } from "@/lib/hub/pdf"
import { isSimulation } from "@/lib/hub/mode"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getActiveHubUser()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!can(user.role, "money:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { customerId } = await params
  const statement = await getCustomerStatementDetail(user.carrierId, customerId)
  if (!statement) return NextResponse.json({ error: "No open statement for this customer" }, { status: 404 })
  const carrier = await getCarrier(user.carrierId)
  const settings = await getCarrierSettings(user.carrierId)

  const pdfBytes = await buildStatementPdf({
    brand: {
      name: carrier?.name ?? "Thind Transport", address: carrier?.address, phone: carrier?.phone,
      email: carrier?.email, dot: carrier?.dot_number, mc: carrier?.mc_number,
      accent: settings.branding.accent,
    },
    customerName: statement.customerName,
    statementDate: new Date().toISOString().slice(0, 10),
    invoices: statement.invoices.map((inv) => ({
      number: inv.number, loadReference: inv.load_reference ?? "—", dueOn: String(inv.due_on).slice(0, 10),
      bucket: inv.bucket, openCents: inv.open_cents,
    })),
    totalOpenCents: statement.totalOpenCents,
    simulation: await isSimulation(),
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="statement-${statement.customerName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
    },
  })
}
