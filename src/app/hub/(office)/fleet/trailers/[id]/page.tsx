import { notFound } from "next/navigation"
import { getTrailer } from "@/lib/hub/fleet"
import { requireOfficeUser } from "@/lib/hub/session"
import { listDocuments } from "@/lib/hub/documents"
import { PageHeader, BackLink } from "@/components/hub/ui"
import { TrailerForm, type TrailerFormState } from "@/components/hub/FleetForms"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"

export const dynamic = "force-dynamic"

export default async function TrailerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const trailer = await getTrailer(user.carrierId, id).catch(() => null)
  if (!trailer) notFound()
  const documents = await listDocuments(user.carrierId, "trailer", id)

  const initial: TrailerFormState = {
    unit_number: trailer.unit_number,
    vin: trailer.vin ?? "",
    plate: trailer.plate ?? "",
    plate_state: trailer.plate_state ?? "",
    year: trailer.year?.toString() ?? "",
    make: trailer.make ?? "",
    type: trailer.type,
    status: trailer.status,
    registration_expiry: trailer.registration_expiry?.toString().slice(0, 10) ?? "",
    inspection_due: trailer.inspection_due?.toString().slice(0, 10) ?? "",
    notes: trailer.notes ?? "",
  }

  return (
    <div>
      <BackLink href="/hub/fleet?tab=trailers" label="Fleet" />
      <PageHeader title={`Trailer #${trailer.unit_number}`} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrailerForm trailerId={id} initial={initial} />
        <div className="max-w-2xl">
          <DocumentsPanel entityType="trailer" entityId={id} documents={documents} />
        </div>
      </div>
    </div>
  )
}
