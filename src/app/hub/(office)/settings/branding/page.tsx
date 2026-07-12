import { requireOwner } from "@/lib/hub/session"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader } from "@/components/hub/ui"
import { BrandingPanel } from "@/components/hub/BrandingPanel"

export const dynamic = "force-dynamic"

// The signup wizard seeds branding.accent, but until now nothing post-signup
// could change it — tenants who skipped the wizard step had no way in at all.
export default async function BrandingSettingsPage() {
  const owner = await requireOwner()
  const settings = await getCarrierSettings(owner.carrierId)

  return (
    <div>
      <PageHeader
        title="Branding"
        subtitle="Your accent color on invoices, PDFs, and the driver app. Owner only."
      />
      <BrandingPanel currentAccent={settings.branding.accent} />
    </div>
  )
}
