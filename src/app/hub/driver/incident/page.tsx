import { requireDriverUser } from "@/lib/hub/session"
import { driverActiveLoads } from "@/lib/hub/driver-app"
import { DriverIncidentForm } from "@/components/hub/driver/DriverIncidentForm"

export const dynamic = "force-dynamic"

export default async function DriverIncidentPage() {
  const user = await requireDriverUser()
  const loads = await driverActiveLoads(user.carrierId, user.driverId)

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">
        Report an incident
      </h1>
      <p className="text-body-sm text-steel-300 mb-4">
        First: is everyone safe? Call 911 if you need to. Then file this — it goes straight to
        the office and starts the paper trail.
      </p>
      <DriverIncidentForm
        loads={loads.map((l) => ({ id: l.id, reference: l.reference }))}
      />
    </div>
  )
}
