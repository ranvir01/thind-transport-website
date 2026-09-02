import "server-only"
import { query } from "./db"
import { getDwellingStops } from "./detention"
import { evaluatePayRules, parseRuleSet, type PayLoadContext } from "./pay-rules"
import { SANDBOX_CARRIER_ID, type SandboxScenario } from "./sandbox"
import { emptyMetrics, type ShiftMetrics, type ShiftSeatKey } from "./sandbox-objectives"

/**
 * Shift Mode's metric readers: a handful of cheap carrier-scoped counts,
 * snapshot at clock-in (baseline) and again on demand (live objectives,
 * clock-out recap). Player attribution rides the audit trails the domain
 * functions already write — load_events.actor_id for status moves,
 * audit_log.actor_id for invoices — so NPC activity never pads a score.
 */

const C = SANDBOX_CARRIER_ID

/**
 * Bump a shift telemetry counter (review A2) — the weekly audit reads
 * settings.sim.telemetry to see whether demo users actually play. The seat
 * key is validated by callers (isShiftSeat) and scrubbed here anyway; the
 * inner jsonb_set materializes the telemetry object so the bump works on a
 * freshly-seeded world that has never ticked.
 */
export async function bumpShiftCounter(kind: "shiftsStarted" | "shiftsCompleted", seat: string): Promise<void> {
  const key = `${kind}_${seat}`.replace(/[^a-zA-Z_]/g, "")
  await query(
    `UPDATE hub.carrier_settings
        SET settings = jsonb_set(
              jsonb_set(settings, '{sim,telemetry}', COALESCE(settings->'sim'->'telemetry', '{}'::jsonb), true),
              '{sim,telemetry,${key}}',
              to_jsonb(COALESCE((settings->'sim'->'telemetry'->>'${key}')::int, 0) + 1), true)
      WHERE carrier_id = $1 AND settings ? 'sim'`,
    [C]
  )
}

/** Current sim epoch — a reset mints a new one, voiding in-flight shifts. */
export async function readSimEpoch(): Promise<string | null> {
  const rows = await query<{ epoch: string | null }>(
    `SELECT settings->'sim'->>'epoch' AS epoch FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  return rows[0]?.epoch ?? null
}

/**
 * Which world is loaded — "steady" or "crunch".
 *
 * Defaults to "steady" rather than null: a sandbox seeded before this key
 * existed IS the steady week, and a banner that says nothing teaches a player
 * less than one that says the true thing about the common case.
 */
export async function readSimScenario(): Promise<SandboxScenario> {
  const rows = await query<{ scenario: string | null }>(
    `SELECT settings->'sim'->>'scenario' AS scenario FROM hub.carrier_settings WHERE carrier_id = $1`,
    [C]
  )
  return rows[0]?.scenario === "crunch" ? "crunch" : "steady"
}

/**
 * Owner seat: settlement approvals, payouts, advances, payments. Every
 * counter is actor-scoped — the sim's autopilot records payments of its own
 * (sandbox-sim.ts payInvoice, actor id null) and must never pad a score.
 */
async function ownerMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [audits, queue] = await Promise.all([
    query<{ entity_type: string; action: string; n: number }>(
      `SELECT entity_type, action, COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'settlement' AND action IN ('approve','paid'))
            OR (entity_type = 'advance' AND action = 'create')
            OR (entity_type = 'payment' AND action = 'record'))
        GROUP BY 1, 2`,
      [C, userId]
    ),
    query<{ drafts: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts
         FROM hub.settlements WHERE carrier_id = $1`,
      [C]
    ),
  ])
  const n = (entity: string, action: string) =>
    audits.find((a) => a.entity_type === entity && a.action === action)?.n ?? 0
  // Cash the owner personally put in motion: settlements they paid out, plus
  // advances and payments they recorded. The autopilot's own payments carry a
  // null actor and are excluded by the actor_id filter above, so the number
  // is the owner's hand on the money and nobody else's.
  //
  // Payments are summed straight off their audit rows. recordPayment logs the
  // payment against the INVOICE id (invoices.ts), not the payment row's id, so
  // a join on hub.payments.id matched nothing and every payment the owner
  // recorded during a shift was worth $0 on the money line while the
  // objective beside it ticked. The audit row carries the amount, and
  // reading it there also keeps two payments on one invoice from each
  // counting the other.
  const moved = await query<{ cents: string }>(
    `SELECT COALESCE((SELECT SUM(s.net_cents) FROM hub.settlements s
                       JOIN hub.audit_log a ON a.carrier_id = $1 AND a.entity_type = 'settlement'
                        AND a.action = 'paid' AND a.entity_id = s.id::text AND a.actor_id = $2
                      WHERE s.carrier_id = $1), 0)
          + COALESCE((SELECT SUM(ad.amount_cents) FROM hub.advances ad
                       JOIN hub.audit_log a2 ON a2.carrier_id = $1 AND a2.entity_type = 'advance'
                        AND a2.action = 'create' AND a2.entity_id = ad.id::text AND a2.actor_id = $2
                      WHERE ad.carrier_id = $1), 0)
          + COALESCE((SELECT SUM((a3.new_value->>'amountCents')::bigint) FROM hub.audit_log a3
                      WHERE a3.carrier_id = $1 AND a3.entity_type = 'payment'
                        AND a3.action = 'record' AND a3.actor_id = $2
                        AND a3.new_value ? 'amountCents'), 0) AS cents`,
    [C, userId]
  )
  return {
    mySettlementApprovals: n("settlement", "approve"),
    mySettlementPayouts: n("settlement", "paid"),
    myAdvances: n("advance", "create"),
    myPayments: n("payment", "record"),
    draftSettlements: queue[0]?.drafts ?? 0,
    myCashMovedCents: Number(moved[0]?.cents ?? 0),
  }
}

/**
 * Safety seat: the incident register and the repair that releases a grounded
 * truck. `incidents.reported_by` and `dvirs.repair_certified_by` carry the
 * actor on the row itself; closing an incident has no such column, so it
 * rides the audit trail the action always writes.
 */
async function safetyMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [incidents, certs, audits] = await Promise.all([
    query<{ mine: number; open: number }>(
      `SELECT COUNT(*) FILTER (WHERE reported_by = $2)::int AS mine,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open
         FROM hub.incidents WHERE carrier_id = $1`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.dvirs
        WHERE carrier_id = $1 AND repair_certified_by = $2 AND repair_certified_at IS NOT NULL`,
      [C, userId]
    ),
    query<{ entity_type: string; closed: number; n: number }>(
      `SELECT entity_type,
              COUNT(*) FILTER (WHERE new_value->>'status' = 'closed')::int AS closed,
              COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'incident' AND action = 'update')
            OR (entity_type = 'random_test_event' AND action = 'result'))
        GROUP BY 1`,
      [C, userId]
    ),
  ])
  // Safety's work pays off on somebody else's wheels: a grounded truck earns
  // nothing, and certifying its repair is what lets it take freight again.
  // So the seat's money line is the freight actually riding right now on the
  // trucks this user released — real loads with real rates, no assumed
  // day-rate and no credit for trucks that are sitting.
  const rolling = await query<{ cents: string }>(
    `SELECT COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents), 0)::bigint AS cents
       FROM hub.loads l
      WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
        AND l.status IN ('dispatched','at_pickup','in_transit')
        AND l.truck_id IN (SELECT v.truck_id FROM hub.dvirs v
                            WHERE v.carrier_id = $1 AND v.repair_certified_by = $2
                              AND v.repair_certified_at IS NOT NULL)`,
    [C, userId]
  )
  return {
    myIncidents: incidents[0]?.mine ?? 0,
    openIncidents: incidents[0]?.open ?? 0,
    myRepairCerts: certs[0]?.n ?? 0,
    myIncidentsClosed: audits.find((a) => a.entity_type === "incident")?.closed ?? 0,
    myRandomTestResults: audits.find((a) => a.entity_type === "random_test_event")?.n ?? 0,
    myReleasedTruckFreightCents: Number(rolling[0]?.cents ?? 0),
  }
}

/**
 * Recruiter seat. `hub.applicant_events` has no actor_id column (only
 * actor_name), so stage moves match the seat's own name — safe here because
 * sandbox seat names are unique and the recruiting domain has no autopilot
 * writing events. Signatures and hires use the stronger audit_log actor_id.
 */
async function recruiterMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [stages, audits, pipeline] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.applicant_events e
        WHERE e.carrier_id = $1 AND e.from_stage IS NOT NULL
          AND e.actor_name = (SELECT u.name FROM hub.users u WHERE u.id = $2 AND u.carrier_id = $1)`,
      [C, userId]
    ),
    query<{ entity_type: string; n: number }>(
      `SELECT entity_type, COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND ((entity_type = 'offer' AND action = 'signed')
            OR (entity_type = 'applicant' AND action = 'converted_to_driver'))
        GROUP BY 1`,
      [C, userId]
    ),
    query<{ waiting: number }>(
      `SELECT COUNT(*)::int AS waiting FROM hub.applicants
        WHERE carrier_id = $1 AND stage = 'applied'`,
      [C]
    ),
  ])
  // Same shape as safety: a hire is worth what the person hired is hauling.
  // The applicant row carries `converted_driver_id`, and the hire itself is
  // audited against the recruiter — so this walks recruiter → applicant they
  // converted → driver → freight on the road, with no step invented.
  const rolling = await query<{ cents: string }>(
    `SELECT COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents), 0)::bigint AS cents
       FROM hub.loads l
      WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
        AND l.status IN ('dispatched','at_pickup','in_transit')
        AND l.driver_id IN (
          SELECT ap.converted_driver_id FROM hub.applicants ap
           JOIN hub.audit_log a ON a.carrier_id = $1 AND a.entity_type = 'applicant'
            AND a.action = 'converted_to_driver' AND a.entity_id = ap.id::text AND a.actor_id = $2
          WHERE ap.carrier_id = $1 AND ap.converted_driver_id IS NOT NULL)`,
    [C, userId]
  )
  return {
    myStageAdvances: stages[0]?.n ?? 0,
    myOffersSigned: audits.find((a) => a.entity_type === "offer")?.n ?? 0,
    myHires: audits.find((a) => a.entity_type === "applicant")?.n ?? 0,
    applicantsWaiting: pipeline[0]?.waiting ?? 0,
    myHiredDriverFreightCents: Number(rolling[0]?.cents ?? 0),
  }
}

/**
 * Owner-operator extras: the money and equipment that are HIS, not the
 * company's. Advances and DVIRs join through drivers.user_id so another
 * driver's paperwork can never count; receipts ride the driver-side audit
 * action (`expense`/`driver_receipt`), which only the phone app writes.
 */
async function ownerOperatorMetrics(userId: string): Promise<Partial<ShiftMetrics>> {
  const [advances, dvirs, receipts] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.advances a
         JOIN hub.drivers d ON d.id = a.driver_id AND d.carrier_id = $1
        WHERE a.carrier_id = $1 AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.dvirs v
         JOIN hub.drivers d ON d.id = v.driver_id AND d.carrier_id = $1
        WHERE v.carrier_id = $1 AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM hub.audit_log
        WHERE carrier_id = $1 AND actor_id = $2
          AND entity_type = 'expense' AND action = 'driver_receipt'`,
      [C, userId]
    ),
  ])
  return {
    myAdvanceRequests: advances[0]?.n ?? 0,
    myDvirs: dvirs[0]?.n ?? 0,
    myReceipts: receipts[0]?.n ?? 0,
  }
}

/**
 * The company's money, cumulative: what has been delivered, billed and
 * collected all-time. Diffed against the clock-in baseline these become "what
 * this company earned while you were on shift" — including everything the AI
 * teammates did, which is the point. Delivered value is counted off the
 * delivery event rather than the load's current status so it cannot go
 * backwards when a load moves on to invoiced or settled.
 */
async function companyMoney(): Promise<Partial<ShiftMetrics>> {
  const [delivered, billed, collected, rolling, dwelling, overdue] = await Promise.all([
    // Same basis as billed: linehaul + fuel + accessorials. An invoice carries
    // the detention, so leaving it out here let "billed" outrun "delivered"
    // for the same freight — money billed that was never earned, on its face.
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents
                + COALESCE((SELECT SUM((a->>'amount_cents')::int)
                              FROM jsonb_array_elements(l.accessorials) a), 0)), 0)::bigint AS cents
         FROM hub.loads l
        WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM hub.load_events e
                       WHERE e.carrier_id = $1 AND e.load_id = l.id
                         AND e.kind = 'status_change' AND e.payload->>'to' = 'delivered')`,
      [C]
    ),
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents FROM hub.invoices WHERE carrier_id = $1`,
      [C]
    ),
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents FROM hub.payments WHERE carrier_id = $1`,
      [C]
    ),
    // Standing, not cumulative: the freight in motion at this instant.
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(linehaul_cents + fuel_surcharge_cents), 0)::bigint AS cents
         FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL
          AND status IN ('dispatched','at_pickup','in_transit')`,
      [C]
    ),
    // The cost of trouble, from the same reader the dispatch board uses —
    // one source for "this truck is sitting and it is costing you $X".
    getDwellingStops(C),
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(i.amount_cents - COALESCE((
                SELECT SUM(p.amount_cents) FROM hub.payments p
                 WHERE p.carrier_id = $1 AND p.invoice_id = i.id), 0)), 0)::bigint AS cents
         FROM hub.invoices i
        WHERE i.carrier_id = $1 AND i.status IN ('sent','partial','overdue','disputed')
          AND i.due_on < CURRENT_DATE`,
      [C]
    ),
  ])
  return {
    coDeliveredCents: Number(delivered[0]?.cents ?? 0),
    coBilledCents: Number(billed[0]?.cents ?? 0),
    coCollectedCents: Number(collected[0]?.cents ?? 0),
    coRollingCents: Number(rolling[0]?.cents ?? 0),
    coDwellingCents: dwelling.reduce((sum, d) => sum + d.estimatedCents, 0),
    coOverdueCents: Number(overdue[0]?.cents ?? 0),
  }
}

/**
 * What this driver has earned, run through the REAL pay engine.
 *
 * A per-mile number computed by hand here and a per-mile number computed by
 * settlements would drift the first time someone touches a rule, and the
 * driver seat would start quoting a wage the software would not actually pay.
 * So this loads the driver's own active rule set and calls `evaluatePayRules`
 * — the same function the settlement draft uses — over the loads they have
 * delivered. Cumulative, so the shift diff is what they earned on shift.
 *
 * Falls back to zero (not to a guess) when the driver has no active rule set:
 * an invented wage is worse than an honest blank.
 */
async function driverPay(userId: string): Promise<number> {
  const [rules, loads] = await Promise.all([
    query<{ name: string; rules: unknown; deductions: unknown }>(
      `SELECT p.name, p.rules, p.deductions
         FROM hub.pay_rules p
         JOIN hub.drivers d ON d.id = p.driver_id AND d.carrier_id = $1
        WHERE p.carrier_id = $1 AND d.user_id = $2 AND p.active
        ORDER BY p.updated_at DESC LIMIT 1`,
      [C, userId]
    ),
    // The same load context the settlement draft and the driver's phone
    // build (driver-app.ts driverUnsettledPay), stops included — a per-stop
    // rule would otherwise pay on Friday and show $0 on the shift card, the
    // exact drift this reader exists to prevent.
    query<{
      id: string; reference: string; linehaul_cents: number; fuel_surcharge_cents: number
      accessorial_cents: number; loaded_miles: number; deadhead_miles: number; stops_count: number
    }>(
      `SELECT l.id, l.reference, l.linehaul_cents, l.fuel_surcharge_cents,
              COALESCE((SELECT SUM((a->>'amount_cents')::int)
                          FROM jsonb_array_elements(l.accessorials) a), 0)::int AS accessorial_cents,
              COALESCE(l.loaded_miles, 0) AS loaded_miles,
              COALESCE(l.deadhead_miles, 0) AS deadhead_miles,
              (SELECT COUNT(*)::int FROM hub.stops s
                WHERE s.carrier_id = $1 AND s.load_id = l.id) AS stops_count
         FROM hub.loads l
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND d.user_id = $2
          AND EXISTS (SELECT 1 FROM hub.load_events e
                       WHERE e.carrier_id = $1 AND e.load_id = l.id
                         AND e.kind = 'status_change' AND e.payload->>'to' = 'delivered')
        LIMIT 200`,
      [C, userId]
    ),
  ])
  if (rules.length === 0 || loads.length === 0) return 0
  const ctx: PayLoadContext[] = loads.map((l) => ({
    id: l.id,
    reference: l.reference,
    linehaulCents: l.linehaul_cents,
    fuelSurchargeCents: l.fuel_surcharge_cents,
    accessorialCents: l.accessorial_cents,
    loadedMiles: l.loaded_miles,
    deadheadMiles: l.deadhead_miles,
    stopsCount: l.stops_count,
  }))
  // Gross, not net: deductions are period things (escrow, insurance) that a
  // shift did not cause, and docking a player for them would misread as a
  // penalty for working.
  return evaluatePayRules(parseRuleSet(rules[0]), {
    loads: ctx,
    reimbursements: [],
    outstandingAdvances: [],
  }).grossCents
}

export async function readShiftMetrics(
  userId: string,
  seat: ShiftSeatKey,
  now = new Date()
): Promise<ShiftMetrics> {
  // Office seats score entirely different work, so they run their own reads
  // instead of paying for the load-board counters they never look at. Every
  // seat gets the company's money line, though — the whole argument for the
  // place is that it pays people, and a seat that only sees its own square of
  // the board never sees that happen.
  if (seat === "owner") {
    const [own, co] = await Promise.all([ownerMetrics(userId), companyMoney()])
    return { ...emptyMetrics(now.toISOString()), ...own, ...co }
  }
  if (seat === "safety") {
    const [own, co] = await Promise.all([safetyMetrics(userId), companyMoney()])
    return { ...emptyMetrics(now.toISOString()), ...own, ...co }
  }
  if (seat === "recruiter") {
    const [own, co] = await Promise.all([recruiterMetrics(userId), companyMoney()])
    return { ...emptyMetrics(now.toISOString()), ...own, ...co }
  }

  const [moves, pods, boards, arrivals, invoices, payments, booked, co, pay] = await Promise.all([
    query<{ to_status: string | null; n: number }>(
      `SELECT payload->>'to' AS to_status, COUNT(*)::int AS n
         FROM hub.load_events
        WHERE carrier_id = $1 AND kind = 'status_change' AND actor_id = $2
        GROUP BY 1`,
      [C, userId]
    ),
    // The POD the driver actually sends. The phone's upload writes a
    // 'document' event with the driver as actor (driver.ts) and never touches
    // the load's status — 'pod_received' is the OFFICE confirming the
    // paperwork, so counting that status move credited the driver with
    // nothing they could do from the seat and "Submit the POD" sat at 0/1
    // after they had done exactly that.
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.load_events
        WHERE carrier_id = $1 AND kind = 'document' AND actor_id = $2
          AND payload->>'kind' = 'pod'`,
      [C, userId]
    ),
    query<{ quoted: number; unbilled: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'quoted')::int AS quoted,
              COUNT(*) FILTER (WHERE status = 'pod_received')::int AS unbilled
         FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL`,
      [C]
    ),
    query<{ arrivals: number; on_time: number }>(
      `SELECT COUNT(*)::int AS arrivals,
              COUNT(*) FILTER (WHERE s.appt_start IS NULL
                OR s.arrived_at <= s.appt_start + interval '30 minutes')::int AS on_time
         FROM hub.stops s
         JOIN hub.loads l ON l.id = s.load_id AND l.carrier_id = $1
         JOIN hub.drivers d ON d.id = l.driver_id AND d.carrier_id = $1
        WHERE s.carrier_id = $1 AND s.type = 'delivery' AND s.arrived_at IS NOT NULL
          AND d.user_id = $2`,
      [C, userId]
    ),
    query<{ n: number; cents: string }>(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(i.amount_cents), 0)::bigint AS cents
         FROM hub.audit_log a
         JOIN hub.invoices i ON i.carrier_id = $1 AND i.id::text = a.entity_id
        WHERE a.carrier_id = $1 AND a.entity_type = 'invoice' AND a.action = 'create'
          AND a.actor_id = $2`,
      [C, userId]
    ),
    // Actor-scoped through the audit trail, exactly like ownerMetrics'
    // myPayments — hub.payments has no actor column, and the sim's autopilot
    // records payments of its own (sandbox-sim.ts payInvoice →
    // recordPayment with actor id null). Counting the raw table credited an
    // idle dispatcher with every invoice the simulation collected: the
    // "payment lands on an overdue invoice" objective scores this as a diff,
    // so six quiet ticks were worth 33 points nobody earned.
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM hub.audit_log
        WHERE carrier_id = $1 AND entity_type = 'payment' AND action = 'record'
          AND actor_id = $2`,
      [C, userId]
    ),
    // Dispatcher's money: the rate on every load this user put on a truck.
    // Booking is the moment the revenue is real, so it is counted off the
    // player's own `booked` event rather than the load's current status.
    query<{ cents: string }>(
      `SELECT COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents), 0)::bigint AS cents
         FROM hub.loads l
        WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM hub.load_events e
                       WHERE e.carrier_id = $1 AND e.load_id = l.id AND e.actor_id = $2
                         AND e.kind = 'status_change' AND e.payload->>'to' = 'booked')`,
      [C, userId]
    ),
    companyMoney(),
    driverPay(userId),
  ])

  const byStatus = new Map(moves.map((m) => [m.to_status ?? "", m.n]))
  const totalMoves = moves.reduce((s, m) => s + m.n, 0)
  const metrics: ShiftMetrics = {
    ...emptyMetrics(now.toISOString()),
    at: now.toISOString(),
    myBookings: byStatus.get("booked") ?? 0,
    myDispatches: byStatus.get("dispatched") ?? 0,
    quotedCount: boards[0]?.quoted ?? 0,
    myStatusMoves: totalMoves,
    myPodsSubmitted: pods[0]?.n ?? 0,
    myArrivals: arrivals[0]?.arrivals ?? 0,
    myOnTimeArrivals: arrivals[0]?.on_time ?? 0,
    myInvoices: invoices[0]?.n ?? 0,
    myInvoicedCents: Number(invoices[0]?.cents ?? 0),
    paymentsRecorded: payments[0]?.n ?? 0,
    unbilledCount: boards[0]?.unbilled ?? 0,
    myFreightBookedCents: Number(booked[0]?.cents ?? 0),
    myPayCents: pay,
    ...co,
  }
  // The owner-operator drives like the company driver AND runs his own
  // books, so he needs both halves.
  if (seat === "owner_operator") {
    return { ...metrics, ...(await ownerOperatorMetrics(userId)) }
  }
  return metrics
}
