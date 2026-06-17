import type { TruckPosition } from "@/lib/hub/fleet"

function project(lat: number, lng: number) {
  // Approximate contiguous-US projection for lightweight, dependency-free
  // dispatch visibility. Live tile maps can be enabled later behind the same
  // positions data model if the operation needs zoom/pan.
  const x = ((lng + 125) / 59) * 100
  const y = ((49 - lat) / 25) * 100
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
  }
}

/** Lightweight fleet map — no tile/map dependency, works immediately on mobile. */
export function FleetMap({ positions }: { positions: TruckPosition[] }) {
  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(242,169,0,0.10),transparent_32%),linear-gradient(135deg,rgba(20,31,47,0.96),rgba(5,10,17,0.98))] p-4" aria-label="Fleet map">
      <div className="absolute inset-4 rounded-[1.25rem] border border-white/10" />
      <div className="absolute left-[8%] right-[10%] top-[18%] h-px bg-white/10" />
      <div className="absolute left-[12%] right-[18%] top-[42%] h-px bg-white/10" />
      <div className="absolute left-[16%] right-[12%] top-[66%] h-px bg-white/10" />
      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-navy-900/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-steel-200">
        Approximate US positions · import/ELD fed
      </div>
      {positions.map((pos) => {
        const point = project(pos.lat, pos.lng)
        return (
          <div
            key={pos.truck_id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <div className="rounded-full border-2 border-white bg-orange px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
              #{pos.unit_number}
            </div>
            <div className="mt-1 hidden rounded-lg border border-white/10 bg-navy-900/90 px-2 py-1 text-[10px] text-steel-100 shadow-lg sm:block">
              {pos.driver_name ?? "No driver"}
            </div>
          </div>
        )
      })}
    </div>
  )
}
