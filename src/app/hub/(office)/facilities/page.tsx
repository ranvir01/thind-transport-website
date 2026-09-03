import Link from "next/link"
import { Warehouse } from "lucide-react"
import { requirePermissionPage } from "@/lib/hub/session"
import { listFacilities, detentionRisk, formatDwell } from "@/lib/hub/facilities"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader, Panel, EmptyState, Pill, btnPrimaryCls, btnSecondaryCls } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requirePermissionPage("loads:read")
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
          className="w-full min-h-[48px] rounded-control border border-border-strong bg-surface px-4 text-sm text-fg placeholder:text-fg-3"
        />
      </form>

      {facilities.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No facilities yet"}
          hint="Facilities build themselves — every stop on every load files its shipper or receiver here automatically."
          action={
            q ? (
              <Link href="/hub/facilities" className={btnSecondaryCls}>
                Clear the search
              </Link>
            ) : (
              <Link href="/hub/loads/new" className={btnPrimaryCls}>
                Book a load
              </Link>
            )
          }
        />
      ) : (
        <Panel className="divide-y divide-border">
          {facilities.map((f) => {
            const risk = detentionRisk(f.avg_dwell_minutes, freeMinutes)
            return (
              <Link key={f.id} href={`/hub/facilities/${f.id}`} className="flex items-center gap-3 p-3.5 hover:bg-hover">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-2 text-accent-text">
                  <Warehouse className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-fg truncate">{f.name}</span>
                  <span className="block text-body-xs text-fg-3 truncate">
                    {[f.city, f.state].filter(Boolean).join(", ")}
                    {" · "}
                    {f.type === "shipper" ? "Shipper" : f.type === "receiver" ? "Receiver" : "Ships & receives"}
                    {" · "}
                    {f.stop_count ?? 0} stop{(f.stop_count ?? 0) === 1 ? "" : "s"}
                    {(f.note_count ?? 0) > 0 ? ` · ${f.note_count} driver tip${(f.note_count ?? 0) > 1 ? "s" : ""}` : ""}
                  </span>
                </span>
                {f.avg_dwell_minutes != null ? (
                  <Pill
                    tone={risk === "high" ? "bad" : risk === "warn" ? "warn" : "neutral"}
                    size="xs"
                    className="shrink-0"
                  >
                    ~{formatDwell(f.avg_dwell_minutes)} at the dock
                  </Pill>
                ) : (
                  <span className="shrink-0 text-[11px] text-fg-3">no dwell data yet</span>
                )}
              </Link>
            )
          })}
        </Panel>
      )}
    </div>
  )
}
