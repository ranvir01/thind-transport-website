import { formatHubDateShort } from "@/lib/hub/format-dates"
import { requireDriverUser } from "@/lib/hub/session"
import { listTimeOff } from "@/lib/hub/timeoff"
import { TimeOffForm, CancelTimeOffButton } from "@/components/hub/driver/TimeOffForm"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"
import { btnDriverSecondaryCls } from "@/components/hub/ui"
import { TIME_OFF_KIND_LABELS } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_COPY: Record<string, { label: string; cls: string; accent?: boolean }> = {
  requested: { label: "Waiting on the office", cls: "text-[color:var(--driver-accent)]", accent: true },
  approved: { label: "Approved — on the planner", cls: "border-green-500/40 bg-green-500/10 text-green-400" },
  denied: { label: "Denied — talk to dispatch", cls: "border-red-500/40 bg-red-500/10 text-red-400" },
  cancelled: { label: "Cancelled", cls: "border-white/15 bg-white/5 text-steel-300" },
}

/** Same border/background mix OfflineSync uses for --driver-accent chrome (opacity modifiers drop silently on CSS-var colors — AGENTS.md). */
const ACCENT_PILL_STYLE = {
  borderColor: "color-mix(in srgb, var(--driver-accent) 40%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
} as const

export default async function DriverTimeOffPage() {
  const user = await requireDriverUser()
  const requests = await listTimeOff(user.carrierId, { driverId: user.driverId })

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-white">Time off</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        Ask for home time here — once it&apos;s approved, dispatch can&apos;t book you over it.
      </p>

      <TimeOffForm />

      <h2 className="mt-6 mb-2 text-base font-semibold text-white">My requests</h2>
      {requests.length === 0 ? (
        <EmptyStateDark
          title="Nothing yet."
          hint="Requests you send show up here with their status."
          action={
            <a href="#to-start" className={cn(btnDriverSecondaryCls, "w-auto px-6")}>
              Ask for home time
            </a>
          }
        />
      ) : (
        <ul className="hub-stagger space-y-2">
          {requests.map((r) => {
            const status = STATUS_COPY[r.status]
            return (
              <li key={r.id} className="driver-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">
                    {formatHubDateShort(r.start_date)} – {formatHubDateShort(r.end_date)}
                  </p>
                  <span
                    className={cn("shrink-0 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", status.cls)}
                    style={status.accent ? ACCENT_PILL_STYLE : undefined}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-steel-300">
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
