import type { Metadata } from "next"
import { requireOwner } from "@/lib/hub/session"
import { listCustomFields } from "@/lib/hub/custom-fields-db"
import { PageHeader } from "@/components/hub/ui"
import { CustomFieldsManager } from "@/components/hub/CustomFieldsManager"

export const metadata: Metadata = { title: "Your fields" }
export const dynamic = "force-dynamic"

export default async function CustomFieldsPage() {
  const user = await requireOwner()
  const defs = await listCustomFields(user.carrierId, undefined, { includeArchived: false })
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Your fields"
        subtitle="Shape LoadOff around your operation — add the fields your loads, drivers, trucks and brokers actually need."
      />
      <CustomFieldsManager defs={defs} />
    </div>
  )
}
