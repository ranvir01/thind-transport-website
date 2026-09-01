import { PageHeader } from "@/components/hub/ui"
import { ImportHub } from "@/components/hub/ImportHub"
import { requireOfficeUser } from "@/lib/hub/session"

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const [{ kind }, user] = await Promise.all([searchParams, requireOfficeUser()])
  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Connect a source or bring a file — map columns once, reuse forever."
      />
      <ImportHub initialKind={kind} canConnect={user.role === "owner"} />
    </div>
  )
}
