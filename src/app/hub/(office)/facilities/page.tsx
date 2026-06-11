import Link from "next/link"
import { Warehouse } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { listFacilities, detentionRisk, formatDwell } from "@/lib/hub/facilities"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader, Panel, EmptyState } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireOfficeUser()
  const { q } = await searchParams
  const [facilities, settings] = await Promise.all([
    listFacilities(user.carrierId, q),
    getCarrierSettings(user.carrierId),
  ])
  const freeMinutes = Math.round((settings.detention.freeHours ?? 2) * 60)

  return (
    <div>
      <PageHeader
        title="Facilities"
        subtitle="Every dock you've ever touched — with the dwell history and driver tips to prove it."
      />

      <form className="mb-4 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, city, state…"
          className="w-full min-h-[48px] rounded-xl border border-white/15 bg-navy-800 px-4 text-sm text-white placeholder:text-steel-400"
        />
      </form>

      {facilities.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No facilities yet"}
          hint="Facilities build themselves — every stop on every load files its shipper or receiver here automatically."
        />
      ) : (
        <Panel className="divide-y divide-white/5">
          {facilities.map((f) => {
            const risk = detentionRisk(f.avg_dwell_minutes, freeMinutes)
            return (
              <Link key={f.id} href={`/hub/facilities/${f.id}`} className="flex items-center gap-3 p-3.5 hover:bg-white/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold">
                  <Warehouse className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white truncate">{f.name}</span>
                  <span className="block text-body-xs text-steel-300 truncate">
                    {[f.city, f.state].filter(Boolean).join(", ")}
                    {" · "}
                    {f.type === "shipper" ? "Shipper" : f.type === "receiver" ? "Receiver" : "Ships & receives"}
                    {" · "}
                    {f.stop_count ?? 0} stop{(f.stop_count ?? 0) === 1 ? "" : "s"}
                    {(f.note_count ?? 0) > 0 ? ` · ${f.note_count} driver tip${(f.note_count ?? 0) > 1 ? "s" : ""}` : ""}
                  </span>
                </span>
                {f.avg_dwell_minutes != null ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                      risk === "high"
                        ? "border-orange/40 bg-orange/10 text-orange"
                        : risk === "warn"
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-white/15 bg-white/5 text-steel-200"
                    )}
                  >
                    ~{formatDwell(f.avg_dwell_minutes)} at the dock
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-steel-400">no dwell data yet</span>
                )}
              </Link>
            )
          })}
        </Panel>
      )}
    </div>
  )
}
