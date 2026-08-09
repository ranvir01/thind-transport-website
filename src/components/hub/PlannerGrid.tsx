"use client"

/**
 * The week-grid planner (E1): one row per truck, seven day columns, loads as
 * draggable blocks spanning pickup→delivery. Drag a block to another truck
 * and/or day — the server re-runs the same legality checks dispatch uses.
 * Approved time off paints the row; empty days are visually loud.
 */
import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarOff, GripVertical, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { plannerMoveLoadAction } from "@/app/hub/_actions/planner"
import type { PlannerBlock, PlannerTruck } from "@/lib/hub/planner"
import { toIsoDateOnly } from "@/lib/hub/format-dates"
import { assignLanes } from "@/components/hub/planner-lanes"
import { dayIndex } from "@/components/hub/planner-days"
import type { TimeOffRequest } from "@/lib/hub/types"

const LANE_HEIGHT = 46
// Same status→tone language as StatusBadge in ui.tsx (STATUS_TONE), with borders.
const STATUS_COLORS: Record<string, string> = {
  quoted: "border-border bg-surface-2 text-fg-2",
  booked: "border-border-strong bg-surface-2 text-fg",
  dispatched: "border-accent-soft bg-accent-soft text-accent-text",
  at_pickup: "border-warn-soft bg-warn-soft text-warn",
  in_transit: "border-info-soft bg-info-soft text-info",
  delivered: "border-ok-soft bg-ok-soft text-ok",
}

interface DragPayload {
  loadId: string
  startDayIdx: number
}

export function PlannerGrid({
  days,
  trucks,
  blocks,
  unassigned,
  timeOff,
}: {
  days: string[]
  trucks: PlannerTruck[]
  blocks: PlannerBlock[]
  unassigned: PlannerBlock[]
  timeOff: TimeOffRequest[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState<{ truckId: string; day: number } | null>(null)

  const todayIdx = dayIndex(days, new Date().toISOString())

  const move = (payload: DragPayload, truckId: string, targetDay: number) => {
    const block = [...blocks, ...unassigned].find((b) => b.id === payload.loadId)
    if (!block) return
    const dayDelta = targetDay - payload.startDayIdx
    const sameTruck = block.truck_id === truckId
    if (sameTruck && dayDelta === 0) return
    startTransition(async () => {
      const result = await plannerMoveLoadAction(payload.loadId, {
        truckId: sameTruck ? undefined : truckId,
        dayDelta,
      })
      if (result.ok) {
        toast.success(
          `${block.reference} ${sameTruck ? "rescheduled" : "assigned"}${result.warning ? ` — ${result.warning}` : ""}`
        )
        router.refresh()
      } else toast.error(result.error ?? "Could not move the load")
    })
  }

  const onDrop = (e: React.DragEvent, truckId: string, day: number) => {
    e.preventDefault()
    setDragOver(null)
    try {
      const payload = JSON.parse(e.dataTransfer.getData("text/plain")) as DragPayload
      if (payload.loadId) move(payload, truckId, day)
    } catch {
      /* not ours */
    }
  }

  const rows = useMemo(
    () =>
      trucks.map((truck) => {
        const truckBlocks = blocks
          .filter((b) => b.truck_id === truck.id)
          .map((b) => {
            const start = Math.max(0, dayIndex(days, b.starts_at))
            const end = Math.min(6, Math.max(start, dayIndex(days, b.ends_at)))
            return { block: b, start, end }
          })
          .sort((a, b) => a.start - b.start || a.end - b.end)
        const lanes = assignLanes(truckBlocks)
        const laneCount = Math.max(1, ...lanes.map((l) => l + 1))
        const offDays = new Set<number>()
        if (truck.driver_id) {
          for (const off of timeOff) {
            if (off.driver_id !== truck.driver_id) continue
            const startIso = toIsoDateOnly(off.start_date)
            const endIso = toIsoDateOnly(off.end_date)
            if (!startIso || !endIso) continue
            const start = Math.max(0, dayIndex(days, `${startIso}T00:00:00`))
            const end = Math.min(6, dayIndex(days, `${endIso}T23:59:00`))
            for (let d = start; d <= end; d++) offDays.add(d)
          }
        }
        const busyDays = new Set<number>()
        for (const { start, end } of truckBlocks) {
          for (let d = start; d <= end; d++) busyDays.add(d)
        }
        return { truck, truckBlocks, lanes, laneCount, offDays, busyDays }
      }),
    [trucks, blocks, days, timeOff]
  )

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[980px]">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}>
          <div />
          {days.map((day, i) => {
            const date = new Date(`${day}T12:00:00`)
            return (
              <div
                key={day}
                className={cn(
                  "px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider",
                  i === todayIdx ? "text-accent-text" : "text-fg-3"
                )}
              >
                {date.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                <span className={cn(i === todayIdx ? "text-fg" : "text-fg-3")}>
                  {date.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Unassigned tray */}
        {unassigned.length > 0 ? (
          <div className="mb-2 rounded-card border border-dashed border-warn bg-warn-soft p-2">
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-warn">
              Needs a truck — drag onto the grid
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((b) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ loadId: b.id, startDayIdx: Math.max(0, dayIndex(days, b.starts_at)) })
                    )
                  }
                  className={cn(
                    "flex cursor-grab items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold active:cursor-grabbing",
                    STATUS_COLORS[b.status] ?? STATUS_COLORS.booked
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 opacity-60" />
                  {b.reference} · {b.origin_city} → {b.dest_city}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Truck rows */}
        <div className="space-y-1.5">
          {rows.map(({ truck, truckBlocks, lanes, laneCount, offDays, busyDays }) => (
            <div
              key={truck.id}
              className="grid items-stretch rounded-card border border-border bg-surface"
              style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
            >
              {/* Truck label */}
              <div className="border-r border-border px-3 py-2">
                <p className="text-sm font-semibold text-fg">
                  #{truck.unit_number}
                  {truck.status === "shop" ? (
                    <span className="ml-2 rounded-full border border-bad-soft bg-bad-soft px-2 py-0.5 text-[10px] font-bold uppercase text-bad">
                      shop
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-fg-3">{truck.driver_name ?? "No driver seated"}</p>
                {truck.forecast ? (
                  <p className={cn("mt-0.5 truncate text-[10px]", truck.empty_now ? "font-bold text-warn" : "text-fg-3")}>
                    {truck.forecast}
                  </p>
                ) : null}
              </div>

              {/* Seven day cells + absolutely positioned blocks */}
              <div className="relative col-span-7" style={{ minHeight: laneCount * LANE_HEIGHT + 8 }}>
                <div className="absolute inset-0 grid grid-cols-7">
                  {days.map((day, i) => {
                    const isOff = offDays.has(i)
                    const isEmpty = !busyDays.has(i) && !isOff && truck.status === "active"
                    const isOver = dragOver?.truckId === truck.id && dragOver.day === i
                    return (
                      <div
                        key={day}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver({ truckId: truck.id, day: i })
                        }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => onDrop(e, truck.id, i)}
                        className={cn(
                          "border-l border-border transition-colors",
                          i === todayIdx && "bg-surface-2",
                          isEmpty && "planner-empty-day",
                          isOver && "bg-accent-soft ring-1 ring-inset ring-accent"
                        )}
                        title={isOff ? "Driver on approved time off" : isEmpty ? "Empty — drag a load here" : undefined}
                      >
                        {isOff ? (
                          <div className="flex h-full items-center justify-center bg-warn-soft">
                            <CalendarOff className="h-3.5 w-3.5 text-warn" />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {truckBlocks.map(({ block, start, end }, idx) => (
                  <div
                    key={block.id}
                    draggable={["quoted", "booked", "dispatched"].includes(block.status)}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ loadId: block.id, startDayIdx: start })
                      )
                    }
                    className={cn(
                      "absolute z-10 flex items-center gap-1 overflow-hidden rounded-lg border px-2 text-[11px] font-bold",
                      STATUS_COLORS[block.status] ?? STATUS_COLORS.booked,
                      ["quoted", "booked", "dispatched"].includes(block.status)
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer"
                    )}
                    style={{
                      left: `calc(${(start / 7) * 100}% + 3px)`,
                      width: `calc(${((end - start + 1) / 7) * 100}% - 6px)`,
                      top: lanes[idx] * LANE_HEIGHT + 4,
                      height: LANE_HEIGHT - 8,
                    }}
                    title={`${block.reference} · ${block.origin_city ?? "?"} → ${block.dest_city ?? "?"} · ${block.status.replace("_", " ")}${block.status === "dispatched" && !block.acknowledged_at ? " · driver hasn't confirmed yet" : ""}`}
                  >
                    {block.status === "dispatched" && !block.acknowledged_at ? (
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" title="Driver hasn't confirmed" />
                    ) : null}
                    {/* text-inherit: the marketing site's global `a` color would otherwise ghost the ref against the bar tint */}
                    <Link href={`/hub/loads/${block.id}`} className="truncate text-inherit hover:underline" onClick={(e) => e.stopPropagation()}>
                      {block.reference}
                    </Link>
                    <span className="truncate font-semibold opacity-80">
                      {block.origin_city} → {block.dest_city}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {pending ? (
        <p className="mt-2 flex items-center gap-2 text-body-xs text-fg-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving the move…
        </p>
      ) : null}
    </div>
  )
}
