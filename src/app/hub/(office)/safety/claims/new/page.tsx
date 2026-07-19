import { requirePermissionPage } from "@/lib/hub/session"
import { listLoads } from "@/lib/hub/loads"
import { listIncidents } from "@/lib/hub/incidents"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { ClaimForm } from "@/components/hub/ClaimForm"

export const dynamic = "force-dynamic"

export default async function NewClaimPage() {
  const user = await requirePermissionPage("compliance:write")
  const [loads, incidents] = await Promise.all([
    listLoads(user.carrierId),
    listIncidents(user.carrierId, { limit: 50 }),
  ])

  return (
    <div>
      <BackLink href="/hub/safety/claims" label="Claims" />
      <PageHeader
        title="Open a claim"
        subtitle="Get it on file with a deadline before the paperwork scatters."
      />
      <ClaimForm
        claimId={null}
        initial={{
          kind: "cargo",
          status: "open",
          loadId: "",
          incidentId: "",
          amount: "",
          filingDeadline: "",
          notes: "",
        }}
        loads={loads.map((l) => ({
          id: l.id,
          label: `${l.reference}${l.customer_name ? ` — ${l.customer_name}` : ""}`,
        }))}
        incidents={incidents.map((i) => ({
          id: i.id,
          label: `${new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${i.location ? ` — ${i.location}` : ""}`,
        }))}
      />
    </div>
  )
}
