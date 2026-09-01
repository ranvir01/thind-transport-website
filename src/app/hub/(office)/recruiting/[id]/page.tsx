import { notFound } from "next/navigation"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  applicantEvents, getApplicant, latestOffer, STAGE_LABELS,
} from "@/lib/hub/recruiting"
import { listDrivers } from "@/lib/hub/drivers"
import { listDocuments } from "@/lib/hub/documents"
import { PageHeader, BackLink, Panel } from "@/components/hub/ui"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import {
  ConvertPanel, OfferPanel, OrientationPanel, ReferralPanel,
} from "@/components/hub/ApplicantPanels"

export const dynamic = "force-dynamic"

export default async function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const applicant = await getApplicant(user.carrierId, id).catch(() => null)
  if (!applicant) notFound()

  const [events, offer, documents, drivers] = await Promise.all([
    applicantEvents(user.carrierId, id),
    latestOffer(user.carrierId, id),
    listDocuments(user.carrierId, "applicant", id),
    listDrivers(user.carrierId),
  ])

  const orientation = Array.isArray(applicant.orientation) ? applicant.orientation : []
  const ready =
    orientation.length > 0 &&
    orientation.every((i) => i.done) &&
    offer?.status === "signed" &&
    !applicant.converted_driver_id

  return (
    <div>
      <BackLink href="/hub/recruiting" label="Recruiting" />
      <PageHeader
        title={`${applicant.first_name} ${applicant.last_name}`}
        subtitle={[
          STAGE_LABELS[applicant.stage],
          applicant.phone,
          applicant.email,
          applicant.cdl_number ? `CDL ${applicant.cdl_number} (${applicant.cdl_state})` : null,
          applicant.years_experience ? `${applicant.years_experience} yrs experience` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="mb-4">
        <ReferralPanel
          applicantId={id}
          referrerName={applicant.referrer_name ?? null}
          drivers={drivers
            .filter((d) => d.status === "active")
            .map((d) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <OfferPanel
            applicantId={id}
            applicantName={`${applicant.first_name} ${applicant.last_name}`}
            offer={offer}
          />
          <OrientationPanel
            applicantId={id}
            items={orientation}
            offerSigned={offer?.status === "signed"}
          />
          <ConvertPanel
            applicantId={id}
            ready={ready}
            alreadyDriverId={applicant.converted_driver_id}
          />
        </div>

        <div className="space-y-4">
          <DocumentsPanel entityType="applicant" entityId={id} documents={documents} />

          {applicant.notes ? (
            <Panel className="p-4">
              <h2 className="text-[13.5px] font-semibold text-fg mb-2">Notes</h2>
              <p className="text-body-sm text-fg-2 whitespace-pre-wrap">{applicant.notes}</p>
            </Panel>
          ) : null}

          <Panel className="p-4">
            <h2 className="text-[13.5px] font-semibold text-fg mb-2">
              Pipeline history
            </h2>
            <ul className="space-y-1.5">
              {events.map((event, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-fg-2">
                    {event.from_stage ? `${STAGE_LABELS[event.from_stage]} → ` : ""}
                    <span className="font-semibold text-fg">{STAGE_LABELS[event.to_stage]}</span>
                    {event.note ? <span className="text-fg-3"> — {event.note}</span> : null}
                  </span>
                  <span className="shrink-0 text-[11px] text-fg-3">
                    {new Date(event.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {event.actor_name ? ` · ${event.actor_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {applicant.application ? (
            <Panel className="p-4">
              <h2 className="text-[13.5px] font-semibold text-fg mb-2">
                Website application
              </h2>
              <p className="text-body-xs text-fg-3 mb-2">
                Submitted through the public DOT wizard — the full payload rides along into the DQ file.
              </p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-fg-2">
                {JSON.stringify(applicant.application, null, 2)}
              </pre>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}
