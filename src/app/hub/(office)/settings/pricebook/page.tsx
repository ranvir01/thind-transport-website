import { query } from "@/lib/hub/db"
import { requirePermissionPage } from "@/lib/hub/session"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { PriceBookEditor, type PriceBookRow } from "@/components/hub/MoneyForms"

export const dynamic = "force-dynamic"

export default async function PriceBookPage() {
  const user = await requirePermissionPage("money:write")
  const entries = await query<PriceBookRow>(
    `SELECT id, name, default_amount_cents, unit, active FROM hub.accessorial_types
     WHERE carrier_id = $1 ORDER BY name`,
    [user.carrierId]
  )

  return (
    <div>
      <BackLink href="/hub/money" label="Money" />
      <PageHeader
        title="Accessorial Price Book"
        subtitle="Defaults offered when booking: detention, layover, TONU, stop-offs, tarp, lumper pass-through."
      />
      <PriceBookEditor entries={entries} />
    </div>
  )
}
