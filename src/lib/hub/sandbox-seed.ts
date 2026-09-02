import "server-only"
import { randomBytes, randomUUID } from "node:crypto"
import bcrypt from "bcrypt"
import type { PoolClient } from "pg"
import { hubDb, query } from "./db"
import { deleteStoredFile, storeGeneratedPdf } from "./documents"
import { buildPodPdf } from "./pdf"
import { computeDriverScores } from "./recruiting"
import { ORIENTATION_TEMPLATE } from "./recruiting-shared"
import { SANDBOX_CARRIER_ID, SANDBOX_CARRIER_NAME, SANDBOX_PASSWORD, SANDBOX_SEATS } from "./sandbox"
import type { SafetyEventKind } from "./safety-score"
import { interpolate, progressAt } from "./sandbox-sim-math"
import { AVG_MPH, BROKERS, CITIES, COMMODITY, LANES, MERCHANTS } from "./sandbox-world"

/**
 * Seeds (or resets) the sandbox tenant — Blue Ridge Haulage — at real-fleet
 * volume: ~40 drivers, ~30 trucks, 250 loads across the whole lifecycle,
 * ~500 fuel transactions, an IFTA quarter, weekly settlements, DVIRs, HOS,
 * and a quarter of safety events feeding the fleet safety score.
 *
 * Every statement is scoped to the sandbox carrier_id — this NEVER touches
 * another tenant's rows (unlike scripts/seed-demo.mjs, whose TRUNCATE is
 * global and therefore banned from production). Runs in one transaction
 * under an advisory lock so concurrent resets can't interleave.
 */

const C = SANDBOX_CARRIER_ID

// Deterministic PRNG so every reset tells the same story.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const RANDOM_SEED = 0xb1e51de
let rand = mulberry32(RANDOM_SEED)
/**
 * Restart the stream at the top of every seed.
 *
 * The generator above was module-level, so only the *first* reset in a process
 * told the seeded story — the second continued the stream and built a
 * different company. Harmless-looking, until a defect that only appears in one
 * of those worlds becomes unreproducible. Reset per call and "reset" means the
 * same world every time, on every machine.
 */
const resetRandom = () => { rand = mulberry32(RANDOM_SEED) }
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const chance = (p: number) => rand() < p

const DAY = 24 * 3600 * 1000
const now = () => new Date()
const daysAgo = (n: number, hour = 8) => {
  const d = new Date(Date.now() - n * DAY)
  d.setHours(hour, int(0, 59), 0, 0)
  return d
}
const daysAhead = (n: number, hour = 8) => daysAgo(-n, hour)
const dateOnly = (d: Date) => d.toISOString().slice(0, 10)

const FIRST = [
  "Jordan", "Sam", "Harjit", "Gurpreet", "Amar", "Baljit", "Karan", "Navdeep", "Raj", "Sukhi",
  "Miguel", "Carlos", "Luis", "Diego", "Marco", "Andre", "Tyrone", "Dwayne", "Pete", "Frank",
  "Wes", "Cole", "Ray", "Eddie", "Victor", "Omar", "Ivan", "Stefan", "Milos", "Dmitri",
  "Tara", "Jess", "Monica", "Angela", "Kayla", "Renee", "Dawn", "Shelby", "Nina", "Paula",
]
const LAST = [
  "Reyes", "Brar", "Singh", "Sandhu", "Gill", "Dhaliwal", "Sidhu", "Mann", "Grewal", "Bains",
  "Alvarez", "Mendoza", "Torres", "Ramirez", "Ortiz", "Johnson", "Williams", "Marsh", "Cole", "Hardy",
  "Boone", "Vance", "Dunn", "Foster", "Petrov", "Kovac", "Ilic", "Novak", "Sorin", "Volkov",
  "Nguyen", "Tran", "Kim", "Park", "Lopez", "Silva", "Costa", "Reed", "Bishop", "Lane",
]
const SHIPPERS = ["Cascade Foods", "Rainier Beverage Co", "Inland Steel Supply", "Evergreen Paper Products"]
const PNG_DOT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

async function bulk(
  client: PoolClient,
  table: string,
  cols: string[],
  rows: unknown[][],
  returning?: string
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return []
  const params: unknown[] = []
  const tuples = rows.map((row) => {
    const ph = row.map((v) => {
      params.push(v)
      return `$${params.length}`
    })
    return `(${ph.join(",")})`
  })
  const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES ${tuples.join(",")}${returning ? ` RETURNING ${returning}` : ""}`
  const result = await client.query(sql, params)
  return result.rows
}

/** Carrier-scoped wipe, children first. */
async function wipe(client: PoolClient) {
  const q = (sql: string) => client.query(sql, [C])
  await q(`UPDATE hub.users SET driver_id = NULL, customer_id = NULL WHERE carrier_id = $1`)
  await q(`UPDATE hub.loads SET settlement_id = NULL WHERE carrier_id = $1`)
  await q(`UPDATE hub.trucks SET assigned_driver_id = NULL WHERE carrier_id = $1`)
  await q(`DELETE FROM hub.message_reads r USING hub.message_threads t WHERE r.thread_id = t.id AND t.carrier_id = $1`)
  await q(`DELETE FROM hub.announcement_acks a USING hub.announcements n WHERE a.announcement_id = n.id AND n.carrier_id = $1`)
  await q(`DELETE FROM hub.settlement_lines l USING hub.settlements s WHERE l.settlement_id = s.id AND s.carrier_id = $1`)
  const tables = [
    "audit_log", "notifications", "push_subscriptions", "messages", "message_threads",
    "message_templates", "announcements", "document_requests", "tasks", "time_off_requests",
    "referrals", "offers", "applicant_events", "applicants", "claims", "safety_events",
    "incidents", "maintenance_records", "maintenance_schedules", "compliance_items",
    "ifta_reports", "ifta_tax_rates", "jurisdiction_miles", "toll_transactions", "fuel_transactions",
    "escrow_ledger", "advances", "expenses", "payments", "invoices", "crm_activities",
    "customer_vetting", "position_pings", "documents", "share_links", "import_templates",
    "load_events", "stops", "dvirs", "driver_scores", "hos_snapshots", "random_test_events",
    "loads", "settlements", "facility_notes", "facilities", "pay_rules", "trucks", "trailers",
    "drivers", "contacts", "portal_invitations", "users", "customers", "lanes",
  ]
  for (const table of tables) {
    await q(`DELETE FROM hub.${table} WHERE carrier_id = $1`)
  }
}

export async function seedSandbox(): Promise<void> {
  resetRandom()
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('loadoff-sandbox-seed'))`)

    // Usage counters outlive the world they were earned in: a reset rebuilds
    // the company, but "did anyone actually play?" is a question about the
    // deployment, and the sales-demo flow starts with a reset every time.
    const priorTelemetry =
      (
        await client.query<{ t: Record<string, number> | null }>(
          `SELECT settings->'sim'->'telemetry' AS t FROM hub.carrier_settings WHERE carrier_id = $1`,
          [C]
        )
      ).rows[0]?.t ?? {}

    // ---- Tenant ----
    await client.query(
      `INSERT INTO hub.carriers (id, name, dot_number, mc_number, phone, email, address)
       VALUES ($1, $2, '4102233', '118822', '(509) 555-0400', 'ops@sandbox.demo.thind', '410 Freight Way, Wenatchee, WA 98801')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'`,
      [C, SANDBOX_CARRIER_NAME]
    )
    await client.query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings) VALUES ($1, $2)
       ON CONFLICT (carrier_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
      [C, JSON.stringify({
        invoice: { prefix: "BRH-INV-", nextNumber: 2500, defaultTermsDays: 30 },
        pay: { companyDriverPerMileCents: 64, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true },
        detention: { freeHours: 2, ratePerHourCents: 6000 },
        costPerMileCents: 182,
        fsc: { baseCentsPerGallon: 125, mpg: 6.4 },
        randomTesting: { drugPct: 50, alcoholPct: 10 },
        factoring: {
          company: "Summit Capital Factoring", remitName: "Summit Capital Factoring LLC",
          remitAddress: "PO Box 2200, Phoenix, AZ 85001", email: "funding@summitcapital.demo",
        },
        // Shift Mode clock. A fresh epoch per reset voids in-flight shifts;
        // the first tick after seeding initializes its own pacing from here.
        sim: {
          epoch: randomUUID(),
          lastTickAt: null,
          nextDropAt: null,
          activeSeats: {},
          telemetry: priorTelemetry,
          // Which world got loaded. A bare seed IS the steady week;
          // applySandboxScenario stamps 'crunch' over this after its overlay.
          // Without a persisted name the app cannot tell a player which of the
          // two companies they are looking at, and "crunch day" is invisible
          // unless you already knew you picked it.
          scenario: "steady",
        },
      })]
    )
    // The bytes behind the sandbox's documents — generated PODs and anything a
    // player uploaded — would otherwise outlive their rows on every reset and
    // pile up in the blob store. Best-effort, bounded, and before the rows go.
    const staleDocs = await client.query<{ url: string; storage: string }>(
      `SELECT url, storage FROM hub.documents WHERE carrier_id = $1 LIMIT 500`,
      [C]
    )
    await Promise.all(staleDocs.rows.map((d) => deleteStoredFile(d.url, d.storage)))
    await wipe(client)
    await client.query(`DELETE FROM hub.accessorial_types WHERE carrier_id = $1`, [C])
    await client.query(
      `INSERT INTO hub.accessorial_types (carrier_id, name, default_amount_cents, unit) VALUES
       ($1,'Detention',6000,'per_hour'),($1,'Layover',25000,'per_day'),($1,'TONU',20000,'flat'),
       ($1,'Stop-off',10000,'flat'),($1,'Tarp',10000,'flat'),($1,'Lumper',0,'pass_through')`,
      [C]
    )

    // ---- Users (the 9 playable seats) ----
    // Deterministic ids: a signed-in seat SURVIVES a reset (the session JWT
    // keeps pointing at a row that exists again), so an in-session "Reset"
    // lands you back in a fresh company instead of "account deactivated" —
    // and Shift Mode can void the in-flight shift with its own card.
    const hash = await bcrypt.hash(SANDBOX_PASSWORD, 10)
    const userRows = await bulk(
      client, "hub.users", ["id", "carrier_id", "email", "password_hash", "name", "role"],
      SANDBOX_SEATS.map((seat, i) => [
        `33333333-3333-4333-8333-00000000000${i + 1}`, C, seat.email, hash, seat.name, seat.role,
      ]),
      "id, email"
    )
    const userId = new Map(userRows.map((r) => [r.email as string, r.id as string]))
    const seatUser = (key: string) => {
      const seat = SANDBOX_SEATS.find((s) => s.key === key)!
      return userId.get(seat.email)!
    }

    // ---- Drivers (40; two are playable seats) ----
    const driverRows: unknown[][] = []
    const driverMeta: { first: string; last: string; payType: string; rate: number; escrowWk: number; insWk: number }[] = []
    for (let i = 0; i < 40; i++) {
      const first = i === 0 ? "Jordan" : i === 1 ? "Sam" : FIRST[i]
      const last = i === 0 ? "Reyes" : i === 1 ? "Brar" : LAST[i]
      const isOO = i === 1 || (i >= 34 && i < 39) // Sam Brar + 5 more owner-operators
      const payType = isOO ? "percentage" : "per_mile"
      const rate = isOO ? 0.9 : [0.58, 0.6, 0.62, 0.64, 0.66, 0.68][i % 6]
      const escrowWk = isOO ? pick([5000, 10000]) : 0
      const insWk = isOO ? 0 : 7500
      // Compliance spread: a couple of CDLs closing in, one expired med card.
      const cdlDays = i === 5 ? 21 : i === 11 ? 9 : int(60, 900)
      const medDays = i === 17 ? -6 : i === 23 ? 25 : int(40, 700)
      driverMeta.push({ first, last, payType, rate, escrowWk, insWk })
      driverRows.push([
        C, first, last, `(509) 555-1${String(100 + i)}`,
        `${first.toLowerCase()}.${last.toLowerCase()}@sandbox.demo.thind`,
        `WDL${400000 + i * 517}`, "WA", dateOnly(daysAhead(cdlDays)), dateOnly(daysAhead(medDays)),
        dateOnly(daysAgo(int(90, 2000))), payType, rate, true, escrowWk, insWk, "active",
        i === 0 ? seatUser("driver") : i === 1 ? seatUser("owner_operator") : null,
      ])
    }
    const driverIds = (
      await bulk(client, "hub.drivers",
        ["carrier_id", "first_name", "last_name", "phone", "email", "cdl_number", "cdl_state",
          "cdl_expiry", "medical_card_expiry", "hire_date", "pay_type", "pay_rate",
          "pay_loaded_miles_only", "escrow_weekly_cents", "insurance_weekly_cents", "status", "user_id"],
        driverRows, "id")
    ).map((r) => r.id as string)
    await client.query(`UPDATE hub.users SET driver_id = $1 WHERE id = $2 AND carrier_id = $3`, [driverIds[0], seatUser("driver"), C])
    await client.query(`UPDATE hub.users SET driver_id = $1 WHERE id = $2 AND carrier_id = $3`, [driverIds[1], seatUser("owner_operator"), C])
    await client.query(`
      INSERT INTO hub.pay_rules (carrier_id, driver_id, name, rules, deductions)
      SELECT d.carrier_id, d.id,
        CASE WHEN d.pay_type = 'percentage' THEN 'Owner-operator percentage' ELSE 'Company per-mile' END,
        CASE WHEN d.pay_type = 'percentage' THEN
          jsonb_build_array(
            jsonb_build_object('type','percent_linehaul','basisPoints', round(d.pay_rate * 10000)::int),
            jsonb_build_object('type','fsc_passthrough','basisPoints', 10000),
            jsonb_build_object('type','referral_bonus'))
        ELSE
          jsonb_build_array(
            jsonb_build_object('type','per_mile','rateCentsPerMile', round(d.pay_rate * 100)::int,
                               'loadedOnly', d.pay_loaded_miles_only),
            jsonb_build_object('type','referral_bonus'))
        END,
        (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
          SELECT jsonb_build_object('kind','escrow','amountCents', d.escrow_weekly_cents) AS x
          WHERE d.escrow_weekly_cents > 0
          UNION ALL
          SELECT jsonb_build_object('kind','insurance','amountCents', d.insurance_weekly_cents)
          WHERE d.insurance_weekly_cents > 0
        ) deductions)
      FROM hub.drivers d
      WHERE d.carrier_id = $1 AND d.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM hub.pay_rules p WHERE p.driver_id = d.id)`, [C])

    // ---- Trucks (30) + trailers (18) ----
    const MAKES: [string, string][] = [["Freightliner", "Cascadia"], ["Kenworth", "T680"], ["Volvo", "VNL 760"], ["Peterbilt", "579"]]
    const truckRows: unknown[][] = []
    for (let i = 0; i < 30; i++) {
      const isOO = i >= 24 // units 201-206 belong to owner-operators
      const [make, model] = isOO ? pick([["Volvo", "VNL 860"], ["Kenworth", "W900"], ["Peterbilt", "389"]] as [string, string][]) : MAKES[i % 4]
      const status = i === 22 ? "shop" : i === 23 ? "idle" : chance(0.06) ? "shop" : "active"
      // Truck 0..29 → driver 0..29 where active; OO trucks map to the OO drivers.
      const driverIdx = isOO ? (i === 24 ? 1 : 33 + (i - 24)) : i
      truckRows.push([
        C, isOO ? String(201 + i - 24) : String(101 + i), `4V4NC9EH${int(1000000, 9999999)}SB${i}`,
        `C${int(10000, 99999)}${i}`, "WA", int(2019, 2025), make, model,
        isOO ? "owner_operator" : "company", status,
        dateOnly(daysAhead(i === 27 ? -4 : int(30, 700))), dateOnly(daysAhead(int(15, 350))),
        dateOnly(daysAhead(int(30, 400))),
        status === "active" && driverIdx < 40 ? driverIds[driverIdx] : null,
        pick([220, 240, 250, 260]),
      ])
    }
    const truckIds = (
      await bulk(client, "hub.trucks",
        ["carrier_id", "unit_number", "vin", "plate", "plate_state", "year", "make", "model",
          "ownership", "status", "registration_expiry", "inspection_due", "insurance_expiry",
          "assigned_driver_id", "tank_capacity_gallons"],
        truckRows, "id, unit_number, assigned_driver_id, tank_capacity_gallons")
    )
    const truckOfDriver = new Map<string, { id: string; unit: string; tank: number }>()
    truckIds.forEach((t) => {
      if (t.assigned_driver_id) {
        truckOfDriver.set(t.assigned_driver_id as string, {
          id: t.id as string, unit: t.unit_number as string, tank: Number(t.tank_capacity_gallons),
        })
      }
    })
    const trailerRows: unknown[][] = []
    for (let i = 0; i < 18; i++) {
      const type = i < 10 ? "dry_van" : i < 15 ? "reefer" : "flatbed"
      trailerRows.push([C, String(531 + i), type, int(2017, 2025), pick(["Utility", "Great Dane", "Wabash", "Hyundai"]),
        "active", dateOnly(daysAhead(int(40, 600))), dateOnly(daysAhead(int(20, 340)))])
    }
    const trailerIds = (
      await bulk(client, "hub.trailers",
        ["carrier_id", "unit_number", "type", "year", "make", "status", "registration_expiry", "inspection_due"],
        trailerRows, "id, type")
    )
    const trailersByType = (type: string) => trailerIds.filter((t) => t.type === type).map((t) => t.id as string)

    // ---- Customers (8 brokers + 4 shippers) ----
    const customerRows: unknown[][] = [
      ...BROKERS.map((name, i) => [C, name, "broker", String(700100 + i * 917), `ap@${name.split(" ")[0].toLowerCase()}.example`,
        `(602) 555-2${String(100 + i)}`, pick([21, 30, 30, 45]), i === 2 || i === 5, "active"]),
      ...SHIPPERS.map((name, i) => [C, name, "shipper", null, `payables@${name.split(" ")[0].toLowerCase()}.example`,
        `(509) 555-3${String(100 + i)}`, pick([15, 30]), false, "active"]),
    ]
    const customerIds = (
      await bulk(client, "hub.customers",
        ["carrier_id", "name", "type", "mc_number", "billing_email", "phone", "payment_terms_days", "factored", "status"],
        customerRows, "id, name, payment_terms_days, factored")
    )
    await client.query(`UPDATE hub.users SET customer_id = $1 WHERE id = $2 AND carrier_id = $3`, [customerIds[0].id, seatUser("broker"), C])
    await client.query(`UPDATE hub.users SET customer_id = $1 WHERE id = $2 AND carrier_id = $3`,
      [customerIds[BROKERS.length].id, seatUser("shipper"), C])
    await bulk(client, "hub.contacts", ["carrier_id", "customer_id", "name", "role", "phone", "email"],
      customerIds.slice(0, 6).map((cust, i) => [C, cust.id, ["Dana Kim", "Ray Ortiz", "Sue Bell", "Tom Ford", "Ana Cruz", "Lee Wong"][i],
        "AP / Dispatch", `(602) 555-4${String(100 + i)}`, `contact${i}@${String(cust.name).split(" ")[0].toLowerCase()}.example`]))

    // ---- Loads (250) + stops ----
    type LoadPlan = {
      idx: number; status: string; lane: (typeof LANES)[number]; customer: (typeof customerIds)[number]
      equipment: string; driverIdx: number | null; pickupAt: Date; deliveredAt: Date | null
      linehaul: number; fsc: number; accessorials: { label: string; amount_cents: number }[]
      loadedMiles: number; deadheadMiles: number
      // Shift Mode pacing overrides (set by the pacing pass below).
      departedAt?: Date; dropApptAt?: Date; podAt?: Date; createdAt?: Date
    }
    const STATUS_PLAN: [string, number][] = [
      ["quoted", 8], ["booked", 12], ["dispatched", 8], ["at_pickup", 4], ["in_transit", 8],
      ["delivered", 10], ["pod_received", 10], ["invoiced", 25], ["paid", 40], ["settled", 122],
      ["cancelled", 3],
    ]
    const plans: LoadPlan[] = []
    let loadIdx = 0
    const activeDriverIdxs = [...Array(40).keys()].filter((i) => truckOfDriver.has(driverIds[i]))
    /** Statuses where the driver and truck are committed right now. */
    const CONCURRENT_STATUSES = new Set(["booked", "dispatched", "at_pickup", "in_transit"])
    /** …and the subset that is physically impossible without a crew. */
    const CREW_REQUIRED = new Set(["dispatched", "at_pickup", "in_transit"])
    const busyDrivers = new Set<number>()
    // Jordan (0) and Sam (1) are force-assigned to the first two in-transit
    // loads below, and that path deliberately skips the free-list. In-transit
    // is planned after dispatched/at_pickup, so without this reservation an
    // earlier status spends their crews first and they end up on two loads at
    // once — which is exactly how the double-booking survived so long.
    const PLAYER_DRIVER_IDXS = [0, 1]
    PLAYER_DRIVER_IDXS.forEach((i) => busyDrivers.add(i))
    // There are more concurrent loads than crews, and `booked` is planned
    // first — left alone it drains the yard and the rolling loads that follow
    // come out driverless. Hold back one seat for every crew-required load
    // still to come; an unassigned booked load is a real state a dispatcher
    // sees every morning, a driverless truck on the map is not.
    let crewSeatsOwed =
      STATUS_PLAN.filter(([s]) => CREW_REQUIRED.has(s)).reduce((n, [, c]) => n + c, 0) -
      PLAYER_DRIVER_IDXS.length
    for (const [status, count] of STATUS_PLAN) {
      for (let k = 0; k < count; k++) {
        const lane = pick(LANES)
        const equipment = chance(0.6) ? "dry_van" : chance(0.6) ? "reefer" : "flatbed"
        const loadedMiles = lane[2] + int(-15, 25)
        const rate = equipment === "reefer" ? 2.55 + rand() * 0.75 : equipment === "flatbed" ? 2.4 + rand() * 0.7 : 2.05 + rand() * 0.7
        const linehaul = Math.round(loadedMiles * rate) * 100
        const fsc = Math.round(loadedMiles * (0.38 + rand() * 0.07)) * 100
        let pickupAt: Date
        let deliveredAt: Date | null = null
        const transitDays = Math.max(1, Math.round(loadedMiles / 520))
        switch (status) {
          case "quoted": pickupAt = daysAhead(int(1, 6)); break
          case "booked": pickupAt = daysAhead(int(0, 5)); break
          case "dispatched": pickupAt = daysAhead(int(0, 1)); break
          case "at_pickup": pickupAt = daysAgo(0, 6); break
          case "in_transit": pickupAt = daysAgo(1, 7); break
          case "delivered": pickupAt = daysAgo(int(2, 4), 7); deliveredAt = daysAgo(int(0, 2), 14); break
          case "pod_received": pickupAt = daysAgo(int(3, 8), 7); deliveredAt = daysAgo(int(1, 6), 15); break
          case "invoiced": pickupAt = daysAgo(int(6, 22), 7); deliveredAt = daysAgo(int(4, 20), 14); break
          case "paid": pickupAt = daysAgo(int(17, 57), 7); deliveredAt = daysAgo(int(15, 55), 15); break
          case "settled": pickupAt = daysAgo(int(9, 91), 7); deliveredAt = new Date(daysAgo(int(7, 89), 15).getTime()); break
          default: pickupAt = daysAgo(int(10, 40), 7) // cancelled
        }
        if (deliveredAt && deliveredAt.getTime() < pickupAt.getTime()) {
          deliveredAt = new Date(pickupAt.getTime() + transitDays * DAY)
        }
        const assigned = status !== "quoted" && status !== "cancelled" && !(status === "booked" && chance(0.4))
        // Canonical accessorial shape: {label, amount_cents} (types.ts:261).
        // The seed used to write {name, amountCents}, which every production
        // reader silently skipped — `a->>'amount_cents'` in today.ts, invoices.ts,
        // lanes.ts and cash-cycle.ts — so seeded detention never counted toward
        // "Not invoiced", invoice totals or lane margin, and applyDetentionAccrual
        // (which matches on a.label) would have appended a SECOND "Detention"
        // line instead of upserting this one.
        const accessorials = chance(0.08) ? [{ label: "Detention", amount_cents: pick([6000, 12000, 18000]) }] : []
        // The playable seats always have something live: the broker (Summit)
        // and shipper (Cascade Foods) portals each get a load on the road, and
        // the two driver seats (Jordan, Sam) are behind the wheel of the first
        // two in-transit loads so their Home screens never open empty.
        const customer = status === "in_transit" && k === 0 ? customerIds[0]
          : status === "in_transit" && k === 1 ? customerIds[BROKERS.length]
          : pick(customerIds)
        const forcedDriver = status === "in_transit" && k === 0 ? 0
          : status === "in_transit" && k === 1 ? 1
          : null
        // A driver (and therefore a truck) can only be on ONE load at a time.
        // Concurrently-live work draws WITHOUT replacement; historical loads
        // reuse drivers freely, which is just a career. Picking with
        // replacement everywhere put trucks on two simultaneous loads —
        // physically impossible, visible on the fleet page and the live map,
        // and shipped unnoticed until the per-tick invariant check caught it.
        const needsCrew = CREW_REQUIRED.has(status)
        if (needsCrew && forcedDriver === null) crewSeatsOwed--
        let driverIdx: number | null = forcedDriver
        if (driverIdx === null && assigned) {
          if (CONCURRENT_STATUSES.has(status)) {
            const free = activeDriverIdxs.filter((i) => !busyDrivers.has(i))
            // Out of crews? Leave it unassigned rather than double-book —
            // an unassigned booked load is a real state; two loads on one
            // truck is not.
            const reserve = needsCrew ? 0 : crewSeatsOwed
            driverIdx = free.length > reserve ? pick(free) : null
          } else {
            driverIdx = pick(activeDriverIdxs)
          }
        }
        if (driverIdx !== null && CONCURRENT_STATUSES.has(status)) busyDrivers.add(driverIdx)
        // Belt and braces: if the reservation math is ever wrong, the load
        // stays booked rather than rolling down the highway with nobody in it.
        const plannedStatus = needsCrew && driverIdx === null ? "booked" : status
        plans.push({
          idx: loadIdx++, status: plannedStatus, lane, customer, equipment,
          driverIdx,
          pickupAt, deliveredAt, linehaul, fsc, accessorials, loadedMiles, deadheadMiles: int(15, 120),
        })
      }
    }

    // ---- Shift Mode pacing --------------------------------------------------
    // The sim runs on the wall clock (a 700-mile lane really takes ~13h), so
    // the seed stages the session's drama through initial conditions: Jordan
    // delivers ~35 min in and Sam ~75, NPC arrivals drumbeat every ~12 min,
    // hooks and pickups land on camera, the AI back office gets a
    // deterministic backlog, and fresh work stays for the players.
    {
      const seedNow = now()
      const MIN = 60_000
      let transitSlot = 0
      let quotedSlot = 0
      let podSlot = 0
      let invoicedSlot = 0
      for (const p of plans) {
        switch (p.status) {
          case "in_transit": {
            const etaMin = transitSlot === 0 ? 35 : transitSlot === 1 ? 75 : 10 + transitSlot * 12
            const eta = new Date(seedNow.getTime() + etaMin * MIN)
            p.departedAt = new Date(eta.getTime() - (p.loadedMiles / AVG_MPH) * 3_600_000)
            p.pickupAt = new Date(p.departedAt.getTime() - int(45, 90) * MIN)
            p.dropApptAt = new Date(eta.getTime() + int(5, 25) * MIN) // arrivals run slightly early
            p.deliveredAt = null
            transitSlot++
            break
          }
          case "at_pickup":
            p.pickupAt = new Date(seedNow.getTime() - int(10, 40) * MIN) // at the dock, rolling within the hour
            break
          case "dispatched":
            p.pickupAt = new Date(seedNow.getTime() + int(30, 240) * MIN) // hooks happen on camera
            break
          case "quoted":
            p.pickupAt = new Date(seedNow.getTime() + int(60, 180) * MIN)
            // Fresh quotes belong to the player; the last two are stale so
            // the AI dispatcher (night shift) has something to book.
            p.createdAt = quotedSlot < 6
              ? new Date(seedNow.getTime() - int(5, 100) * MIN)
              : new Date(seedNow.getTime() - int(150, 240) * MIN)
            quotedSlot++
            break
          case "delivered":
            // PODs land on camera (due 10–20 min after delivery, capped/tick).
            p.deliveredAt = new Date(seedNow.getTime() - int(15, 300) * MIN)
            p.pickupAt = new Date(p.deliveredAt.getTime() - Math.max(1, Math.round(p.loadedMiles / 520)) * DAY)
            break
          case "pod_received":
            // Deterministic accountant queue: 4 stale (>24h — the AI back
            // office may invoice them), the rest fresh — the player's work.
            p.podAt = new Date(seedNow.getTime() - (podSlot < 4 ? int(26, 60) : int(2, 20)) * 3_600_000)
            p.deliveredAt = new Date(p.podAt.getTime() - int(20, 90) * MIN)
            p.pickupAt = new Date(p.deliveredAt.getTime() - Math.max(1, Math.round(p.loadedMiles / 520)) * DAY)
            podSlot++
            break
          case "invoiced":
            // A deterministic slice of receivables is already past due
            // (terms are 15/30 days), so AP payments land during the shift
            // and the accountant watches aging actually move.
            if (invoicedSlot < 8) {
              p.deliveredAt = new Date(seedNow.getTime() - int(40, 60) * DAY)
              p.pickupAt = new Date(p.deliveredAt.getTime() - Math.max(1, Math.round(p.loadedMiles / 520)) * DAY)
            }
            invoicedSlot++
            break
        }
      }
    }
    const loadRows = plans.map((p) => {
      const driverId = p.driverIdx !== null ? driverIds[p.driverIdx] : null
      const truck = driverId ? truckOfDriver.get(driverId) : null
      const trailerPool = trailersByType(p.equipment)
      return [
        C, `BRH-${2001 + p.idx}`, chance(0.5) ? `PO-${int(40000, 99000)}` : null, p.customer.id, p.status,
        p.equipment, pick(COMMODITY[p.equipment]), int(28000, 45000), p.linehaul, p.fsc,
        JSON.stringify(p.accessorials), p.loadedMiles, p.deadheadMiles,
        truck?.id ?? null, trailerPool.length ? pick(trailerPool) : null, driverId,
        seatUser("dispatcher"), pick(["direct", "direct", "import", "quote", "dat"]), p.customer.factored === true,
        p.createdAt ?? new Date(p.pickupAt.getTime() - int(1, 3) * DAY),
        p.deliveredAt, p.status === "settled" || p.status === "paid" || p.status === "invoiced" || p.status === "pod_received"
          ? p.podAt ?? new Date((p.deliveredAt ?? p.pickupAt).getTime() + int(2, 30) * 3600 * 1000) : null,
      ]
    })
    const loadIds = (
      await bulk(client, "hub.loads",
        ["carrier_id", "reference", "customer_reference", "customer_id", "status", "equipment", "commodity",
          "weight_lbs", "linehaul_cents", "fuel_surcharge_cents", "accessorials", "loaded_miles", "deadhead_miles",
          "truck_id", "trailer_id", "driver_id", "dispatcher_id", "source", "factored", "created_at",
          "delivered_at", "pod_received_at"],
        loadRows, "id")
    ).map((r) => r.id as string)

    const stopRows: unknown[][] = []
    plans.forEach((p, i) => {
      const [oKey, dKey] = [p.lane[0], p.lane[1]]
      const o = CITIES[oKey]; const d = CITIES[dKey]
      const progressed = ["at_pickup", "in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"].includes(p.status)
      const done = ["delivered", "pod_received", "invoiced", "paid", "settled"].includes(p.status)
      stopRows.push([C, loadIds[i], 1, "pickup", `${o.city} Distribution`, o.city, o.state, o.lat, o.lng,
        p.pickupAt, progressed ? p.pickupAt : null,
        p.departedAt ?? (progressed && (p.status !== "at_pickup") ? new Date(p.pickupAt.getTime() + int(1, 3) * 3600 * 1000) : null)])
      const dropAppt = p.dropApptAt ?? p.deliveredAt ?? new Date(p.pickupAt.getTime() + Math.max(1, Math.round(p.loadedMiles / 520)) * DAY)
      stopRows.push([C, loadIds[i], 2, "delivery", `${d.city} Receiving`, d.city, d.state, d.lat, d.lng,
        dropAppt, done ? p.deliveredAt : null, done ? p.deliveredAt : null])
    })
    await bulk(client, "hub.stops",
      ["carrier_id", "load_id", "sequence", "type", "facility", "city", "state", "lat", "lng", "appt_start", "arrived_at", "departed_at"],
      stopRows)

    // Facilities from stops (same pattern as the demo seed), then reclassify.
    await client.query(`
      INSERT INTO hub.facilities (carrier_id, name, dedupe_key, address, city, state, zip, lat, lng, type)
      SELECT DISTINCT ON (lower(trim(s.facility)), lower(trim(s.city)))
        $1, trim(s.facility), lower(trim(s.facility)) || '|' || lower(trim(s.city)), NULL,
        trim(s.city), s.state, NULL, s.lat, s.lng, 'both'
      FROM hub.stops s WHERE s.carrier_id = $1 AND s.facility IS NOT NULL AND trim(s.facility) <> ''
      ON CONFLICT (carrier_id, dedupe_key) DO NOTHING`, [C])
    await client.query(`
      UPDATE hub.stops s SET facility_id = f.id
      FROM hub.facilities f
      WHERE s.carrier_id = $1 AND f.carrier_id = $1 AND s.facility_id IS NULL
        AND f.dedupe_key = lower(trim(s.facility)) || '|' || lower(trim(s.city))`, [C])

    // ---- Invoices + payments ----
    const invoiceRows: unknown[][] = []
    const invoicePlan: { loadIdx: number; status: string; issued: Date; due: Date; amount: number }[] = []
    let invNo = 1001
    plans.forEach((p, i) => {
      if (!["invoiced", "paid", "settled"].includes(p.status)) return
      const issued = new Date((p.deliveredAt ?? p.pickupAt).getTime() + DAY)
      const due = new Date(issued.getTime() + Number(p.customer.payment_terms_days ?? 30) * DAY)
      const amount = p.linehaul + p.fsc + p.accessorials.reduce((s, a) => s + a.amount_cents, 0)
      let status: string
      if (p.status === "invoiced") {
        const overdue = due.getTime() < Date.now()
        status = invNo % 29 === 0 ? "disputed" : overdue ? "overdue" : "sent"
      } else {
        status = "paid"
      }
      invoicePlan.push({ loadIdx: i, status, issued, due, amount })
      invoiceRows.push([C, `BRH-INV-${invNo++}`, p.customer.id, loadIds[i], amount,
        dateOnly(issued), dateOnly(due), status, p.customer.factored === true,
        p.customer.factored ? "Summit Capital Factoring LLC, PO Box 2200, Phoenix, AZ 85001" : null, "[]"])
    })
    const invoiceIds = (
      await bulk(client, "hub.invoices",
        ["carrier_id", "number", "customer_id", "load_id", "amount_cents", "issued_on", "due_on", "status", "factored", "remit_to", "sent_log"],
        invoiceRows, "id")
    ).map((r) => r.id as string)
    const paymentRows: unknown[][] = []
    invoicePlan.forEach((inv, i) => {
      if (inv.status !== "paid") return
      const paidOn = new Date(inv.due.getTime() - int(-8, 12) * DAY)
      paymentRows.push([C, invoiceIds[i], inv.amount, dateOnly(paidOn > now() ? daysAgo(1) : paidOn),
        pick(["ACH", "ACH", "Check", "Factoring"]), `RMT-${int(100000, 999999)}`])
    })
    await bulk(client, "hub.payments", ["carrier_id", "invoice_id", "amount_cents", "paid_on", "method", "reference"], paymentRows)

    // ---- Signed PODs for the two outside seats' customers ----
    // The broker's and shipper's whole tour is "open a POD" / "grab delivery
    // proof", and until now the sandbox seeded no documents at all, so both
    // steps dead-ended on the placeholder sentence. Two real PDFs per customer,
    // stored the way a driver's upload is stored, on loads they can already
    // see. Generated, not uploaded, so uploaded_by stays null.
    {
      const outside = [customerIds[0], customerIds[BROKERS.length]]
      const podIdx: number[] = []
      for (const cust of outside) {
        let n = 0
        plans.forEach((p, i) => {
          if (n >= 2 || p.customer !== cust || p.driverIdx === null) return
          if (!["pod_received", "invoiced", "paid"].includes(p.status)) return
          podIdx.push(i)
          n++
        })
      }
      const podLoads = await client.query<{ id: string; reference: string; commodity: string | null; weight_lbs: number | null }>(
        `SELECT id, reference, commodity, weight_lbs FROM hub.loads WHERE carrier_id = $1 AND id = ANY($2::uuid[])`,
        [C, podIdx.map((i) => loadIds[i])]
      )
      const storage = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local"
      const docRows: unknown[][] = []
      const docEvents: unknown[][] = []
      for (const i of podIdx) {
        const p = plans[i]
        const row = podLoads.rows.find((r) => r.id === loadIds[i])
        if (!row) continue
        const meta = driverMeta[p.driverIdx!]
        const o = CITIES[p.lane[0]]; const d = CITIES[p.lane[1]]
        const stamp = (at: Date) => at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        const deliveredAt = p.deliveredAt ?? p.pickupAt
        const bytes = await buildPodPdf({
          brand: { name: SANDBOX_CARRIER_NAME.replace(" (Sandbox)", ""), dot: "4102233", mc: "118822",
            phone: "(509) 555-0400", address: "410 Freight Way, Wenatchee, WA 98801" },
          loadReference: row.reference,
          customerName: String(p.customer.name),
          commodity: row.commodity ?? "Freight",
          pickup: { facility: `${o.city} Distribution`, city: `${o.city}, ${o.state}`, at: stamp(p.pickupAt) },
          delivery: { facility: `${d.city} Receiving`, city: `${d.city}, ${d.state}`, at: stamp(deliveredAt) },
          driverName: `${meta.first} ${meta.last}`,
          receivedBy: pick(["R. Alvarez, receiving lead", "T. Nguyen, dock supervisor", "M. Okafor, warehouse", "J. Patel, receiving"]),
          pieces: row.weight_lbs ? `${Math.max(1, Math.round(row.weight_lbs / 1800))} pallets, ${row.weight_lbs.toLocaleString("en-US")} lbs` : "the shipment",
        })
        const fileName = `POD-${row.reference}.pdf`
        const url = await storeGeneratedPdf(fileName, bytes)
        docRows.push([C, "load", row.id, "pod", fileName, "application/pdf", bytes.length, storage, url, null])
        docEvents.push([C, row.id, "document", `${meta.first} ${meta.last}`,
          JSON.stringify({ kind: "pod", file: fileName, by: "driver" })])
      }
      await bulk(client, "hub.documents",
        ["carrier_id", "entity_type", "entity_id", "kind", "file_name", "mime_type", "size_bytes", "storage", "url", "uploaded_by"],
        docRows)
      await bulk(client, "hub.load_events", ["carrier_id", "load_id", "kind", "actor_name", "payload"], docEvents)
    }

    // ---- Settlements (weekly, from settled loads) + lines ----
    const weekOf = (d: Date) => {
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
      return monday.toISOString().slice(0, 10)
    }
    const driverPay = (p: LoadPlan) => {
      const meta = driverMeta[p.driverIdx!]
      return meta.payType === "percentage"
        ? Math.round(p.linehaul * meta.rate) + p.fsc
        : p.loadedMiles * Math.round(meta.rate * 100)
    }
    // Payroll has run every Friday for months: every load delivered before
    // this week is on a PAID settlement, whether the customer side is still
    // 'invoiced', already 'paid', or fully 'settled'. Earlier the last two
    // groups were left with no settlement at all, so the driver app — which
    // rightly counts any delivered load nobody has settled — told Jordan he
    // was owed a month of back pay the office's own draft did not show.
    const thisWeek = weekOf(now())
    const groups = new Map<string, { driverIdx: number; week: string; loads: number[] }>()
    plans.forEach((p, i) => {
      if (p.driverIdx === null || !p.deliveredAt) return
      if (!["settled", "paid", "invoiced"].includes(p.status)) return
      const week = weekOf(p.deliveredAt)
      if (week >= thisWeek) return // this week's work is Friday's draft, not history
      const key = `${p.driverIdx}|${week}`
      const g = groups.get(key) ?? { driverIdx: p.driverIdx, week, loads: [] }
      g.loads.push(i)
      groups.set(key, g)
    })
    for (const g of groups.values()) {
      const meta = driverMeta[g.driverIdx]
      const gross = g.loads.reduce((s, li) => s + driverPay(plans[li]), 0)
      const deductions = meta.escrowWk + meta.insWk
      const periodStart = g.week
      const periodEnd = dateOnly(new Date(new Date(`${g.week}T00:00:00Z`).getTime() + 6 * DAY))
      const res = await client.query(
        `INSERT INTO hub.settlements (carrier_id, driver_id, period_start, period_end, status, gross_cents,
           deductions_cents, net_cents, approved_by, approved_at)
         VALUES ($1,$2,$3,$4,'paid',$5,$6,$7,$8,$9) RETURNING id`,
        [C, driverIds[g.driverIdx], periodStart, periodEnd, gross, deductions, gross - deductions,
          seatUser("owner"),
          new Date(Math.min(Date.now(), new Date(`${periodEnd}T00:00:00Z`).getTime() + 2 * DAY))]
      )
      const settlementId = res.rows[0].id as string
      const lineRows: unknown[][] = g.loads.map((li) => {
        const p = plans[li]
        return [settlementId, "earning", `BRH-${2001 + p.idx} · ${CITIES[p.lane[0]].city} → ${CITIES[p.lane[1]].city}`,
          driverPay(p), "load", loadIds[li]]
      })
      // Deduction lines are stored POSITIVE — pay-rules.ts writes them that
      // way and every renderer prefixes its own minus. Seeding them negative
      // printed "−-$50.00" on the settlement page and the driver's phone.
      if (meta.escrowWk > 0) lineRows.push([settlementId, "deduction", "Escrow", meta.escrowWk, "escrow", null])
      if (meta.insWk > 0) lineRows.push([settlementId, "deduction", "Insurance", meta.insWk, "insurance", null])
      await bulk(client, "hub.settlement_lines",
        ["settlement_id", "kind", "label", "amount_cents", "source_type", "source_id"], lineRows)
      await client.query(`UPDATE hub.loads SET settlement_id = $1 WHERE carrier_id = $3 AND id = ANY($2::uuid[])`,
        [settlementId, g.loads.map((li) => loadIds[li]), C])
    }
    // Draft settlements for this week from freshly delivered loads.
    const draftGroups = new Map<number, number[]>()
    plans.forEach((p, i) => {
      if (!["delivered", "pod_received"].includes(p.status) || p.driverIdx === null) return
      const arr = draftGroups.get(p.driverIdx) ?? []
      arr.push(i)
      draftGroups.set(p.driverIdx, arr)
    })
    for (const [driverIdx, loadIdxs] of [...draftGroups.entries()].slice(0, 10)) {
      const meta = driverMeta[driverIdx]
      const gross = loadIdxs.reduce((s, li) => s + driverPay(plans[li]), 0)
      const deductions = meta.escrowWk + meta.insWk
      const start = weekOf(now())
      const res = await client.query(
        `INSERT INTO hub.settlements (carrier_id, driver_id, period_start, period_end, status, gross_cents, deductions_cents, net_cents)
         VALUES ($1,$2,$3,$4,'draft',$5,$6,$7) RETURNING id`,
        [C, driverIds[driverIdx], start, dateOnly(new Date(new Date(`${start}T00:00:00Z`).getTime() + 6 * DAY)),
          gross, deductions, gross - deductions]
      )
      const draftId = res.rows[0].id as string
      // The same lines the paid weeks carry. A draft whose totals showed a
      // deduction its line list did not explain reconciled to nothing, and
      // approving it posted no escrow (approveSettlement finds the escrow
      // line, not the total) — so the seat whose blurb promises "escrow that
      // adds up" watched $75 withheld and a ledger that never moved.
      const draftLines: unknown[][] = loadIdxs.map((li) => [draftId, "earning",
        `BRH-${2001 + plans[li].idx} · ${CITIES[plans[li].lane[0]].city} → ${CITIES[plans[li].lane[1]].city}`,
        driverPay(plans[li]), "load", loadIds[li]])
      if (meta.escrowWk > 0) draftLines.push([draftId, "deduction", "Escrow", meta.escrowWk, "escrow", null])
      if (meta.insWk > 0) draftLines.push([draftId, "deduction", "Insurance", meta.insWk, "insurance", null])
      await bulk(client, "hub.settlement_lines",
        ["settlement_id", "kind", "label", "amount_cents", "source_type", "source_id"], draftLines)
      // Link the loads the way draftSettlements does, or next Friday's draft
      // would pick the same loads up again and pay them twice.
      await client.query(`UPDATE hub.loads SET settlement_id = $1 WHERE carrier_id = $3 AND id = ANY($2::uuid[])`,
        [draftId, loadIdxs.map((li) => loadIds[li]), C])
    }
    // Advances + escrow motion for the owner-operator seat.
    await bulk(client, "hub.advances", ["carrier_id", "driver_id", "amount_cents", "issued_on", "reference", "status"],
      [0, 1, 3, 9, 14].map((di, i) => [C, driverIds[di], pick([20000, 30000, 50000]), dateOnly(daysAgo(int(2, 40))),
        `ADV-${7100 + i}`, "outstanding"]))
    let escrowBal = 0
    const escrowRows: unknown[][] = []
    for (let w = 8; w >= 1; w--) {
      escrowBal += 5000
      escrowRows.push([C, driverIds[1], 5000, escrowBal, `Weekly escrow — wk of ${weekOf(daysAgo(w * 7))}`])
    }
    await bulk(client, "hub.escrow_ledger", ["carrier_id", "driver_id", "amount_cents", "balance_cents", "note"], escrowRows)

    // ---- Fuel (≈500 txns over 13 weeks) + one over-tank anomaly ----
    const fuelRows: unknown[][] = []
    let fuelSeq = 1
    const activeTrucks = truckIds.filter((t) => t.assigned_driver_id)
    while (fuelRows.length < 496) {
      const t = pick(activeTrucks)
      const daysBack = int(0, 90)
      const ts = daysAgo(daysBack, int(4, 22))
      const gallons = int(45, Math.min(130, Number(t.tank_capacity_gallons) - 40))
      const jurisdiction = pick(["WA", "WA", "OR", "CA", "ID", "NV", "UT", "AZ", "MT"])
      const price = jurisdiction === "CA" ? int(455, 520) : int(345, 425)
      fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", t.id, t.assigned_driver_id,
        ts, pick(MERCHANTS), null, jurisdiction, gallons, "diesel", price, gallons * price, int(80000, 420000), "tractor"])
    }
    // DEF + reefer fuel, and the 2:47am over-tank card-fraud txn the owner demo tells.
    const fraudTruck = activeTrucks[3]
    fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", fraudTruck.id, null,
      daysAgo(1, 2), "Pilot #482", null, "NV", 285, "diesel", 415, 285 * 415, null, "tractor"])
    // fuel_use is what IFTA reads: only 'tractor' gallons are taxable. DEF is
    // 'other' and reefer diesel is 'reefer' — every seeded row used to fall to
    // the column default and the DEF was taxed as if it had moved the truck,
    // while the "reefer gallons handled" the handbook promised had no rows
    // at all to handle.
    for (let i = 0; i < 3; i++) {
      const t = pick(activeTrucks)
      const gal = int(8, 20)
      fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", t.id, t.assigned_driver_id,
        daysAgo(int(1, 30), 12), pick(MERCHANTS), null, "WA", gal, "DEF", 389, gal * 389, null, "other"])
    }
    for (let i = 0; i < 5; i++) {
      const t = pick(activeTrucks)
      const gal = int(20, 60)
      const jurisdiction = pick(["WA", "OR", "CA"])
      fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", t.id, t.assigned_driver_id,
        daysAgo(int(1, 60), int(6, 20)), pick(MERCHANTS), null, jurisdiction, gal, "diesel", int(345, 425), gal * 385, null, "reefer"])
    }
    await bulk(client, "hub.fuel_transactions",
      ["carrier_id", "source", "external_id", "card_program", "truck_id", "driver_id", "ts", "merchant", "city",
        "jurisdiction", "gallons", "fuel_type", "unit_price_cents", "total_cents", "odometer", "fuel_use"],
      fuelRows)

    // ---- IFTA: jurisdiction miles + tax rates for the current quarter ----
    const q = Math.floor(now().getUTCMonth() / 3) + 1
    const quarter = `${now().getUTCFullYear()}-Q${q}`
    const prevQuarter = q === 1 ? `${now().getUTCFullYear() - 1}-Q4` : `${now().getUTCFullYear()}-Q${q - 1}`
    const jmRows: unknown[][] = []
    const iftaRunId = randomUUID()
    for (const t of activeTrucks.slice(0, 24)) {
      for (const [jur, base] of [["WA", 2400], ["OR", 1100], ["CA", 1600], ["ID", 800], ["NV", 500], ["UT", 400]] as [string, number][]) {
        jmRows.push([C, iftaRunId, t.id, quarter, jur, base + int(-300, 500), "pings"])
      }
    }
    await bulk(client, "hub.jurisdiction_miles",
      ["carrier_id", "run_id", "truck_id", "quarter", "jurisdiction", "miles", "source"], jmRows)
    const RATES: [string, number, number][] = [
      ["WA", 0.494, 0], ["OR", 0, 0], ["CA", 0.89, 0], ["ID", 0.32, 0], ["NV", 0.27, 0], ["UT", 0.365, 0],
      ["AZ", 0.26, 0], ["MT", 0.2975, 0], ["CO", 0.205, 0], ["NM", 0.188, 0], ["WY", 0.24, 0], ["TX", 0.2, 0],
    ]
    for (const qtr of [prevQuarter, quarter]) {
      await bulk(client, "hub.ifta_tax_rates", ["carrier_id", "jurisdiction", "quarter", "rate", "surcharge_rate"],
        RATES.map(([jur, rate, sur]) => [C, jur, qtr, rate, sur]))
    }

    // ---- DVIRs (last 4 days, pre+post) ----
    const dvirRows: unknown[][] = []
    for (const t of activeTrucks.slice(0, 10)) {
      const dIdx = driverIds.indexOf(t.assigned_driver_id as string)
      const name = dIdx >= 0 ? `${driverMeta[dIdx].first} ${driverMeta[dIdx].last}` : "Driver"
      for (let d = 4; d >= 1; d--) {
        for (const type of ["pre", "post"]) {
          const hasDefect = t === activeTrucks[6] && d === 1 && type === "post"
          dvirRows.push([C, t.id, t.assigned_driver_id, type,
            int(80000, 420000),
            // `label`, not `item` — the shape DvirPanel, the driver's DvirForm
            // and the safety page's grounded list all read.
            "[]", hasDefect ? JSON.stringify([{ label: "Service brakes", note: "Soft pedal, pulls right" }]) : "[]",
            !hasDefect, PNG_DOT, name,
            daysAgo(d, type === "pre" ? 6 : 18)])
        }
      }
    }
    await bulk(client, "hub.dvirs",
      ["carrier_id", "truck_id", "driver_id", "type", "odometer", "checklist", "defects", "safe_to_operate",
        "signature", "signed_name", "created_at"], dvirRows)

    // ---- HOS snapshots ----
    const hosRows: unknown[][] = []
    activeDriverIdxs.slice(0, 28).forEach((di, i) => {
      const stale = i === 26
      hosRows.push([C, driverIds[di], stale ? daysAgo(2, 9) : new Date(Date.now() - int(4, 80) * 60000),
        pick(["driving", "on_duty", "off_duty", "sleeper"]),
        i === 2 ? 38 : i === 9 ? 95 : int(120, 640), int(180, 820), int(900, 3400), "telematics"])
    })
    await bulk(client, "hub.hos_snapshots",
      ["carrier_id", "driver_id", "ts", "duty_status", "drive_remaining_minutes", "shift_remaining_minutes",
        "cycle_remaining_minutes", "source"], hosRows)

    // ---- Incidents + safety events (the score's raw material) ----
    const crashDriverIdx = activeDriverIdxs[2]
    const incidentRows: unknown[][] = [
      [C, truckOfDriver.get(driverIds[crashDriverIdx])?.id ?? null, driverIds[crashDriverIdx],
        daysAgo(18, 15), "I-84 MP 212, Baker City, OR", "Rear-ended at construction merge; trailer towed.",
        "OSP #26-88412", false, false, true, "under_review", "Elena Vasquez"],
      [C, activeTrucks[8].id, activeTrucks[8].assigned_driver_id, daysAgo(41, 11),
        "Love's, Boise, ID", "Trailer clipped bollard backing out — cosmetic.", null, false, false, false, "closed", "Marcus Webb"],
      [C, activeTrucks[12].id, activeTrucks[12].assigned_driver_id, daysAgo(66, 9),
        "Yard, Wenatchee, WA", "Mirror strike on gate post.", null, false, false, false, "closed", "Elena Vasquez"],
      [C, activeTrucks[5].id, activeTrucks[5].assigned_driver_id, daysAgo(7, 13),
        "SR-97, Yakima, WA", "Windshield chip from gravel truck.", null, false, false, false, "open", "Jordan Reyes"],
      [C, activeTrucks[15].id, activeTrucks[15].assigned_driver_id, daysAgo(3, 16),
        "Receiver dock, Sacramento, CA", "Cargo shift found at delivery — OS&D opened.", null, false, false, false, "open", "Elena Vasquez"],
    ]
    await bulk(client, "hub.incidents",
      ["carrier_id", "truck_id", "driver_id", "occurred_at", "location", "description", "police_report",
        "fatality", "injury_treated_away", "tow_away_disabling", "status", "reported_by_name"], incidentRows)

    const KIND_POOL: SafetyEventKind[] = [
      "hard_brake", "hard_brake", "hard_brake", "hard_brake", "speeding", "speeding",
      "following_distance", "sharp_turn", "hard_accel", "phone_distraction", "seatbelt",
    ]
    const safetyRows: unknown[][] = []
    const riskTiers: [number, number][] = activeDriverIdxs.map((di, i) => {
      if (i === 2) return [di, 13]
      if (i === 7) return [di, 10]
      if (i === 12) return [di, 8]
      if (i % 3 === 0) return [di, int(3, 5)]
      return [di, int(0, 2)]
    })
    for (const [di, count] of riskTiers) {
      for (let k = 0; k < count; k++) {
        const ts = daysAgo(int(0, 90), int(5, 21))
        const coached = chance(0.35)
        safetyRows.push([C, driverIds[di], truckOfDriver.get(driverIds[di])?.id ?? null, null,
          pick(KIND_POOL), ts, pick(Object.values(CITIES)).city + " corridor", pick(["eld", "eld", "camera", "manual"]),
          null, coached ? new Date(ts.getTime() + int(1, 5) * DAY) : null, coached ? seatUser("safety") : null])
      }
    }
    // The crash that put the incident on the register is also a scored event.
    safetyRows.push([C, driverIds[crashDriverIdx], truckOfDriver.get(driverIds[crashDriverIdx])?.id ?? null, null,
      "preventable_crash", daysAgo(18, 15), "Baker City, OR", "camera", "Tied to DOT register entry", null, null])
    await bulk(client, "hub.safety_events",
      ["carrier_id", "driver_id", "truck_id", "load_id", "kind", "occurred_at", "location", "source",
        "notes", "coached_at", "coached_by"], safetyRows)

    // ---- Compliance, maintenance, comms, recruiting, misc ----
    await bulk(client, "hub.compliance_items", ["carrier_id", "entity_type", "kind", "due_on", "status"], [
      [C, "company", "IFTA quarterly filing", dateOnly(daysAhead(21)), "open"],
      [C, "company", "UCR renewal", dateOnly(daysAhead(64)), "open"],
      [C, "company", "Form 2290 (HVUT)", dateOnly(daysAhead(12)), "open"],
      [C, "company", "IRP renewal", dateOnly(daysAhead(140)), "open"],
      [C, "company", "Drug & alcohol consortium invoice", dateOnly(daysAgo(4)), "open"],
      [C, "company", "ELD malfunction letter — unit 105", dateOnly(daysAhead(6)), "open"],
    ])
    const schedRows: unknown[][] = activeTrucks.slice(0, 12).map((t, i) => [
      C, t.id, i % 2 ? "PM service (oil, filters)" : "DOT annual inspection",
      i % 2 ? 25000 : null, i % 2 ? null : 365, dateOnly(daysAgo(int(20, 200))),
    ])
    await bulk(client, "hub.maintenance_schedules",
      ["carrier_id", "truck_id", "name", "interval_miles", "interval_days", "last_done_on"], schedRows)
    await bulk(client, "hub.maintenance_records",
      ["carrier_id", "truck_id", "done_on", "odometer", "vendor", "cost_cents", "notes"],
      activeTrucks.slice(0, 8).map((t) => [C, t.id, dateOnly(daysAgo(int(10, 120))), int(80000, 400000),
        pick(["TA Truck Service", "Cummins NW", "Freightliner Northwest", "Les Schwab"]),
        pick([28500, 64000, 112500, 189900]), pick(["PM service", "Brake reline", "Coolant leak", "Tire replacement x2"])]))

    const ann = await client.query(
      `INSERT INTO hub.announcements (carrier_id, title, body, audience, requires_ack, created_by, created_by_name)
       VALUES ($1,'Winter chain policy','Chains required over Snoqualmie and Siskiyou from Nov 1. Check your kit this week.','{"roles":["driver"]}',TRUE,$2,'Priya Dhillon')
       RETURNING id`, [C, seatUser("owner")]
    )
    await client.query(
      `INSERT INTO hub.announcements (carrier_id, title, body, audience, requires_ack, created_by, created_by_name)
       VALUES ($1,'Fuel network update','EFS discounts moved to the Pilot/Flying J network — in-network gallons save ~$0.35/gal.','{"roles":["driver"]}',FALSE,$2,'Rosa Alvarez')`,
      [C, seatUser("accountant")]
    )
    await client.query(`INSERT INTO hub.announcement_acks (announcement_id, user_id, signature) VALUES ($1,$2,'Jordan Reyes') ON CONFLICT DO NOTHING`,
      [ann.rows[0].id, seatUser("driver")])

    await bulk(client, "hub.tasks", ["carrier_id", "title", "notes", "due_at", "priority", "created_by_name"], [
      [C, "Call Summit — THD detention on BRH-2103", "Broker promised detention approval by Friday.", daysAhead(1, 10), "high", "Marcus Webb"],
      [C, "Renew CDL — two drivers inside 30 days", "Check the compliance wall for names.", daysAhead(2, 9), "high", "Elena Vasquez"],
      [C, "Post two reefer lanes to the board", "Yakima→Oakland and Medford→Sacramento capacity next week.", daysAhead(1, 15), "normal", "Marcus Webb"],
      [C, "Chase 3 overdue invoices 30+ days", "Aging report — start with the biggest balance.", daysAhead(0, 16), "high", "Rosa Alvarez"],
      [C, "Schedule unit 105 out of shop", "Parts arrived; book the bay.", daysAhead(3, 8), "normal", "Marcus Webb"],
    ])

    // Every applicant carries the orientation checklist createApplicant
    // would have given them — the Hire button is gated on it being present
    // AND complete, so a bare row could never be hired from this seat. Dale
    // is one tick and one signature from a hire: his offer is out, and the
    // checklist is four of five.
    const orientation = (doneThrough: number) =>
      JSON.stringify(ORIENTATION_TEMPLATE.map((item, i) => ({ ...item, done: i < doneThrough })))
    const applicantRows = await bulk(client, "hub.applicants",
      ["carrier_id", "source", "first_name", "last_name", "phone", "years_experience", "stage", "orientation"],
      [
        [C, "public_site", "Terry", "Coleman", "(509) 555-7101", 6, "applied", orientation(0)],
        [C, "public_site", "Maria", "Delgado", "(206) 555-7102", 3, "applied", orientation(0)],
        [C, "referral", "Hank", "Osei", "(360) 555-7103", 11, "screened", orientation(0)],
        [C, "manual", "Josh", "Whitfield", "(509) 555-7104", 2, "screened", orientation(0)],
        [C, "public_site", "Priti", "Sharma", "(253) 555-7105", 8, "mvr_psp", orientation(1)],
        [C, "referral", "Dale", "Norwood", "(509) 555-7106", 15, "offer", orientation(ORIENTATION_TEMPLATE.length - 1)],
      ], "id")
    await bulk(client, "hub.applicant_events", ["carrier_id", "applicant_id", "to_stage", "actor_name"],
      applicantRows.map((a) => [C, a.id, "applied", "Grace Okafor"]))
    await client.query(
      `INSERT INTO hub.offers (carrier_id, applicant_id, pay_summary, start_date, body, status, created_by_name)
       VALUES ($1, $2, $3, $4, $5, 'sent', 'Grace Okafor')`,
      [C, applicantRows[5].id,
        "$0.62 per loaded mile, $0.20 deadhead, $1,500 sign-on after 90 days",
        dateOnly(daysAhead(10)),
        "Dale — we'd like you on the Northwest regional board starting the 15th. Home weekends, " +
        "2019 Cascadia, health after 60 days. Sign below and orientation is Monday at 8am."]
    )
    await client.query(
      `INSERT INTO hub.referrals (carrier_id, referrer_driver_id, applicant_id, bonus_cents, milestone, status)
       VALUES ($1,$2,$3,150000,'hired','pending')`, [C, driverIds[0], applicantRows[2].id])

    // Live map: a ping trail per in-transit truck, anchored on the SAME
    // departure-time math the sim uses (progressAt + interpolate keyed by the
    // load id) so Shift Mode's first tick continues each trail seamlessly.
    const pingRows: unknown[][] = []
    plans.forEach((p, i) => {
      if (p.status !== "in_transit" || p.driverIdx === null || !p.departedAt) return
      const truck = truckOfDriver.get(driverIds[p.driverIdx])
      if (!truck) return
      const o = CITIES[p.lane[0]]; const d = CITIES[p.lane[1]]
      for (let k = 5; k >= 1; k--) {
        const ts = new Date(Date.now() - k * 60_000)
        const f = progressAt(p.departedAt, ts, p.loadedMiles)
        const pos = interpolate(o, d, f, loadIds[i])
        pingRows.push([C, truck.id, ts, pos.lat, pos.lng, int(80000, 420000), "demo"])
      }
    })
    await bulk(client, "hub.position_pings", ["carrier_id", "truck_id", "ts", "lat", "lng", "odometer", "source"], pingRows)

    // Share links for the two most-recent in-transit loads (portal tracking demo).
    const inTransit = plans.map((p, i) => ({ p, i })).filter((x) => x.p.status === "in_transit").slice(0, 2)
    for (const x of inTransit) {
      await client.query(
        `INSERT INTO hub.share_links (carrier_id, load_id, token, created_by) VALUES ($1,$2,$3,$4)`,
        [C, loadIds[x.i], randomBytes(16).toString("hex"), seatUser("dispatcher")]
      )
    }

    // A load thread + a direct thread so Messages isn't empty.
    if (inTransit.length > 0) {
      const th = await client.query(
        `INSERT INTO hub.message_threads (carrier_id, kind, load_id, last_message_at) VALUES ($1,'load',$2,NOW()) RETURNING id`,
        [C, loadIds[inTransit[0].i]]
      )
      await bulk(client, "hub.messages", ["carrier_id", "thread_id", "sender_id", "sender_name", "sender_role", "body"], [
        [C, th.rows[0].id, seatUser("dispatcher"), "Marcus Webb", "dispatcher", "Receiver moved the appt to 14:00 — you're still good on hours?"],
        [C, th.rows[0].id, seatUser("driver"), "Jordan Reyes", "driver", "Yep, 6h drive left. I'll take the 30 at the rest area past Weed."],
        [C, th.rows[0].id, seatUser("dispatcher"), "Marcus Webb", "dispatcher", "Perfect. Gate code 4482, dock 12."],
      ])
    }

    // Custom fields (Twenty-style) so the sandbox shows per-company shaping.
    await client.query(
      `INSERT INTO hub.custom_fields (carrier_id, entity_type, key, label, kind, options, position) VALUES
       ($1,'load','gate_code','Gate code','text','[]',0),
       ($1,'load','temp_setpoint_f','Temp setpoint (°F)','number','[]',1),
       ($1,'driver','preferred_region','Preferred region','select','["PNW","Southwest","Mountain"]',0)
       ON CONFLICT (carrier_id, entity_type, key) DO NOTHING`, [C]
    )

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }

  // Real scorecards from the seeded loads (reuses the production computation).
  const month = (offset: number) => {
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() - offset, 1)
    return `${d.toISOString().slice(0, 7)}-01`
  }
  for (const m of [month(2), month(1), month(0)]) {
    await computeDriverScores(C, m).catch(() => {})
  }
}

/**
 * Scenario overlays on top of a fresh seed. "steady" is the baseline;
 * "crunch" turns the morning hostile: late pickups, a truck dead in the
 * shop with an unsafe DVIR, invoices aging past terms, fresh safety events.
 * Every statement carrier-scoped, same as the seed itself.
 */
export async function applySandboxScenario(scenario: "steady" | "crunch"): Promise<void> {
  await seedSandbox()
  // Stamp the name before the overlay, so a crash mid-overlay leaves the
  // sandbox labelled with the world someone ASKED for rather than silently
  // claiming to be the steady week it no longer is.
  await query(
    `UPDATE hub.carrier_settings
        SET settings = jsonb_set(settings, '{sim,scenario}', to_jsonb($2::text), TRUE),
            updated_at = NOW()
      WHERE carrier_id = $1`,
    [C, scenario]
  )
  if (scenario === "steady") return
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('loadoff-sandbox-seed'))`)
    // Two pickups now 4 hours late with NO truck on them — the assigned
    // trucks never showed. They go back to 'booked', unassigned, because a
    // late load left 'dispatched' with a driver is erased by the autopilot's
    // first tick: it converges NPC loads to what the clock says, stamps an
    // arrival AT the appointment, and the lateness the scenario promised is
    // gone before the dispatcher's page loads. Unassigned, the sim has no
    // driver to move and leaves them exactly this wrong until a human puts a
    // truck on them — which is the drill.
    const late = await client.query<{ id: string }>(
      `SELECT id FROM hub.loads
        WHERE carrier_id = $1 AND status = 'dispatched' AND driver_id IS NOT NULL
        ORDER BY reference LIMIT 2`,
      [C]
    )
    const lateIds = late.rows.map((r) => r.id)
    await client.query(
      `UPDATE hub.loads SET status = 'booked', driver_id = NULL, truck_id = NULL, updated_at = NOW()
        WHERE carrier_id = $1 AND id = ANY($2::uuid[])`,
      [C, lateIds]
    )
    await client.query(
      `UPDATE hub.stops SET appt_start = NOW() - interval '4 hours', arrived_at = NULL, departed_at = NULL
        WHERE carrier_id = $1 AND type = 'pickup' AND load_id = ANY($2::uuid[])`,
      [C, lateIds]
    )
    await bulk(client, "hub.load_events", ["carrier_id", "load_id", "kind", "actor_name", "payload"],
      lateIds.map((id) => [C, id, "note", "Marcus Webb",
        JSON.stringify({ text: "Driver no-show at the shipper. Truck pulled off the load — needs a new one now." })]))
    // Three booked loads suddenly due this afternoon.
    await client.query(
      `UPDATE hub.stops SET appt_start = NOW() + interval '3 hours'
        WHERE carrier_id = $1 AND type = 'pickup' AND arrived_at IS NULL
          AND load_id IN (SELECT id FROM hub.loads WHERE carrier_id = $1 AND status = 'booked' LIMIT 3)`,
      [C]
    )
    // A truck dies at morning inspection: into the shop, unsafe DVIR on file.
    await client.query(
      `INSERT INTO hub.dvirs (carrier_id, truck_id, driver_id, type, odometer, checklist, defects,
         safe_to_operate, signature, signed_name, created_at)
       SELECT t.carrier_id, t.id, t.assigned_driver_id, 'pre', 284511, '[]',
         '[{"label":"Coupling / fifth wheel","note":"Audible air leak at the glad hands — will not hold pressure"}]',
         FALSE, $2, d.first_name || ' ' || d.last_name, NOW()
         FROM hub.trucks t JOIN hub.drivers d ON d.id = t.assigned_driver_id AND d.carrier_id = t.carrier_id
        WHERE t.carrier_id = $1 AND t.status = 'active' AND t.assigned_driver_id IS NOT NULL
        LIMIT 1`,
      [C, PNG_DOT]
    )
    await client.query(
      `UPDATE hub.trucks SET status = 'shop'
        WHERE carrier_id = $1 AND id IN (
          SELECT truck_id FROM hub.dvirs
           WHERE carrier_id = $1 AND safe_to_operate = FALSE
           ORDER BY created_at DESC LIMIT 1)`,
      [C]
    )
    // Three invoices age past terms overnight.
    await client.query(
      `UPDATE hub.invoices SET status = 'overdue', due_on = CURRENT_DATE - 12
        WHERE carrier_id = $1 AND id IN (
          SELECT id FROM hub.invoices WHERE carrier_id = $1 AND status = 'sent' LIMIT 3)`,
      [C]
    )
    // Fresh telematics events this morning for the safety seat to coach.
    await client.query(
      `INSERT INTO hub.safety_events (carrier_id, driver_id, truck_id, kind, occurred_at, location, source)
       SELECT t.carrier_id, t.assigned_driver_id, t.id, kinds.kind, NOW() - interval '2 hours',
              'I-90 corridor', 'eld'
         FROM (SELECT id, carrier_id, assigned_driver_id FROM hub.trucks
                WHERE carrier_id = $1 AND assigned_driver_id IS NOT NULL LIMIT 2) t
         CROSS JOIN LATERAL (VALUES ('speeding'), ('hard_brake')) AS kinds(kind)
        LIMIT 3`,
      [C]
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

/**
 * True when the sandbox looks fully seeded: all seats present, data volume,
 * AND the sim block the autopilot runs on. A world with every row but no
 * `settings.sim.epoch` is one no heartbeat will ever advance — which is
 * exactly what a test that deleted the settings row used to leave behind,
 * and what ensureSandboxSeeded then declined to repair.
 */
export async function sandboxSeeded(): Promise<boolean> {
  const rows = await query<{ users: number; loads: number; epoch: string | null }>(
    `SELECT (SELECT COUNT(*)::int FROM hub.users WHERE carrier_id = $1) AS users,
            (SELECT COUNT(*)::int FROM hub.loads WHERE carrier_id = $1) AS loads,
            (SELECT settings->'sim'->>'epoch' FROM hub.carrier_settings WHERE carrier_id = $1) AS epoch`,
    [SANDBOX_CARRIER_ID]
  )
  return (
    (rows[0]?.users ?? 0) >= SANDBOX_SEATS.length &&
    (rows[0]?.loads ?? 0) >= 200 &&
    Boolean(rows[0]?.epoch)
  )
}

export async function ensureSandboxSeeded(): Promise<{ seeded: boolean }> {
  if (await sandboxSeeded()) return { seeded: false }
  await seedSandbox()
  return { seeded: true }
}
