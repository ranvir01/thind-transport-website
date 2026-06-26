import { requireOfficeUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { HubShell } from "@/components/hub/HubNav"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()
  const carrier = await getCarrier(user.carrierId)

  return (
    <HubShell user={{ name: user.name, role: user.role, carrierName: carrier?.name }}>
      {children}
    </HubShell>
  )
}
