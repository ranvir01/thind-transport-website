import { PageHeader } from "@/components/hub/ui"
import { SetupGuide } from "@/components/hub/SetupGuide"
import { SmartSetup } from "@/components/hub/SmartSetup"
import { requireOfficeUser } from "@/lib/hub/session"
import { queryOne } from "@/lib/hub/db"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  const user = await requireOfficeUser()
  const row = await queryOne<{ trucks: string; drivers: string; customers: string; packet: string }>(
    `SELECT
       (SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL) AS trucks,
       (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL) AS drivers,
       (SELECT COUNT(*) FROM hub.customers WHERE carrier_id = $1 AND deleted_at IS NULL) AS customers,
       (SELECT COUNT(*) FROM hub.documents WHERE carrier_id = $1 AND entity_type = 'carrier') AS packet`,
    [user.carrierId]
  )

  return (
    <div>
      <PageHeader
        title="Smart Setup"
        subtitle="Upload paperwork once — LoadOff extracts the fields, verifies brokers through FMCSA, and builds your workspace. New here? Read the full playbook first."
        action={
          <Link
            href="/hub/guide"
            className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-hover"
          >
            Setup guide
          </Link>
        }
      />
      <div className="mb-6">
        <SetupGuide compact />
      </div>
      <SmartSetup
        progress={{
          trucks: Number(row?.trucks ?? 0),
          drivers: Number(row?.drivers ?? 0),
          customers: Number(row?.customers ?? 0),
          packetDocs: Number(row?.packet ?? 0),
        }}
      />
    </div>
  )
}
