import { PageHeader } from "@/components/hub/ui"
import { ImportWizard } from "@/components/hub/ImportWizard"

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { kind } = await searchParams
  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="The universal engine: loads, fuel, tolls, positions, IFTA mileage — map columns once, reuse forever."
      />
      <ImportWizard initialKind={kind ?? "loads"} />
    </div>
  )
}
