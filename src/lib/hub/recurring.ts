/**
 * Recurring lanes: "rebook every Tuesday" rules on top of the one-click
 * Duplicate flow. A 15-truck carrier running dedicated weekly lanes gets the
 * load booked before the dispatcher sits down, instead of re-keying (or even
 * re-clicking) the same load every week.
 *
 * Rules live in hub.carrier_settings.settings->'recurringLanes' (JSONB) — a
 * handful of rows per carrier, no dedicated table needed at this scale. The
 * daily recurring-rebook cron walks active carriers and books every rule due
 * that day; `lastRunDate` makes the run idempotent if the cron fires twice.
 *
 * The copy/strip matrix (what recurs vs. what belonged to the old trip) is
 * `rebookLoad`, shared verbatim with duplicateLoadAction so the two paths
 * can never drift.
 */
import { query } from "./db"
import { createLoad, getLoad, getLoadStops, addLoadEvent } from "./loads"
import { logAudit } from "./audit"
import type { Load } from "./types"

export interface RecurringLaneRule {
  loadId: string
  /** Source load reference at rule creation (display only, e.g. "THD-1012"). */
  reference: string
  /** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
  weekday: number
  enabled: boolean
  /** YYYY-MM-DD (carrier-local) of the last successful rebook — the idempotency stamp. */
  lastRunDate: string | null
  /** Reference of the load the last run booked (e.g. "THD-1031"). */
  lastLoadRef: string | null
  /** Why the rule was auto-disabled, if it was (source load deleted, customer removed…). */
  lastError: string | null
}

export const WEEKDAY_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const

/**
 * Weekday/date math runs in the carrier's local day, not UTC — a rule for
 * "Tuesday" means Tuesday at the yard. Single-timezone V1 (Thind is Kent, WA);
 * per-carrier timezone is a settings follow-up.
 */
export const CARRIER_TZ = "America/Los_Angeles"

export function carrierLocalParts(now: Date): { weekday: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CARRIER_TZ,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  return { weekday, date: `${get("year")}-${get("month")}-${get("day")}` }
}

function isRule(value: unknown): value is RecurringLaneRule {
  if (typeof value !== "object" || value === null) return false
  const rule = value as Record<string, unknown>
  return (
    typeof rule.loadId === "string" &&
    typeof rule.weekday === "number" && Number.isInteger(rule.weekday) &&
    rule.weekday >= 0 && rule.weekday <= 6 &&
    typeof rule.enabled === "boolean"
  )
}

export async function getRecurringRules(carrierId: string): Promise<RecurringLaneRule[]> {
  const rows = await query<{ rules: unknown }>(
    `SELECT settings->'recurringLanes' AS rules FROM hub.carrier_settings WHERE carrier_id = $1`,
    [carrierId]
  )
  const raw = rows[0]?.rules
  return Array.isArray(raw) ? raw.filter(isRule) : []
}

export async function getRecurringRule(
  carrierId: string,
  loadId: string
): Promise<RecurringLaneRule | null> {
  const rules = await getRecurringRules(carrierId)
  return rules.find((r) => r.loadId === loadId) ?? null
}

export async function saveRecurringRules(
  carrierId: string,
  rules: RecurringLaneRule[]
): Promise<void> {
  await query(
    `INSERT INTO hub.carrier_settings (carrier_id, settings)
     VALUES ($1, jsonb_build_object('recurringLanes', $2::jsonb))
     ON CONFLICT (carrier_id) DO UPDATE
     SET settings = jsonb_set(carrier_settings.settings, '{recurringLanes}', $2::jsonb, true),
         updated_at = NOW()`,
    [carrierId, JSON.stringify(rules)]
  )
}

/**
 * The Duplicate copy/strip matrix. Keeps what recurs — customer, lane/stops,
 * rate, equipment, assignment, factored flag — and leaves the old trip's facts
 * behind: customer ref, PU#/PO#, appointment windows, stop timestamps, and
 * earned Detention accessorials. The copy lands as a fresh Booked DIRECT load
 * with a provenance note in its timeline plus an audit row naming the source.
 */
export async function rebookLoad(
  carrierId: string,
  loadId: string,
  actor: { id: string | null; name: string | null },
  opts?: { noteVerb?: string }
): Promise<{ ok: true; load: Load } | { ok: false; error: string }> {
  const source = await getLoad(carrierId, loadId)
  if (!source) return { ok: false, error: "Load not found" }
  if (!source.customer_id) return { ok: false, error: "Add a customer to this load before duplicating it" }
  const stops = await getLoadStops(carrierId, loadId)
  if (stops.length === 0) return { ok: false, error: "Load has no stops to copy" }

  const accessorials = (Array.isArray(source.accessorials) ? source.accessorials : [])
    .filter((a) => !/detention/i.test(a.label))
    .map((a) => ({ label: a.label, amount_cents: Number(a.amount_cents || 0) }))

  const load = await createLoad(
    carrierId,
    {
      customer_id: source.customer_id,
      customer_reference: null,
      equipment: source.equipment,
      commodity: source.commodity ?? null,
      weight_lbs: source.weight_lbs ?? null,
      linehaul_cents: Number(source.linehaul_cents),
      fuel_surcharge_cents: Number(source.fuel_surcharge_cents),
      accessorials,
      loaded_miles: source.loaded_miles ?? null,
      deadhead_miles: source.deadhead_miles ?? null,
      truck_id: source.truck_id ?? null,
      trailer_id: source.trailer_id ?? null,
      driver_id: source.driver_id ?? null,
      source: "direct",
      factored: source.factored ?? false,
      notes: source.notes ?? null,
      stops: stops.map((s) => ({
        type: s.type,
        facility: s.facility ?? null,
        address: s.address ?? null,
        city: s.city,
        state: s.state,
        zip: s.zip ?? null,
        fcfs: s.fcfs ?? false,
        pickup_number: null,
        po_number: null,
        appt_start: null,
        appt_end: null,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        notes: s.notes ?? null,
      })),
    },
    { id: actor.id, name: actor.name }
  )
  await addLoadEvent(carrierId, load.id, "note", {
    note: `${opts?.noteVerb ?? "Duplicated"} from ${source.reference}`,
  }, { id: actor.id, name: actor.name })
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "load", entityId: load.id, action: "create",
    newValue: { reference: load.reference, linehaul_cents: load.linehaul_cents, duplicated_from: source.reference },
  })
  return { ok: true, load }
}

export interface RecurringRunResult {
  rules: number
  due: number
  booked: number
  disabled: number
}

/**
 * Daily cron body (per carrier): book every enabled rule whose weekday is
 * today (carrier-local) and that hasn't already run today. A rule whose
 * source can no longer rebook (load deleted, customer removed) would fail
 * every week forever — it gets disabled with the reason in `lastError`.
 */
export async function runRecurringRebooks(
  carrierId: string,
  now: Date = new Date()
): Promise<RecurringRunResult> {
  const { weekday, date } = carrierLocalParts(now)
  const rules = await getRecurringRules(carrierId)
  const result: RecurringRunResult = { rules: rules.length, due: 0, booked: 0, disabled: 0 }
  if (rules.length === 0) return result

  let changed = false
  for (const rule of rules) {
    if (!rule.enabled || rule.weekday !== weekday || rule.lastRunDate === date) continue
    result.due++
    changed = true
    let rebooked: Awaited<ReturnType<typeof rebookLoad>>
    try {
      rebooked = await rebookLoad(
        carrierId, rule.loadId,
        { id: null, name: "Recurring lane" },
        { noteVerb: "Rebooked weekly" }
      )
    } catch (err) {
      rebooked = { ok: false, error: err instanceof Error ? err.message : "Rebook failed" }
    }
    if (rebooked.ok) {
      rule.lastRunDate = date
      rule.lastLoadRef = rebooked.load.reference
      rule.lastError = null
      result.booked++
    } else {
      rule.enabled = false
      rule.lastError = rebooked.error
      result.disabled++
    }
  }
  if (changed) await saveRecurringRules(carrierId, rules)
  return result
}
