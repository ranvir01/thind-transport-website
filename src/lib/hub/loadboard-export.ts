import type { Load } from "./types"
import { STATUS_LABELS, centsToDollars, loadTotalCents } from "./types"

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function formatAppt(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US")
}

/** Export loads as RFC-4180 CSV matching the load board columns. Safe for client import. */
export function exportLoadsCsv(loads: Load[]): string {
  const headers = [
    "Ref",
    "Broker #",
    "Status",
    "Origin City",
    "Origin ST",
    "Dest City",
    "Dest ST",
    "Customer",
    "Driver",
    "Truck",
    "Pickup",
    "Linehaul",
    "FSC",
    "Miles",
    "Total",
    "Notes",
  ]
  const rows = loads.map((load) => [
    load.reference,
    load.customer_reference ?? "",
    STATUS_LABELS[load.status],
    load.origin_city ?? "",
    load.origin_state ?? "",
    load.dest_city ?? "",
    load.dest_state ?? "",
    load.customer_name ?? "",
    load.driver_name ?? "",
    load.truck_unit ?? "",
    formatAppt(load.pickup_appt),
    centsToDollars(load.linehaul_cents),
    centsToDollars(load.fuel_surcharge_cents),
    load.loaded_miles != null ? String(load.loaded_miles) : "",
    centsToDollars(loadTotalCents(load)),
    load.notes ?? "",
  ])
  return [headers, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n")
}
