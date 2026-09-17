import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader } from "@/components/hub/ui"
import { PreferencesPanel } from "@/components/hub/PreferencesPanel"

export const dynamic = "force-dynamic"

export const metadata = { title: "Preferences" }

export default async function PreferencesPage() {
  await requireOfficeUser()
  return (
    <div className="max-w-xl">
      <PageHeader title="Preferences" subtitle="Appearance, captions, and which seat the product theater opens on." />
      <PreferencesPanel />
    </div>
  )
}
