import "server-only"
import { hubDb, query } from "./db"
import { changeLoadStatus, setStopTimestamp } from "./loads"
import { createInvoiceFromLoad, recordPayment } from "./invoices"
import { notifyRoles, notifyUser } from "./notify"
import { SANDBOX_CARRIER_ID } from "./sandbox"
import { checkSandboxInvariants } from "./sandbox-sim-invariants"
import { hash01 } from "./sandbox-sim-math"
import { planSandboxTick, type SimOp, type SimState, type WorldSnapshot } from "./sandbox-sim-plan"
import { CITIES, type WorldCityKey } from "./sandbox-world"
import type { LoadStatus } from "./types"

/**
 * The sandbox simulation's executor: snapshots the world, asks the pure
 * planner what should happen at `now`, and applies the ops — NPC status
 * changes through the real domain functions (load events, cash-clock stamps,
 * driver notifications all real), telemetry through carrier-scoped bulk
 * inserts.
 *
 * Concurrency: one advisory try-lock (SAME key as the seed, so tick vs tick
 * vs reset serialize; a busy caller no-ops instead of queueing). Crash
 * safety: rules are state-convergent — a re-run after any partial failure
 * converges to the same world; `lastTickAt` (committed last) only rate-limits.
 */

const C = SANDBOX_CARRIER_ID
const NPC = { id: null as string | null, name: "Blue Ridge autopilot" }
const DEFAULT_SIM: SimState = { epoch: "unseeded", lastTickAt: null, nextDropAt: null, activeSeats: {} }

export interface TickResult {
  advanced: boolean
  reason?: string
  ops?: number
  catchUp?: boolean
  /** Invariant rules the world violated after this tick — empty is healthy. */
  violations?: string[]
}

/** Refresh a seat's presence stamp (cheap, outside the tick lock). */
async function touchPresence(seatKey: string | null | undefined, now: Date): Promise<void> {
  if (!seatKey) return
  await query(
    `UPDATE hub.carrier_settings
        SET settings = jsonb_set(settings, '{sim,activeSeats,${seatKey.replace(/[^a-z_]/g, "")}}',
                                 to_jsonb($2::text), true)
      WHERE carrier_id = $1 AND settings ? 'sim'`,
    [C, now.toISOString()]
  )
}

export async function tickSandboxSim(seatKey?: string | null, now = new Date()): Promise<TickResult> {
  await touchPresence(seatKey, now).catch(() => {})

  // Cheap path first (review E1): one indexed SELECT of lastTickAt — most
  // heartbeats exit here without ever taking the lock or snapshotting. The
  // in-lock re-check below stays as the race-safe authority.
  const pre = await query<{ last: string | null; seeded: boolean }>(
    `SELECT settings->'sim'->>'lastTickAt' AS last, settings ? 'sim' AS seeded
       FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  if (!pre[0]?.seeded) return { advanced: false, reason: "unseeded" }
  if (pre[0].last && now.getTime() - new Date(pre[0].last).getTime() < 20_000) {
    return { advanced: false, reason: "fresh" }
  }

  const client = await hubDb().connect()
  let locked = false
  try {
    await client.query("BEGIN")
    const lock = await client.query(`SELECT pg_try_advisory_xact_lock(hashtext('loadoff-sandbox-seed')) AS ok`)
    if (!lock.rows[0]?.ok) {
      await client.query("ROLLBACK")
      return { advanced: false, reason: "busy" }
    }
    locked = true

    const stateRow = await client.query(
      `SELECT settings->'sim' AS sim FROM hub.carrier_settings WHERE carrier_id = $1`,
      [C]
    )
    const rawSim = stateRow.rows[0]?.sim as SimState | null
    if (!rawSim) {
      await client.query("ROLLBACK")
      return { advanced: false, reason: "unseeded" }
    }
    const sim: SimState = { ...DEFAULT_SIM, ...rawSim, activeSeats: rawSim.activeSeats ?? {} }
    const elapsedMs = sim.lastTickAt ? now.getTime() - new Date(sim.lastTickAt).getTime() : 0
    if (sim.lastTickAt && elapsedMs < 20_000) {
      await client.query("ROLLBACK")
      return { advanced: false, reason: "fresh" }
    }

    const world = await snapshotWorld()
    const { ops, nextSim, catchUp } = planSandboxTick(world, sim, now)

    // Telemetry ops batch inside the lock transaction; domain ops commit
    // independently (their own transactions) while the lock is held.
    const pings: { truckId: string; at: Date; lat: number; lng: number }[] = []
    const hosRows: unknown[][] = []
    for (const op of ops) {
      try {
        await applyOp(op, client, pings, hosRows, now)
      } catch (err) {
        console.error(`sandbox sim op failed (${op.op}):`, err)
      }
    }
    if (pings.length > 0) {
      const params: unknown[] = []
      const tuples = pings.map((p) => {
        params.push(C, p.truckId, p.at, p.lat, p.lng, "demo")
        const base = params.length - 6
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`
      })
      await client.query(
        `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, source) VALUES ${tuples.join(",")}`,
        params
      )
    }
    if (hosRows.length > 0) {
      const params: unknown[] = []
      const tuples = hosRows.map((row) => {
        params.push(...row)
        const base = params.length - row.length
        return `(${row.map((_, i) => `$${base + i + 1}`).join(",")})`
      })
      await client.query(
        `INSERT INTO hub.hos_snapshots (carrier_id, driver_id, ts, duty_status, drive_remaining_minutes,
           shift_remaining_minutes, cycle_remaining_minutes, source) VALUES ${tuples.join(",")}`,
        params
      )
    }

    // Commit ONLY the keys this tick owns, each with its own jsonb_set, and
    // increment the counters SQL-side from the row's current value. Writing
    // the whole '{sim}' subtree from the JS snapshot would silently clobber
    // anything written since the read — presence stamps (touchPresence, which
    // runs unlocked before the gate) and shift counters (bumpShiftCounter)
    // are exactly that, and a catch-up tick's op burst leaves a multi-second
    // window for them to land. Disjoint write sets, no lost updates.
    // jsonb_set's create_missing only creates the FINAL key of a path, so the
    // telemetry object is materialized first (a fresh seed has no telemetry
    // key — without this the counter writes would silently no-op).
    await client.query(
      `UPDATE hub.carrier_settings
          SET settings = jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        jsonb_set(settings, '{sim,telemetry}',
                                COALESCE(settings->'sim'->'telemetry', '{}'::jsonb), true),
                      '{sim,lastTickAt}', COALESCE(to_jsonb($2::text), 'null'::jsonb), true),
                    '{sim,nextDropAt}', COALESCE(to_jsonb($3::text), 'null'::jsonb), true),
                  '{sim,telemetry,ticks}',
                  to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'ticks')::int, 0) + 1), true),
                  '{sim,telemetry,opsApplied}',
                  to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'opsApplied')::int, 0) + $4::int), true),
                '{sim,nextTroubleAt}', COALESCE(to_jsonb($5::text), 'null'::jsonb), true),
              updated_at = NOW()
        WHERE carrier_id = $1 AND settings ? 'sim'`,
      [C, nextSim.lastTickAt, nextSim.nextDropAt, ops.length, nextSim.nextTroubleAt ?? null]
    )
    await client.query("COMMIT")
    // "Advanced" means the world actually changed — a quiet tick must not
    // make every open sandbox tab router.refresh() on its heartbeat.
    // Check the world against its own rules after every tick that changed
    // something. A demo that runs unattended for hours is precisely where a
    // slow corruption would hide; this is what makes the run self-auditing
    // rather than merely continuous. Never fatal — halting the world is
    // worse for whoever is playing than a logged inconsistency — but always
    // visible, and the e2e smoke fails on it.
    let violations: string[] = []
    if (ops.length > 0) {
      try {
        const found = await checkSandboxInvariants()
        violations = found.map((v) => v.rule)
        for (const v of found) console.error(`sandbox sim invariant broken [${v.rule}]: ${v.detail}`)
      } catch (err) {
        console.error("sandbox sim invariant check failed:", err)
      }
    }

    return ops.length > 0
      ? { advanced: true, ops: ops.length, catchUp, violations }
      : { advanced: false, reason: "quiet", ops: 0, catchUp }
  } catch (err) {
    if (locked) await client.query("ROLLBACK").catch(() => {})
    console.error("sandbox sim tick failed:", err)
    return { advanced: false, reason: "error" }
  } finally {
    client.release()
  }
}

/* ------------------------------- snapshot ------------------------------- */

async function snapshotWorld(): Promise<WorldSnapshot> {
  // The carrier's own free time decides how long a hold has to run before it
  // is worth money — read it rather than assuming the sandbox's two hours.
  const settingsRows = await query<{ free_hours: number | null }>(
    `SELECT (settings->'detention'->>'freeHours')::numeric AS free_hours
       FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  const freeMinutes = Math.round(Number(settingsRows[0]?.free_hours ?? 2) * 60)
  const loads = await query<{
    id: string
    reference: string
    status: LoadStatus
    loaded_miles: number | null
    driver_id: string | null
    truck_id: string | null
    player_driven: boolean
    created_at: Date
    delivered_at: Date | null
  }>(
    `SELECT l.id, l.reference, l.status, l.loaded_miles, l.driver_id, l.truck_id, l.created_at, l.delivered_at,
            (d.user_id IS NOT NULL) AS player_driven
       FROM hub.loads l
       LEFT JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
      WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
        AND l.status IN ('quoted','booked','dispatched','at_pickup','in_transit','delivered','pod_received')
      LIMIT 400`,
    [C]
  )
  const stops = await query<{
    id: string
    load_id: string
    type: string
    lat: number | null
    lng: number | null
    appt_start: Date | null
    arrived_at: Date | null
    departed_at: Date | null
  }>(
    `SELECT id, load_id, type, lat, lng, appt_start, arrived_at, departed_at
       FROM hub.stops WHERE carrier_id = $1 AND load_id = ANY($2::uuid[])
      LIMIT 1000`,
    [C, loads.map((l) => l.id)]
  )
  const stopsByLoad = new Map<string, typeof stops>()
  for (const stop of stops) {
    const arr = stopsByLoad.get(stop.load_id) ?? []
    arr.push(stop)
    stopsByLoad.set(stop.load_id, arr)
  }
  const toSimStop = (s: (typeof stops)[number] | undefined) =>
    s
      ? {
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          appt: s.appt_start ? new Date(s.appt_start) : null,
          arrivedAt: s.arrived_at ? new Date(s.arrived_at) : null,
          departedAt: s.departed_at ? new Date(s.departed_at) : null,
        }
      : null

  const trucks = await query<{ truck_id: string; last_ping: Date | null }>(
    `SELECT truck_id, MAX(ts) AS last_ping FROM hub.position_pings
      WHERE carrier_id = $1 GROUP BY truck_id LIMIT 100`,
    [C]
  )
  const hos = await query<{
    driver_id: string
    drive_remaining_minutes: number | null
    shift_remaining_minutes: number | null
    cycle_remaining_minutes: number | null
    ts: Date
  }>(
    `SELECT DISTINCT ON (driver_id) driver_id, drive_remaining_minutes, shift_remaining_minutes,
            cycle_remaining_minutes, ts
       FROM hub.hos_snapshots WHERE carrier_id = $1 ORDER BY driver_id, ts DESC LIMIT 100`,
    [C]
  )
  const invoicesPastDue = await query<{ id: string; customer_name: string }>(
    `SELECT i.id, c.name AS customer_name
       FROM hub.invoices i JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = $1
      WHERE i.carrier_id = $1 AND i.status IN ('sent','overdue','partial') AND i.due_on < CURRENT_DATE
      ORDER BY i.due_on ASC LIMIT 10`,
    [C]
  )
  const idleNpc = await query<{ driver_id: string; truck_id: string }>(
    `SELECT d.id AS driver_id, t.id AS truck_id
       FROM hub.drivers d
       JOIN hub.trucks t ON t.assigned_driver_id = d.id AND t.carrier_id = $1 AND t.status = 'active'
      WHERE d.carrier_id = $1 AND d.user_id IS NULL AND d.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM hub.loads l WHERE l.carrier_id = $1 AND l.driver_id = d.id
            AND l.status IN ('booked','dispatched','at_pickup','in_transit')
        )
      LIMIT 5`,
    [C]
  )
  const playerDrivers = await query<{
    driver_id: string
    truck_id: string | null
    user_id: string
    idle_min: number | null
  }>(
    `SELECT d.id AS driver_id, t.id AS truck_id, d.user_id,
            CASE WHEN EXISTS (
              SELECT 1 FROM hub.loads l WHERE l.carrier_id = $1 AND l.driver_id = d.id
                AND l.status IN ('booked','dispatched','at_pickup','in_transit','delivered')
            ) THEN NULL
            ELSE COALESCE(
              EXTRACT(EPOCH FROM (NOW() - (
                SELECT MAX(COALESCE(l2.pod_received_at, l2.delivered_at)) FROM hub.loads l2
                 WHERE l2.carrier_id = $1 AND l2.driver_id = d.id
              ))) / 60, 999)::int
            END AS idle_min
       FROM hub.drivers d
       LEFT JOIN hub.trucks t ON t.assigned_driver_id = d.id AND t.carrier_id = $1
      WHERE d.carrier_id = $1 AND d.user_id IS NOT NULL
      LIMIT 10`,
    [C]
  )
  const dispatcherUsers = await query<{ id: string }>(
    `SELECT id FROM hub.users WHERE carrier_id = $1 AND active AND role IN ('owner','dispatcher') LIMIT 20`,
    [C]
  )
  const seq = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM hub.loads WHERE carrier_id = $1`,
    [C]
  )

  return {
    loads: loads.map((l) => {
      const pair = stopsByLoad.get(l.id) ?? []
      return {
        id: l.id,
        reference: l.reference,
        status: l.status,
        loadedMiles: l.loaded_miles ?? 300,
        driverId: l.driver_id,
        truckId: l.truck_id,
        playerDriven: l.player_driven,
        createdAt: new Date(l.created_at),
        deliveredAt: l.delivered_at ? new Date(l.delivered_at) : null,
        pickup: toSimStop(pair.find((s) => s.type === "pickup")),
        delivery: toSimStop(pair.find((s) => s.type === "delivery")),
      }
    }),
    trucks: trucks.map((t) => ({
      truckId: t.truck_id,
      driverId: null,
      lastPingAt: t.last_ping ? new Date(t.last_ping) : null,
    })),
    hos: hos.map((h) => ({
      driverId: h.driver_id,
      driveRemainingMinutes: h.drive_remaining_minutes ?? 600,
      shiftRemainingMinutes: h.shift_remaining_minutes ?? 700,
      cycleRemainingMinutes: h.cycle_remaining_minutes ?? 2400,
      at: new Date(h.ts),
    })),
    invoicesPastDue: invoicesPastDue.map((i) => ({ id: i.id, customerName: i.customer_name })),
    quotedCount: loads.filter((l) => l.status === "quoted").length,
    idleNpc: idleNpc.map((r) => ({ driverId: r.driver_id, truckId: r.truck_id })),
    playerDrivers: playerDrivers
      .filter((p) => p.user_id)
      .map((p) => ({
        driverId: p.driver_id,
        truckId: p.truck_id,
        userId: p.user_id,
        idleSincePodMin: p.idle_min,
      })),
    dispatcherUserIds: dispatcherUsers.map((u) => u.id),
    invoiceSeq: seq[0]?.n ?? 0,
    detentionFreeMinutes: freeMinutes,
  }
}

/* -------------------------------- apply -------------------------------- */

/**
 * Ops run strictly sequentially (the pool caps at 5 connections and a
 * catch-up burst must never fan out) — see the for-loop in tickSandboxSim.
 *
 * Timestamp honesty (review A7, approved as designed): stop `arrived_at`
 * is the exact computed instant via setStopTimestamp; `delivered_at` /
 * `pod_received_at` are NOW()-stamped by changeLoadStatus — "the paperwork
 * catches up" — and recap on-time math reads stops.arrived_at only.
 */
async function applyOp(
  op: SimOp,
  client: import("pg").PoolClient,
  pings: { truckId: string; at: Date; lat: number; lng: number }[],
  hosRows: unknown[][],
  now: Date
): Promise<void> {
  switch (op.op) {
    case "movePing":
      pings.push({ truckId: op.truckId, at: op.at, lat: op.pos.lat, lng: op.pos.lng })
      return
    case "stampStop":
      await setStopTimestamp(C, op.stopId, op.loadId, op.field, op.at.toISOString())
      return
    case "advanceStatus":
      await changeLoadStatus(C, op.loadId, op.to, NPC)
      return
    case "npcBook":
      await query(
        `UPDATE hub.loads SET driver_id = $2, truck_id = $3, updated_at = NOW()
          WHERE carrier_id = $1 AND id = $4`,
        [C, op.driverId, op.truckId, op.loadId]
      )
      await changeLoadStatus(C, op.loadId, "booked", NPC)
      return
    case "offerPlayerLoad":
      await query(
        `UPDATE hub.loads SET driver_id = $2, truck_id = $3, updated_at = NOW()
          WHERE carrier_id = $1 AND id = $4`,
        [C, op.driverId, op.truckId, op.loadId]
      )
      await changeLoadStatus(C, op.loadId, "booked", { id: null, name: "Dispatch autopilot" })
      // 'dispatched' auto-notifies the driver through the real path.
      await changeLoadStatus(C, op.loadId, "dispatched", { id: null, name: "Dispatch autopilot" })
      return
    case "dropQuotedLoad": {
      const origin = CITIES[op.originKey as WorldCityKey]
      const dest = CITIES[op.destKey as WorldCityKey]
      // Deterministic broker pick: SQL random() was the last uncontrolled
      // source of randomness in the tick, and a run you cannot reproduce is
      // a run you cannot debug. The planner already derives a stable 0..1
      // from the load's reference, so the same planned op always lands on
      // the same broker — ordered by id so the row set is stable too.
      const brokers = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM hub.customers
          WHERE carrier_id = $1 AND type = 'broker' AND status = 'active'
          ORDER BY id`,
        [C]
      )
      const customer = {
        rows: brokers.rows.length
          ? [brokers.rows[Math.floor(hash01(`broker-${op.reference}`) * brokers.rows.length)]]
          : [],
      }
      if (!customer.rows[0] || !origin || !dest) return
      const inserted = await client.query(
        `INSERT INTO hub.loads (carrier_id, reference, customer_id, status, equipment, commodity, weight_lbs,
           linehaul_cents, fuel_surcharge_cents, loaded_miles, deadhead_miles, source)
         VALUES ($1,$2,$3,'quoted',$4,$5,$6,$7,$8,$9,25,'quote') RETURNING id`,
        [C, op.reference, customer.rows[0].id, op.equipment, op.commodity, op.weightLbs,
          op.linehaulCents, op.fscCents, op.miles]
      )
      const loadId = inserted.rows[0].id as string
      await client.query(
        `INSERT INTO hub.stops (carrier_id, load_id, sequence, type, facility, city, state, lat, lng, appt_start)
         VALUES ($1,$2,1,'pickup',$3,$4,$5,$6,$7,$8),
                ($1,$2,2,'delivery',$9,$10,$11,$12,$13,$14)`,
        [C, loadId,
          `${origin.city} Distribution`, origin.city, origin.state, origin.lat, origin.lng, op.pickupAppt,
          `${dest.city} Receiving`, dest.city, dest.state, dest.lat, dest.lng,
          new Date(op.pickupAppt.getTime() + Math.max(1, Math.round(op.miles / 52)) * 3_600_000)]
      )
      await notifyRoles(C, ["owner", "dispatcher"], {
        kind: "message",
        title: `New rate con · ${customer.rows[0].name}`,
        body: `${origin.city} → ${dest.city} · ${op.miles} mi · $${(op.linehaulCents / 100).toLocaleString()}`,
        link: "/hub/loadboard",
      })
      return
    }
    case "autoInvoice":
      await createInvoiceFromLoad(C, op.loadId, NPC, { email: false })
      return
    case "payInvoice": {
      const open = await query<{ open_cents: number }>(
        `SELECT (i.amount_cents - COALESCE((
            SELECT SUM(p.amount_cents) FROM hub.payments p
             WHERE p.carrier_id = $1 AND p.invoice_id = i.id), 0))::int AS open_cents
           FROM hub.invoices i WHERE i.carrier_id = $1 AND i.id = $2`,
        [C, op.invoiceId]
      )
      const cents = open[0]?.open_cents ?? 0
      if (cents <= 0) return
      await recordPayment(
        C,
        op.invoiceId,
        { amountCents: cents, paidOn: now.toISOString().slice(0, 10), method: "ACH", reference: `SIM-${op.invoiceId.slice(0, 8)}` },
        { id: null, name: `${op.customerName} (AP)` }
      )
      return
    }
    case "hosSnapshot":
      hosRows.push([C, op.driverId, now, "driving", op.driveRemainingMinutes, op.shiftRemainingMinutes,
        op.cycleRemainingMinutes, "telematics"])
      return
    case "fuelPurchase":
      await client.query(
        `INSERT INTO hub.fuel_transactions (carrier_id, source, external_id, card_program, truck_id, driver_id,
           ts, merchant, jurisdiction, gallons, fuel_type, unit_price_cents, total_cents)
         VALUES ($1,'sim',$2,'EFS',$3,$4,$5,$6,$7,$8,'diesel',$9,$10)
         ON CONFLICT (carrier_id, source, external_id) DO NOTHING`,
        [C, op.externalId, op.truckId, op.driverId, now, op.merchant, op.jurisdiction,
          op.gallons, op.unitPriceCents, op.gallons * op.unitPriceCents]
      )
      return
    case "safetyEvent":
      await client.query(
        `INSERT INTO hub.safety_events (carrier_id, driver_id, truck_id, kind, occurred_at, location, source)
         VALUES ($1,$2,$3,$4,$5,'En route','eld')`,
        [C, op.driverId, op.truckId, op.kind, now]
      )
      return
    case "notifyUser":
      await notifyUser(C, op.userId, { kind: op.kind, title: op.title, body: op.body, link: op.link })
      return
    case "receiverHold": {
      // Backdate the arrival past the free time and leave the departure open.
      // That is the whole trick: every downstream piece already exists, so the
      // dwell shows up on the dispatch board with a dollar figure and bills
      // itself the moment somebody marks the truck departed.
      if (op.needsStatus) await changeLoadStatus(C, op.loadId, "at_pickup", NPC)
      await setStopTimestamp(C, op.stopId, op.loadId, "arrived_at", op.arrivedAt.toISOString())
      await client.query(
        `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
         VALUES ($1, $2, 'exception', NULL, $3, $4::jsonb)`,
        [
          C,
          op.loadId,
          NPC.name,
          JSON.stringify({ type: "receiver_hold", note: "Receiver is holding the truck — detention is running." }),
        ]
      )
      for (const userId of op.notifyUserIds) {
        await notifyUser(C, userId, {
          kind: "load_exception",
          title: `${op.reference} is being held`,
          body: "The receiver has the truck sitting. Detention is running — mark it departed to bill it.",
          link: `/hub/loads/${op.loadId}`,
        })
      }
      return
    }
    case "prunePings":
      await client.query(
        `DELETE FROM hub.position_pings WHERE carrier_id = $1 AND ts < NOW() - INTERVAL '7 days'`,
        [C]
      )
      return
  }
}
