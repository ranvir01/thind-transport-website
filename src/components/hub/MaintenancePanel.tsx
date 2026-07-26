"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Wrench } from "lucide-react"
import { addMaintenanceRecordAction, addMaintenanceScheduleAction } from "@/app/hub/_actions/compliance"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"
import { fmtCentsExact } from "@/lib/hub/types"
import { mileageStatus } from "@/lib/hub/maintenance-due"

export interface MaintenanceSchedule {
  id: string
  name: string
  interval_miles: number | null
  interval_days: number | null
  last_done_on: string | null
  last_done_odometer: string | null
}

export interface MaintenanceRecord {
  id: string
  done_on: string
  vendor: string | null
  cost_cents: number
  odometer: string | null
  notes: string | null
}

export function MaintenancePanel({
  truckId,
  schedules,
  records,
  currentOdometer,
}: {
  truckId: string
  schedules: MaintenanceSchedule[]
  records: MaintenanceRecord[]
  /** Best-known current odometer for this truck (see truckOdometers), used to
   *  show "X mi left/over" next to mileage-based PM schedules. */
  currentOdometer?: number | null
}) {
  const [pending, startTransition] = useTransition()
  const [schedule, setSchedule] = useState({ name: "", intervalMiles: "", intervalDays: "", lastDoneOn: "" })
  const [record, setRecord] = useState({
    doneOn: new Date().toISOString().slice(0, 10), vendor: "", cost: "", odometer: "", notes: "", scheduleId: "",
  })

  const addSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addMaintenanceScheduleAction({ truckId, ...schedule })
      if (result.ok) {
        toast.success("PM schedule added")
        setSchedule({ name: "", intervalMiles: "", intervalDays: "", lastDoneOn: "" })
      } else toast.error(result.error ?? "Failed")
    })
  }

  const addRecord = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await addMaintenanceRecordAction({ truckId, ...record })
      if (result.ok) {
        toast.success("Work order recorded")
        setRecord({ ...record, vendor: "", cost: "", odometer: "", notes: "" })
      } else toast.error(result.error ?? "Failed")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-fg-3" />
        <h2 className="text-[13.5px] font-semibold text-fg">Maintenance</h2>
      </div>

      {/* PM schedules */}
      {schedules.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {schedules.map((s) => {
            const { color, milesRemaining } = mileageStatus(
              s.interval_miles,
              currentOdometer,
              s.last_done_odometer != null ? Number(s.last_done_odometer) : null
            )
            const toneCls = color === "red" ? "text-bad" : color === "amber" ? "text-warn" : "text-ok"
            return (
              <li key={s.id} className="text-body-sm text-fg-2">
                <span className="font-semibold text-fg">{s.name}</span>
                {s.interval_miles ? ` · every ${s.interval_miles.toLocaleString()} mi` : ""}
                {s.interval_days ? ` · every ${s.interval_days} days` : ""}
                {s.last_done_on ? ` · last ${String(s.last_done_on).slice(0, 10)}` : " · never done"}
                {milesRemaining != null ? (
                  <span className={`font-semibold ${toneCls}`}>
                    {" · "}
                    {milesRemaining <= 0
                      ? `${Math.abs(Math.round(milesRemaining)).toLocaleString()} mi overdue`
                      : `${Math.round(milesRemaining).toLocaleString()} mi left`}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      <form onSubmit={addSchedule} className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input aria-label="PM name" required placeholder="PM service…" className={fieldCls}
          value={schedule.name} onChange={(e) => setSchedule({ ...schedule, name: e.target.value })} />
        <input aria-label="Interval miles" type="number" placeholder="mi" className={fieldCls}
          value={schedule.intervalMiles} onChange={(e) => setSchedule({ ...schedule, intervalMiles: e.target.value })} />
        <input aria-label="Interval days" type="number" placeholder="days" className={fieldCls}
          value={schedule.intervalDays} onChange={(e) => setSchedule({ ...schedule, intervalDays: e.target.value })} />
        <button type="submit" disabled={pending}
          className="min-h-[44px] rounded-xl border border-border-strong px-3 text-xs font-bold text-fg-2 hover:bg-hover disabled:opacity-50">
          {pending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Add PM"}
        </button>
      </form>

      {/* Work order entry */}
      <form onSubmit={addRecord} className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div>
          <label className={labelCls} htmlFor="wo_date">Work done</label>
          <input id="wo_date" type="date" className={fieldCls} value={record.doneOn}
            onChange={(e) => setRecord({ ...record, doneOn: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="wo_cost">Cost ($)</label>
          <input id="wo_cost" type="number" step="0.01" min="0" className={fieldCls} value={record.cost}
            onChange={(e) => setRecord({ ...record, cost: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="wo_vendor">Vendor</label>
          <input id="wo_vendor" className={fieldCls} value={record.vendor}
            onChange={(e) => setRecord({ ...record, vendor: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="wo_schedule">Against PM</label>
          <select id="wo_schedule" className={fieldCls} value={record.scheduleId}
            onChange={(e) => setRecord({ ...record, scheduleId: e.target.value })}>
            <option value="">— one-off —</option>
            {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={pending}
          className="col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Record work order
        </button>
      </form>

      {/* History */}
      {records.length > 0 ? (
        <ul className="mt-4 divide-y divide-border">
          {records.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-body-sm">
              <span className="text-fg-2">
                {String(r.done_on).slice(0, 10)}{r.vendor ? ` · ${r.vendor}` : ""}{r.notes ? ` · ${r.notes}` : ""}
              </span>
              <span className="font-semibold text-fg">{fmtCentsExact(r.cost_cents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}
