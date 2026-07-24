/**
 * Random drug & alcohol testing pool (49 CFR Part 382.305). A CDL-holding
 * workforce must be randomly selected for testing each year at or above the
 * FMCSA-published minimum rates, spread reasonably through the year rather
 * than all at once. Rates already live in carrier settings
 * (randomTesting.drugPct/alcoholPct) but nothing read them before this file.
 *
 * We run selection once per calendar quarter: each quarter's pool size is
 * ceil(active drivers * annual rate / 4), so four full quarters sum to at
 * least the configured annual rate — the common practice for a consortium
 * running quarterly draws. Selection and notification are both idempotent
 * per (carrier, driver, period, test_type) via the table's unique constraint
 * and a status check, so a retry (manual or cron) never re-selects or
 * double-notifies.
 */
import { query } from "./db"
import { getCarrierSettings } from "./settings"
import { notifyDriver } from "./notify"
import { logAudit } from "./audit"

export type TestType = "drug" | "alcohol"
export type TestStatus = "selected" | "notified" | "completed" | "refused" | "no_show"
export type TestResult = "negative" | "positive" | "refused"

export interface RandomTestEvent {
  id: string
  driver_id: string
  driver_name: string
  test_type: TestType
  period: string
  status: TestStatus
  result: TestResult | null
  selected_at: string
  notified_at: string | null
  completed_on: string | null
  notes: string | null
}

export interface RandomTestingSummary {
  period: string
  drug: { pct: number; targetPoolSize: number; selected: number }
  alcohol: { pct: number; targetPoolSize: number; selected: number }
}

/** Current FMCSA testing-period label, e.g. "2026Q3". */
export function currentTestingPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}Q${Math.floor(now.getUTCMonth() / 3) + 1}`
}

function quarterlyPoolSize(activeDriverCount: number, annualPct: number): number {
  if (activeDriverCount <= 0 || annualPct <= 0) return 0
  return Math.ceil((activeDriverCount * annualPct) / 100 / 4)
}

function shuffle<T>(input: T[]): T[] {
  const out = [...input]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

async function activeDriverIds(carrierId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [carrierId]
  )
  return rows.map((r) => r.id)
}

export async function listRandomTestEvents(
  carrierId: string,
  period?: string
): Promise<RandomTestEvent[]> {
  return query<RandomTestEvent>(
    `SELECT e.id, e.driver_id, d.first_name || ' ' || d.last_name AS driver_name,
       e.test_type, e.period, e.status, e.result,
       e.selected_at, e.notified_at, e.completed_on, e.notes
     FROM hub.random_test_events e
     JOIN hub.drivers d ON d.id = e.driver_id AND d.carrier_id = e.carrier_id
     WHERE e.carrier_id = $1 ${period ? "AND e.period = $2" : ""}
     ORDER BY e.selected_at DESC`,
    period ? [carrierId, period] : [carrierId]
  )
}

export async function randomTestingSummary(
  carrierId: string,
  period = currentTestingPeriod()
): Promise<RandomTestingSummary> {
  const settings = await getCarrierSettings(carrierId)
  const activeCount = (await activeDriverIds(carrierId)).length
  const counts = await query<{ test_type: TestType; count: string }>(
    `SELECT test_type, COUNT(*) AS count FROM hub.random_test_events
     WHERE carrier_id = $1 AND period = $2 GROUP BY test_type`,
    [carrierId, period]
  )
  const countFor = (t: TestType) => Number(counts.find((c) => c.test_type === t)?.count ?? 0)
  return {
    period,
    drug: {
      pct: settings.randomTesting.drugPct,
      targetPoolSize: quarterlyPoolSize(activeCount, settings.randomTesting.drugPct),
      selected: countFor("drug"),
    },
    alcohol: {
      pct: settings.randomTesting.alcoholPct,
      targetPoolSize: quarterlyPoolSize(activeCount, settings.randomTesting.alcoholPct),
      selected: countFor("alcohol"),
    },
  }
}

/**
 * Select this quarter's pool for one test type, topping up to the target
 * size if a previous run already selected some drivers. Returns only the
 * newly-selected events (empty once the quarter's pool is full).
 */
export async function selectRandomTestPool(
  carrierId: string,
  testType: TestType,
  period = currentTestingPeriod()
): Promise<RandomTestEvent[]> {
  const settings = await getCarrierSettings(carrierId)
  const pct = testType === "drug" ? settings.randomTesting.drugPct : settings.randomTesting.alcoholPct
  const active = await activeDriverIds(carrierId)
  const poolSize = quarterlyPoolSize(active.length, pct)
  if (poolSize === 0) return []

  const already = await query<{ driver_id: string }>(
    `SELECT driver_id FROM hub.random_test_events WHERE carrier_id = $1 AND period = $2 AND test_type = $3`,
    [carrierId, period, testType]
  )
  const alreadySelected = new Set(already.map((r) => r.driver_id))
  const remaining = poolSize - alreadySelected.size
  if (remaining <= 0) return []

  const eligible = active.filter((id) => !alreadySelected.has(id))
  const picked = shuffle(eligible).slice(0, remaining)
  if (picked.length === 0) return []

  const inserted = await query<{ id: string }>(
    `INSERT INTO hub.random_test_events (carrier_id, driver_id, test_type, period)
     SELECT $1, d, $3, $4 FROM UNNEST($2::uuid[]) AS d
     ON CONFLICT (carrier_id, driver_id, period, test_type) DO NOTHING
     RETURNING id`,
    [carrierId, picked, testType, period]
  )
  if (inserted.length === 0) return []

  await logAudit({
    carrierId, actorId: null, actorName: "System",
    entityType: "random_test_pool", entityId: period, action: "selected",
    newValue: { period, testType, count: inserted.length },
  })

  const insertedIds = new Set(inserted.map((r) => r.id))
  const events = await listRandomTestEvents(carrierId, period)
  return events.filter((e) => insertedIds.has(e.id))
}

/**
 * Notify every driver still "selected" for a period+type — safe to call
 * repeatedly, since a driver moves to "notified" the moment their push/in-app
 * notice goes out and is skipped on the next pass.
 */
export async function notifyRandomTestPool(
  carrierId: string,
  testType: TestType,
  period = currentTestingPeriod()
): Promise<{ notified: number }> {
  const pending = await query<{ id: string; driver_id: string }>(
    `SELECT id, driver_id FROM hub.random_test_events
     WHERE carrier_id = $1 AND period = $2 AND test_type = $3 AND status = 'selected'`,
    [carrierId, period, testType]
  )
  for (const row of pending) {
    await notifyDriver(carrierId, row.driver_id, {
      kind: "random_test",
      title: `Random ${testType} test — report now`,
      body: "You've been randomly selected for DOT testing. Report to the collection site immediately per company policy.",
      link: "/hub/driver",
    })
    await query(
      `UPDATE hub.random_test_events SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.id]
    )
  }
  return { notified: pending.length }
}

export async function recordRandomTestResult(
  carrierId: string,
  id: string,
  input: {
    status: Extract<TestStatus, "completed" | "refused" | "no_show">
    result?: TestResult | null
    completedOn?: string | null
    notes?: string | null
  }
): Promise<void> {
  await query(
    `UPDATE hub.random_test_events
     SET status = $3, result = $4, completed_on = $5, notes = COALESCE($6, notes), updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id, input.status, input.result ?? null, input.completedOn ?? null, input.notes ?? null]
  )
}
