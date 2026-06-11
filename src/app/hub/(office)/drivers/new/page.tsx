import { PageHeader, BackLink } from "@/components/hub/ui"
import { DriverForm } from "@/components/hub/DriverForm"
import { emptyDriver } from "@/lib/hub/form-defaults"

export default function NewDriverPage() {
  return (
    <div>
      <BackLink href="/hub/drivers" label="Drivers" />
      <PageHeader title="Add Driver" subtitle="Approved applicants from the website land here too." />
      <DriverForm initial={emptyDriver()} />
    </div>
  )
}
