import { formatHubDateShort } from "@/lib/hub/format-dates"
import { requireDriverUser } from "@/lib/hub/session"
import { listTimeOff } from "@/lib/hub/timeoff"
import { TimeOffForm, CancelTimeOffButton } from "@/components/hub/driver/TimeOffForm"
import { TIME_OFF_KIND_LABELS } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  requested: { label: "Waiting on the office", cls: "border-gold/40 bg-gold/10 text-gold" },
  approved: { label: "Approved — on the planner", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  denied: { label: "Denied — talk to dispatch", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  cancelled: { label: "Cancelled", cls: "border-white/15 bg-white/5 text-steel-300" },
}

export default async function DriverTimeOffPage() {
  const user = await requireDriverUser()
  const requests = await listTimeOff(user.carrierId, { driverId: user.driverId })

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">Time off</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Ask for home time here — once it&apos;s approved, dispatch can&apos;t book you over it.
      </p>

      <TimeOffForm />

      <h2 className="mt-6 mb-2 font-display text-base font-bold uppercase tracking-wide text-white">My requests</h2>
      {requests.length === 0 ? (
        <p className="text-body-sm text-steel-300">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const status = STATUS_COPY[r.status]
            return (
              <li key={r.id} className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    {formatHubDateShort(r.start_date)} – {formatHubDateShort(r.end_date)}
                  </p>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", status.cls)}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-body-xs text-steel-300">
                  {TIME_OFF_KIND_LABELS[r.kind]}
                  {r.reason ? ` · ${r.reason}` : ""}
                </p>
                {r.status === "requested" ? <CancelTimeOffButton id={r.id} /> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
