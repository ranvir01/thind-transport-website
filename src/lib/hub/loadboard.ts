import { changeLoadStatus, getLoad, getLoadStops } from "./loads"
import { assertCarrierRefs } from "./tenancy"
import { query } from "./db"
import { geocodeCityState } from "./geocode"
import type { Load, LoadStatus } from "./types"
import { dollarsToCents, LOAD_STATUSES } from "./types"

export type LoadBoardField =
  | "customer_reference"
  | "status"
  | "origin_city"
  | "origin_state"
  | "dest_city"
  | "dest_state"
  | "driver_id"
  | "truck_id"
  | "pickup_date"
  | "linehaul"
  | "fuel_surcharge"
  | "loaded_miles"
  | "notes"

const US_STATE = /^[A-Za-z]{2}$/

function parsePickupDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00`)
  if (Number.isNaN(d.getTime())) throw new Error("Invalid pickup date")
  return d.toISOString()
}

async function updateStopLane(
  carrierId: string,
  loadId: string,
  type: "pickup" | "delivery",
  patch: { city?: string; state?: string; appt_start?: string | null }
): Promise<void> {
  const stops = await getLoadStops(loadId)
  const target =
    type === "pickup"
      ? stops.find((s) => s.type === "pickup")
      : [...stops].reverse().find((s) => s.type === "delivery")
  if (!target) throw new Error(`No ${type} stop on load`)

  const city = patch.city ?? target.city
  const state = (patch.state ?? target.state).toUpperCase()
  if (!city.trim()) throw new Error("City is required")
  if (!US_STATE.test(state)) throw new Error("State must be 2 letters")

  let lat = target.lat
  let lng = target.lng
  if (patch.city != null || patch.state != null) {
    const coords = await geocodeCityState(city, state)
    lat = coords?.lat ?? null
    lng = coords?.lng ?? null
  }

  if (patch.appt_start !== undefined) {
    await query(
      `UPDATE hub.stops SET city = $4, state = $5, appt_start = $6, lat = $7, lng = $8, updated_at = NOW()
       WHERE id = $3 AND carrier_id = $1 AND load_id = $2`,
      [carrierId, loadId, target.id, city.trim(), state, patch.appt_start, lat, lng]
    )
  } else {
    await query(
      `UPDATE hub.stops SET city = $4, state = $5, lat = $6, lng = $7, updated_at = NOW()
       WHERE id = $3 AND carrier_id = $1 AND load_id = $2`,
      [carrierId, loadId, target.id, city.trim(), state, lat, lng]
    )
  }
}

export async function patchLoadBoardField(
  carrierId: string,
  loadId: string,
  field: LoadBoardField,
  rawValue: string,
  actor: { id?: string | null; name?: string | null }
): Promise<Load | null> {
  const load = await getLoad(carrierId, loadId)
  if (!load) return null

  switch (field) {
    case "customer_reference": {
      const value = rawValue.trim() || null
      await query(
        `UPDATE hub.loads SET customer_reference = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, value]
      )
      break
    }
    case "status": {
      const status = rawValue as LoadStatus
      if (!LOAD_STATUSES.includes(status)) throw new Error("Invalid status")
      return changeLoadStatus(carrierId, loadId, status, actor)
    }
    case "origin_city":
      await updateStopLane(carrierId, loadId, "pickup", { city: rawValue.trim() })
      break
    case "origin_state":
      await updateStopLane(carrierId, loadId, "pickup", { state: rawValue.trim().toUpperCase() })
      break
    case "dest_city":
      await updateStopLane(carrierId, loadId, "delivery", { city: rawValue.trim() })
      break
    case "dest_state":
      await updateStopLane(carrierId, loadId, "delivery", { state: rawValue.trim().toUpperCase() })
      break
    case "driver_id": {
      const value = rawValue.trim() || null
      await assertCarrierRefs(carrierId, { driver_id: value })
      await query(
        `UPDATE hub.loads SET driver_id = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, value]
      )
      break
    }
    case "truck_id": {
      const value = rawValue.trim() || null
      await assertCarrierRefs(carrierId, { truck_id: value })
      await query(
        `UPDATE hub.loads SET truck_id = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, value]
      )
      break
    }
    case "pickup_date":
      await updateStopLane(carrierId, loadId, "pickup", { appt_start: parsePickupDate(rawValue) })
      break
    case "linehaul": {
      const cleaned = rawValue.replace(/[^0-9.\-]/g, "")
      if (cleaned !== "" && !Number.isFinite(Number(cleaned))) throw new Error("Invalid linehaul amount")
      const cents = dollarsToCents(rawValue)
      await query(
        `UPDATE hub.loads SET linehaul_cents = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, cents]
      )
      break
    }
    case "fuel_surcharge": {
      const cleaned = rawValue.replace(/[^0-9.\-]/g, "")
      if (cleaned !== "" && !Number.isFinite(Number(cleaned))) throw new Error("Invalid fuel surcharge amount")
      const cents = dollarsToCents(rawValue)
      await query(
        `UPDATE hub.loads SET fuel_surcharge_cents = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, cents]
      )
      break
    }
    case "loaded_miles": {
      const miles = rawValue.trim() ? Number(rawValue.replace(/[^0-9.]/g, "")) : null
      if (miles != null && (!Number.isFinite(miles) || miles < 0)) throw new Error("Invalid miles")
      await query(
        `UPDATE hub.loads SET loaded_miles = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, miles == null ? null : Math.round(miles)]
      )
      break
    }
    case "notes": {
      const value = rawValue.trim() || null
      await query(
        `UPDATE hub.loads SET notes = $3, updated_at = NOW()
         WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [carrierId, loadId, value]
      )
      break
    }
    default:
      throw new Error("Unknown field")
  }

  return getLoad(carrierId, loadId)
}

export { exportLoadsCsv } from "./loadboard-export"
