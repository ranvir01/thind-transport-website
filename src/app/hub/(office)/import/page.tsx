import { PageHeader } from "@/components/hub/ui"
import { ImportHub } from "@/components/hub/ImportHub"

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
        subtitle="Connect a source or bring a file — map columns once, reuse forever."
      />
      <ImportHub initialKind={kind} />
    </div>
  )
}
