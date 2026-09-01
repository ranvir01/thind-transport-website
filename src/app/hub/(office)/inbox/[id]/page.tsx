import { notFound } from "next/navigation"
import { listCustomers } from "@/lib/hub/customers"
import { listDrivers } from "@/lib/hub/drivers"
import { listTrucks, listTrailers } from "@/lib/hub/fleet"
import { query } from "@/lib/hub/db"
import { requireOfficeUser } from "@/lib/hub/session"
import { getIntakeDraft } from "@/lib/hub/intake-drafts"
import { BackLink, PageHeader, Panel } from "@/components/hub/ui"
import { InboxReview } from "@/components/hub/InboxReview"
import type { PriceBookOption } from "@/components/hub/LoadForm"

export const dynamic = "force-dynamic"

export default async function InboxDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireOfficeUser()
  const draft = await getIntakeDraft(user.carrierId, id)
  if (!draft) notFound()

  const [customers, drivers, trucks, trailers, priceBook] = await Promise.all([
    listCustomers(user.carrierId),
    listDrivers(user.carrierId),
    listTrucks(user.carrierId),
    listTrailers(user.carrierId),
    query<PriceBookOption>(
      `SELECT id, name, default_amount_cents, unit FROM hub.accessorial_types
       WHERE carrier_id = $1 AND active = TRUE ORDER BY name`,
      [user.carrierId]
    ),
  ])

  return (
    <div>
      <BackLink href="/hub/inbox" label="Inbox" />
      <PageHeader
        title={draft.subject || "Emailed rate con"}
        subtitle={`From ${draft.from_address || "unknown sender"} — check every field before booking.`}
      />

      {draft.status !== "pending" ? (
        <Panel className="mb-4 p-4">
          <p className="text-body-sm text-fg-2">
            This draft was already {draft.status}
            {draft.created_load_id ? " and became a load" : ""}. Booking it again would create a duplicate.
          </p>
        </Panel>
      ) : null}

      {draft.document_url ? (
        <Panel className="mb-4 p-4">
          <a href={draft.document_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent-text hover:underline">
            Open the original attachment{draft.document_name ? ` (${draft.document_name})` : ""}
          </a>
        </Panel>
      ) : null}

      {draft.confidence === "unreadable" ? (
        <Panel className="mb-4 p-4">
          <p className="text-body-sm text-fg-2">
            No text could be read out of this attachment — most likely a scan or a photo. Open it above and fill the
            form in by hand; the file is saved either way.
          </p>
        </Panel>
      ) : null}

      <InboxReview
        draftId={draft.id}
        parsed={draft.parsed}
        rawText={draft.raw_text}
        customers={customers.map((c) => ({ id: c.id, label: c.name, mc: c.mc_number }))}
        drivers={drivers.filter((d) => d.status === "active").map((d) => ({ id: d.id, label: `${d.first_name} ${d.last_name}` }))}
        trucks={trucks.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number}` }))}
        trailers={trailers.filter((t) => t.status !== "retired").map((t) => ({ id: t.id, label: `#${t.unit_number} · ${t.type.replace("_", " ")}` }))}
        priceBook={priceBook}
      />
    </div>
  )
}
