import { PageHeader } from "@/components/hub/ui"
import { ImportWizard } from "@/components/hub/ImportWizard"

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Bring your Excel load history into the Hub — customers are created automatically."
      />
      <ImportWizard />
    </div>
  )
}
