import { latestTruckPositions } from "@/lib/hub/fleet"
import { PageHeader, Panel } from "@/components/hub/ui"
import { FleetMap } from "@/components/hub/FleetMap"

export const dynamic = "force-dynamic"

export default async function FleetMapPage() {
  const positions = await latestTruckPositions()

  return (
    <div>
      <PageHeader
        title="Fleet Map"
        subtitle="Latest known position per truck. Live ELD sync lands in Phase 6 — until then, positions come from imports."
      />
      {positions.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-white font-semibold">No position data yet</p>
          <p className="text-body-sm text-steel-200 mt-1">
            Connect the ELD (Phase 6) or import position history to see trucks here.
          </p>
        </Panel>
      ) : (
        <>
          <FleetMap positions={positions} />
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {positions.map((pos) => (
              <Panel key={pos.truck_id} className="p-3">
                <p className="font-bold text-white">#{pos.unit_number}</p>
                <p className="text-body-xs text-steel-300 truncate">{pos.driver_name ?? "No driver"}</p>
                <p className="text-body-xs text-steel-400">
                  {new Date(pos.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
