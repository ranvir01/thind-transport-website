import { requireOfficeUser } from "@/lib/hub/session"
import { listPacketDocuments } from "@/lib/hub/packet"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader } from "@/components/hub/ui"
import { DocumentsPanel } from "@/components/hub/DocumentsPanel"
import { CoiRequestForm, SendPacketForm } from "@/components/hub/PacketPanels"

export const dynamic = "force-dynamic"

export default async function PacketPage() {
  const user = await requireOfficeUser()
  const [documents, settings] = await Promise.all([
    listPacketDocuments(user.carrierId),
    getCarrierSettings(user.carrierId) as Promise<{ insurance?: { agentEmail?: string } }>,
  ])

  return (
    <div>
      <PageHeader
        title="Carrier packet"
        subtitle="W-9, COI, authority letter, NOA — stored once, sent in one click. Onboarding speed wins loads."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="max-w-2xl">
          <DocumentsPanel entityType="carrier" entityId={user.carrierId} documents={documents} />
        </div>
        <div className="space-y-4 max-w-2xl">
          <SendPacketForm />
          <CoiRequestForm savedAgent={settings.insurance?.agentEmail ?? ""} />
        </div>
      </div>
    </div>
  )
}
