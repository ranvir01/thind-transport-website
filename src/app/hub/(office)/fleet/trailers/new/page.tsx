import { PageHeader, BackLink } from "@/components/hub/ui"
import { TrailerForm, emptyTrailer } from "@/components/hub/FleetForms"

export default function NewTrailerPage() {
  return (
    <div>
      <BackLink href="/hub/fleet?tab=trailers" label="Fleet" />
      <PageHeader title="Add Trailer" />
      <TrailerForm initial={emptyTrailer()} />
    </div>
  )
}
