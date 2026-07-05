import Link from "next/link"
import { notFound } from "next/navigation"
import { Clock, MapPin, Warehouse } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  detentionRisk, formatDwell, getFacility, listFacilityNotes,
} from "@/lib/hub/facilities"
import { getCarrierSettings } from "@/lib/hub/settings"
import { query } from "@/lib/hub/db"
import { PageHeader, BackLink, Panel } from "@/components/hub/ui"
import { FacilityInfoForm, OfficeNoteComposer } from "@/components/hub/FacilityPanels"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOfficeUser()
  const { id } = await params
  const facility = await getFacility(user.carrierId, id).catch(() => null)
  if (!facility) notFound()

  const [notes, settings, recentStops] = await Promise.all([
    listFacilityNotes(user.carrierId, id),
    getCarrierSettings(user.carrierId),
    query<{
      load_id: string; reference: string; type: string; arrived_at: string | null
      departed_at: string | null; appt_start: string | null
    }>(
      `SELECT l.id AS load_id, l.reference, s.type, s.arrived_at, s.departed_at, s.appt_start
       FROM hub.stops s JOIN hub.loads l ON l.id = s.load_id
       WHERE s.facility_id = $1 AND l.deleted_at IS NULL
       ORDER BY COALESCE(s.appt_start, s.arrived_at) DESC NULLS LAST LIMIT 10`,
      [id]
    ),
  ])

  const freeMinutes = Math.round((settings.detention.freeHours ?? 2) * 60)
  const risk = detentionRisk(facility.avg_dwell_minutes, freeMinutes)

  return (
    <div>
      <BackLink href="/hub/facilities" label="Facilities" />
      <PageHeader
        title={facility.name}
        subtitle={`${[facility.address, facility.city, facility.state, facility.zip].filter(Boolean).join(", ") || "Address unknown"}`}
      />

      {/* Dwell stats banner */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {facility.avg_dwell_minutes != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold",
              risk === "high"
                ? "border-bad-soft bg-bad-soft text-bad"
                : risk === "warn"
                  ? "border-warn-soft bg-warn-soft text-warn"
                  : "border-ok-soft bg-ok-soft text-ok"
            )}
          >
            <Clock className="h-4 w-4" />
            Averages {formatDwell(facility.avg_dwell_minutes)} at the dock
            {risk === "high" ? " — past your free time, price detention in" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg-3">
            <Clock className="h-4 w-4" /> No dwell history yet
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg-2">
          <Warehouse className="h-4 w-4" />
          {facility.type === "shipper" ? "Shipper" : facility.type === "receiver" ? "Receiver" : "Ships & receives"}
          {" · "}{facility.stop_count ?? 0} stops on record
        </span>
        {facility.overnight_parking != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-fg-2">
            <MapPin className="h-4 w-4" />
            Overnight parking: {facility.overnight_parking ? "yes" : "no"}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FacilityInfoForm
          facilityId={id}
          initial={{
            hours: facility.hours ?? "",
            phone: facility.phone ?? "",
            overnightParking: facility.overnight_parking == null ? "" : facility.overnight_parking ? "yes" : "no",
            typicalLumper: facility.typical_lumper_cents != null ? (facility.typical_lumper_cents / 100).toFixed(2) : "",
            notes: facility.notes ?? "",
          }}
        />

        <div className="space-y-4">
          {/* Crowd-sourced notes */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">
              Driver tips & office notes ({notes.length})
            </h2>
            <OfficeNoteComposer facilityId={id} />
            {notes.length === 0 ? (
              <p className="mt-3 text-body-sm text-fg-3">
                Nothing yet — drivers get a two-tap prompt after every departure here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {notes.map((note) => (
                  <li key={note.id} className="py-2.5">
                    <p className="text-body-sm text-fg-2">“{note.body}”</p>
                    <p className="mt-0.5 text-[11px] text-fg-3">
                      {note.author_name ?? "Someone"}
                      {note.author_role === "driver" ? " (driver)" : ""}
                      {" · "}
                      {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {Array.isArray(note.tags) && note.tags.length > 0 ? ` · ${note.tags.join(", ")}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Visit history */}
          <Panel className="p-4 md:p-5">
            <h2 className="text-[13.5px] font-semibold text-fg mb-3">
              Recent visits
            </h2>
            {recentStops.length === 0 ? (
              <p className="text-body-sm text-fg-3">No visits on record.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentStops.map((stop, i) => {
                  const dwell =
                    stop.arrived_at && stop.departed_at
                      ? Math.round((new Date(stop.departed_at).getTime() - new Date(stop.arrived_at).getTime()) / 60000)
                      : null
                  return (
                    <li key={i}>
                      <Link href={`/hub/loads/${stop.load_id}`} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-hover">
                        <span className="text-sm font-semibold text-fg">
                          {stop.reference}
                          <span className="font-normal text-fg-3"> · {stop.type === "pickup" ? "picked up" : "delivered"}</span>
                        </span>
                        <span className={cn("shrink-0 text-body-xs", dwell != null && dwell >= freeMinutes ? "font-bold text-orange" : "text-fg-3")}>
                          {dwell != null ? `${formatDwell(dwell)} dock time` : stop.appt_start ? new Date(stop.appt_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
