"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { Download, ExternalLink, Plus } from "lucide-react"
import { toast } from "sonner"
import { patchLoadBoardFieldAction } from "@/app/hub/_actions/loadboard"
import { SuggestMilesInline } from "@/components/hub/SuggestMilesButton"
import { exportLoadsCsv } from "@/lib/hub/loadboard-export"
import {
  STATUS_LABELS,
  centsToDollars,
  fmtCents,
  loadTotalCents,
  type Load,
} from "@/lib/hub/types"
import { loadBoardStatusChoices } from "@/lib/hub/loadboard-status"
import type { Driver } from "@/lib/hub/types"
import type { Truck } from "@/lib/hub/types"
import { StatusBadge, btnPrimaryCls, btnSecondaryCls, fieldCls, linkAccentCls, moneyCls, tableHeadCls } from "@/components/hub/ui"
import type { LoadBoardField } from "@/lib/hub/loadboard"

type LoadRow = Load

interface LoadBoardGridProps {
  loads: LoadRow[]
  drivers: Pick<Driver, "id" | "first_name" | "last_name">[]
  trucks: Pick<Truck, "id" | "unit_number">[]
  canEdit: boolean
}

function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function EditableCell({
  loadId,
  field,
  display,
  editValue,
  type = "text",
  options,
  canEdit,
  onSaved,
}: {
  loadId: string
  field: LoadBoardField
  display: React.ReactNode
  editValue: string
  type?: "text" | "select" | "date" | "number"
  options?: { value: string; label: string }[]
  canEdit: boolean
  onSaved?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(editValue)
  const [pending, startTransition] = useTransition()

  const save = useCallback(() => {
    setEditing(false)
    if (draft === editValue) return
    startTransition(async () => {
      const result = await patchLoadBoardFieldAction(loadId, field, draft)
      if (!result.ok) {
        setDraft(editValue)
        toast.error(result.error ?? "Could not save")
      } else {
        toast.success("Saved")
        onSaved?.()
      }
    })
  }, [draft, editValue, field, loadId, onSaved])

  if (!canEdit) return <span className="text-fg-2">{display}</span>

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(editValue)
          setEditing(true)
        }}
        className="block w-full min-h-[32px] rounded px-1.5 py-1 text-left hover:bg-hover focus:outline-none focus:ring-2 focus:ring-ring"
        title="Click to edit"
      >
        {display || <span className="text-fg-3">—</span>}
      </button>
    )
  }

  if (type === "select" && options) {
    return (
      <select
        autoFocus
        disabled={pending}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          startTransition(async () => {
            const result = await patchLoadBoardFieldAction(loadId, field, e.target.value)
            setEditing(false)
            if (!result.ok) toast.error(result.error ?? "Could not save")
            else {
              toast.success("Saved")
              onSaved?.()
            }
          })
        }}
        onBlur={() => setEditing(false)}
        className={`${fieldCls} min-h-[32px] py-1 text-sm`}
      >
        {options.map((o) => (
          <option key={o.value || "empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      autoFocus
      disabled={pending}
      type={type === "date" ? "date" : type === "number" ? "number" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save()
        if (e.key === "Escape") {
          setDraft(editValue)
          setEditing(false)
        }
      }}
      className={`${fieldCls} min-h-[32px] py-1 text-sm`}
    />
  )
}

export function LoadBoardGrid({ loads, drivers, trucks, canEdit }: LoadBoardGridProps) {
  const router = useRouter()
  const driverOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...drivers.map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` })),
    ],
    [drivers]
  )
  const truckOptions = useMemo(
    () => [
      { value: "", label: "—" },
      ...trucks.map((t) => ({ value: t.id, label: `#${t.unit_number}` })),
    ],
    [trucks]
  )
  // Per-load: billing statuses come from the invoice/settlement flow and
  // cancellation locks after delivery, so the dropdown never offers them.
  const statusOptionsFor = useCallback(
    (load: LoadRow) =>
      loadBoardStatusChoices(load.status).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
    []
  )

  const exportCsv = () => {
    const csv = exportLoadsCsv(loads)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hauldesk-loadboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported to CSV")
  }

  const refresh = () => router.refresh()

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={exportCsv} className={btnSecondaryCls}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <Link href="/hub/loads/new" className={btnPrimaryCls}>
          <Plus className="h-4 w-4" /> New load
        </Link>
        {canEdit ? (
          <p className="text-xs text-fg-3">Click any cell to edit — like Excel.</p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-control border border-border bg-surface">
        <table className="min-w-[1400px] w-full text-sm">
          <thead>
            <tr className={tableHeadCls}>
              <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left">Ref</th>
              <th className="px-3 py-2.5 text-left">Broker #</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">Origin</th>
              <th className="px-3 py-2.5 text-left">ST</th>
              <th className="px-3 py-2.5 text-left">Dest</th>
              <th className="px-3 py-2.5 text-left">ST</th>
              <th className="px-3 py-2.5 text-left">Customer</th>
              <th className="px-3 py-2.5 text-left">Driver</th>
              <th className="px-3 py-2.5 text-left">Truck</th>
              <th className="px-3 py-2.5 text-left">Pickup</th>
              <th className="px-3 py-2.5 text-right">Linehaul</th>
              <th className="px-3 py-2.5 text-right">FSC</th>
              <th className="px-3 py-2.5 text-right">Miles</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-left">Notes</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id} className="border-b border-border last:border-0 hover:bg-hover">
                <td className="sticky left-0 z-10 bg-surface px-3 py-1.5">
                  <Link href={`/hub/loads/${load.id}`} className={`font-mono text-sm font-semibold ${linkAccentCls}`}>
                    {load.reference}
                  </Link>
                </td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="customer_reference"
                    display={load.customer_reference}
                    editValue={load.customer_reference ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5">
                  {canEdit && statusOptionsFor(load).length > 1 ? (
                    <EditableCell
                      loadId={load.id}
                      field="status"
                      display={<StatusBadge status={load.status} />}
                      editValue={load.status}
                      type="select"
                      options={statusOptionsFor(load)}
                      canEdit={canEdit}
                      onSaved={refresh}
                    />
                  ) : (
                    <StatusBadge status={load.status} />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="origin_city"
                    display={load.origin_city}
                    editValue={load.origin_city ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="w-14 px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="origin_state"
                    display={load.origin_state}
                    editValue={load.origin_state ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="dest_city"
                    display={load.dest_city}
                    editValue={load.dest_city ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="w-14 px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="dest_state"
                    display={load.dest_state}
                    editValue={load.dest_state ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5 text-fg-2">{load.customer_name ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="driver_id"
                    display={load.driver_name ?? "Unassigned"}
                    editValue={load.driver_id ?? ""}
                    type="select"
                    options={driverOptions}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="truck_id"
                    display={load.truck_unit ? `#${load.truck_unit}` : "—"}
                    editValue={load.truck_id ?? ""}
                    type="select"
                    options={truckOptions}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="pickup_date"
                    display={formatDateInput(load.pickup_appt) || "—"}
                    editValue={formatDateInput(load.pickup_appt)}
                    type="date"
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <EditableCell
                    loadId={load.id}
                    field="linehaul"
                    display={<span className={moneyCls}>{fmtCents(load.linehaul_cents)}</span>}
                    editValue={centsToDollars(load.linehaul_cents)}
                    type="number"
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <EditableCell
                    loadId={load.id}
                    field="fuel_surcharge"
                    display={fmtCents(load.fuel_surcharge_cents)}
                    editValue={centsToDollars(load.fuel_surcharge_cents)}
                    type="number"
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {load.loaded_miles == null && canEdit ? (
                      <SuggestMilesInline loadId={load.id} onSaved={refresh} />
                    ) : null}
                    <EditableCell
                      loadId={load.id}
                      field="loaded_miles"
                      display={load.loaded_miles ?? "—"}
                      editValue={load.loaded_miles != null ? String(load.loaded_miles) : ""}
                      type="number"
                      canEdit={canEdit}
                      onSaved={refresh}
                    />
                  </div>
                </td>
                <td className={`px-3 py-1.5 text-right font-medium ${moneyCls}`}>
                  {fmtCents(loadTotalCents(load))}
                </td>
                <td className="max-w-[180px] px-3 py-1.5">
                  <EditableCell
                    loadId={load.id}
                    field="notes"
                    display={<span className="truncate block">{load.notes}</span>}
                    editValue={load.notes ?? ""}
                    canEdit={canEdit}
                    onSaved={refresh}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/hub/loads/${load.id}`}
                    className="inline-flex min-h-[32px] items-center text-fg-3 hover:text-accent-text"
                    title="Open load detail"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
