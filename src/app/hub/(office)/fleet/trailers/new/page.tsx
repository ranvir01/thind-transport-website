import { PageHeader, BackLink } from "@/components/hub/ui"
import { TrailerForm } from "@/components/hub/FleetForms"
import { emptyTrailer } from "@/lib/hub/form-defaults"

export default function NewTrailerPage() {
  return (
    <div>
      <BackLink href="/hub/fleet?tab=trailers" label="Fleet" />
      <PageHeader
        title="Add Trailer"
        subtitle="Unit number and type first — then plate and inspection dates."
      />
      <TrailerForm initial={emptyTrailer()} />
    </div>
  )
}
