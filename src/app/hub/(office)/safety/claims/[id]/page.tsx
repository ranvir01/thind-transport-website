import Link from "next/link"
import { notFound } from "next/navigation"
import { requirePermissionPage } from "@/lib/hub/session"
import { getClaim } from "@/lib/hub/claims"
import { listLoads } from "@/lib/hub/loads"
import { listIncidents } from "@/lib/hub/incidents"
import { PageHeader, BackLink, Panel } from "@/components/hub/ui"
import { ClaimForm } from "@/components/hub/ClaimForm"

export const dynamic = "force-dynamic"

const KIND_TITLE: Record<string, string> = {
  cargo: "Cargo claim",
  property: "Property claim",
  injury: "Injury claim",
}

function toDateInput(value: string | Date | null): string {
  if (!value) return ""
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  return String(value).slice(0, 10)
}

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("compliance:read")
  const { id } = await params
  const claim = await getClaim(user.carrierId, id).catch(() => null)
  if (!claim) notFound()
  const [loads, incidents] = await Promise.all([
    listLoads(user.carrierId),
    listIncidents(user.carrierId, { limit: 50 }),
  ])

  return (
    <div>
      <BackLink href="/hub/safety/claims" label="Claims" />
      <PageHeader
        title={`${KIND_TITLE[claim.kind] ?? "Claim"}${claim.load_reference ? ` — ${claim.load_reference}` : ""}`}
        subtitle={`Opened ${new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ClaimForm
          claimId={id}
          initial={{
            kind: claim.kind,
            status: claim.status,
            loadId: claim.load_id ?? "",
            incidentId: claim.incident_id ?? "",
            amount: claim.amount_cents !== null ? (claim.amount_cents / 100).toFixed(2) : "",
            filingDeadline: toDateInput(claim.filing_deadline),
            notes: claim.notes ?? "",
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
        <div className="max-w-2xl space-y-3">
          {claim.load_id ? (
            <Panel className="p-4">
              <p className="text-body-xs font-bold uppercase tracking-wider text-fg-3 mb-1">Load</p>
              <Link href={`/hub/loads/${claim.load_id}`} className="font-semibold text-accent-text hover:underline">
                {claim.load_reference ?? "View load"}
              </Link>
              <p className="text-body-xs text-fg-3 mt-1">
                The POD, BOL, and photos live on the load — that&apos;s your claim evidence.
              </p>
            </Panel>
          ) : null}
          {claim.incident_id ? (
            <Panel className="p-4">
              <p className="text-body-xs font-bold uppercase tracking-wider text-fg-3 mb-1">Incident</p>
              <Link href={`/hub/safety/${claim.incident_id}`} className="font-semibold text-accent-text hover:underline">
                {claim.incident_occurred_at
                  ? new Date(claim.incident_occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "View incident"}
                {claim.incident_location ? ` — ${claim.incident_location}` : ""}
              </Link>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}
