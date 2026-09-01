import { requireOfficeUser } from "@/lib/hub/session"
import { BackLink, PageHeader } from "@/components/hub/ui"
import { AppearanceSettings } from "@/components/hub/AppearanceSettings"

export const dynamic = "force-dynamic"

export default async function AppearancePage() {
  await requireOfficeUser()
  return (
    <div className="max-w-5xl">
      <BackLink href="/hub/onboarding" label="Onboarding" />
      <PageHeader
        title="Appearance"
        subtitle="Live-preview theme picker for office testing. Red remains reserved for destructive/error/overdue states."
      />
      <AppearanceSettings />
    </div>
  )
}
