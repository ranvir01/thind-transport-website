import "server-only"
import { randomBytes, randomUUID } from "node:crypto"
import bcrypt from "bcrypt"
import type { PoolClient } from "pg"
import { hubDb, query } from "./db"
import { computeDriverScores } from "./recruiting"
import { SANDBOX_CARRIER_ID, SANDBOX_CARRIER_NAME, SANDBOX_PASSWORD, SANDBOX_SEATS } from "./sandbox"
import type { SafetyEventKind } from "./safety-score"

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
const rand = mulberry32(0xb1e51de)
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

interface City { city: string; state: string; lat: number; lng: number }
const CITIES: Record<string, City> = {
  kent: { city: "Kent", state: "WA", lat: 47.3809, lng: -122.2348 },
  seattle: { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  spokane: { city: "Spokane", state: "WA", lat: 47.6588, lng: -117.426 },
  yakima: { city: "Yakima", state: "WA", lat: 46.6021, lng: -120.5059 },
  portland: { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  medford: { city: "Medford", state: "OR", lat: 42.3265, lng: -122.8756 },
  boise: { city: "Boise", state: "ID", lat: 43.615, lng: -116.2023 },
  sacramento: { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944 },
  oakland: { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712 },
  fresno: { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871 },
  reno: { city: "Reno", state: "NV", lat: 39.5296, lng: -119.8138 },
  saltlake: { city: "Salt Lake City", state: "UT", lat: 40.7608, lng: -111.891 },
  denver: { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  phoenix: { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  missoula: { city: "Missoula", state: "MT", lat: 46.8721, lng: -113.994 },
}
// [origin, destination, loaded miles]
const LANES: [keyof typeof CITIES, keyof typeof CITIES, number][] = [
  ["kent", "sacramento", 750], ["kent", "portland", 175], ["seattle", "spokane", 280],
  ["yakima", "oakland", 780], ["portland", "boise", 430], ["spokane", "missoula", 200],
  ["boise", "saltlake", 340], ["portland", "reno", 580], ["fresno", "phoenix", 590],
  ["saltlake", "denver", 520], ["sacramento", "fresno", 170], ["medford", "sacramento", 300],
  ["reno", "saltlake", 520], ["seattle", "portland", 175], ["spokane", "boise", 425],
  ["oakland", "medford", 370], ["phoenix", "denver", 820], ["yakima", "portland", 185],
]
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
const BROKERS = [
  "Summit Freight Brokerage", "Echo Peak Logistics", "TQ West Logistics", "Landbridge Freight",
  "Copper Canyon Freight", "NorthGate Logistics", "Ridgeway Brokerage", "Bluewater Freight Co",
]
const SHIPPERS = ["Cascade Foods", "Rainier Beverage Co", "Inland Steel Supply", "Evergreen Paper Products"]
const COMMODITY: Record<string, string[]> = {
  dry_van: ["Packaged foods", "Paper products", "Beverages", "Retail freight", "Building materials"],
  reefer: ["Fresh produce", "Frozen foods", "Dairy", "Berries", "Apples"],
  flatbed: ["Steel coils", "Lumber", "Machinery", "Rebar"],
}
const MERCHANTS = ["Pilot #482", "Love's #229", "TA Ontario", "Petro Boise", "Flying J #611", "Pacific Pride Yakima"]
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
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('loadoff-sandbox-seed'))`)

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
      })]
    )
    await wipe(client)
    await client.query(`DELETE FROM hub.accessorial_types WHERE carrier_id = $1`, [C])
    await client.query(
      `INSERT INTO hub.accessorial_types (carrier_id, name, default_amount_cents, unit) VALUES
       ($1,'Detention',6000,'per_hour'),($1,'Layover',25000,'per_day'),($1,'TONU',20000,'flat'),
       ($1,'Stop-off',10000,'flat'),($1,'Tarp',10000,'flat'),($1,'Lumper',0,'pass_through')`,
      [C]
    )

    // ---- Users (the 9 playable seats) ----
    const hash = await bcrypt.hash(SANDBOX_PASSWORD, 10)
    const userRows = await bulk(
      client, "hub.users", ["carrier_id", "email", "password_hash", "name", "role"],
      SANDBOX_SEATS.map((seat) => [C, seat.email, hash, seat.name, seat.role]),
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
      linehaul: number; fsc: number; accessorials: { name: string; amountCents: number }[]
      loadedMiles: number; deadheadMiles: number
    }
    const STATUS_PLAN: [string, number][] = [
      ["quoted", 8], ["booked", 12], ["dispatched", 8], ["at_pickup", 4], ["in_transit", 8],
      ["delivered", 10], ["pod_received", 10], ["invoiced", 25], ["paid", 40], ["settled", 122],
      ["cancelled", 3],
    ]
    const plans: LoadPlan[] = []
    let loadIdx = 0
    const activeDriverIdxs = [...Array(40).keys()].filter((i) => truckOfDriver.has(driverIds[i]))
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
        const accessorials = chance(0.08) ? [{ name: "Detention", amountCents: pick([6000, 12000, 18000]) }] : []
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
        plans.push({
          idx: loadIdx++, status, lane, customer, equipment,
          driverIdx: forcedDriver ?? (assigned ? pick(activeDriverIdxs) : null),
          pickupAt, deliveredAt, linehaul, fsc, accessorials, loadedMiles, deadheadMiles: int(15, 120),
        })
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
        new Date(p.pickupAt.getTime() - int(1, 3) * DAY),
        p.deliveredAt, p.status === "settled" || p.status === "paid" || p.status === "invoiced" || p.status === "pod_received"
          ? new Date((p.deliveredAt ?? p.pickupAt).getTime() + int(2, 30) * 3600 * 1000) : null,
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
        progressed && (p.status !== "at_pickup") ? new Date(p.pickupAt.getTime() + int(1, 3) * 3600 * 1000) : null])
      const dropAppt = p.deliveredAt ?? new Date(p.pickupAt.getTime() + Math.max(1, Math.round(p.loadedMiles / 520)) * DAY)
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
      const amount = p.linehaul + p.fsc + p.accessorials.reduce((s, a) => s + a.amountCents, 0)
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
    const groups = new Map<string, { driverIdx: number; week: string; loads: number[] }>()
    plans.forEach((p, i) => {
      if (p.status !== "settled" || p.driverIdx === null || !p.deliveredAt) return
      const week = weekOf(p.deliveredAt)
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
      if (meta.escrowWk > 0) lineRows.push([settlementId, "deduction", "Escrow", -meta.escrowWk, "escrow", null])
      if (meta.insWk > 0) lineRows.push([settlementId, "deduction", "Insurance", -meta.insWk, "insurance", null])
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
      await bulk(client, "hub.settlement_lines",
        ["settlement_id", "kind", "label", "amount_cents", "source_type", "source_id"],
        loadIdxs.map((li) => [res.rows[0].id, "earning",
          `BRH-${2001 + plans[li].idx} · ${CITIES[plans[li].lane[0]].city} → ${CITIES[plans[li].lane[1]].city}`,
          driverPay(plans[li]), "load", loadIds[li]]))
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
        ts, pick(MERCHANTS), null, jurisdiction, gallons, "diesel", price, gallons * price, int(80000, 420000)])
    }
    // DEF + reefer fuel, and the 2:47am over-tank card-fraud txn the owner demo tells.
    const fraudTruck = activeTrucks[3]
    fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", fraudTruck.id, null,
      daysAgo(1, 2), "Pilot #482", null, "NV", 285, "diesel", 415, 285 * 415, null])
    for (let i = 0; i < 3; i++) {
      const t = pick(activeTrucks)
      fuelRows.push([C, "csv:EFS", `SBX-F-${String(fuelSeq++).padStart(5, "0")}`, "EFS", t.id, t.assigned_driver_id,
        daysAgo(int(1, 30), 12), pick(MERCHANTS), null, "WA", int(8, 20), "DEF", 389, int(8, 20) * 389, null])
    }
    await bulk(client, "hub.fuel_transactions",
      ["carrier_id", "source", "external_id", "card_program", "truck_id", "driver_id", "ts", "merchant", "city",
        "jurisdiction", "gallons", "fuel_type", "unit_price_cents", "total_cents", "odometer"],
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
            "[]", hasDefect ? JSON.stringify([{ item: "Brakes", note: "Soft pedal, pulls right" }]) : "[]",
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

    const applicantRows = await bulk(client, "hub.applicants",
      ["carrier_id", "source", "first_name", "last_name", "phone", "years_experience", "stage"],
      [
        [C, "public_site", "Terry", "Coleman", "(509) 555-7101", 6, "applied"],
        [C, "public_site", "Maria", "Delgado", "(206) 555-7102", 3, "applied"],
        [C, "referral", "Hank", "Osei", "(360) 555-7103", 11, "screened"],
        [C, "manual", "Josh", "Whitfield", "(509) 555-7104", 2, "screened"],
        [C, "public_site", "Priti", "Sharma", "(253) 555-7105", 8, "mvr_psp"],
        [C, "referral", "Dale", "Norwood", "(509) 555-7106", 15, "offer"],
      ], "id")
    await bulk(client, "hub.applicant_events", ["carrier_id", "applicant_id", "to_stage", "actor_name"],
      applicantRows.map((a) => [C, a.id, "applied", "Grace Okafor"]))
    await client.query(
      `INSERT INTO hub.referrals (carrier_id, referrer_driver_id, applicant_id, bonus_cents, milestone, status)
       VALUES ($1,$2,$3,150000,'hired','pending')`, [C, driverIds[0], applicantRows[2].id])

    // Live map: pings along the lane for in-transit trucks.
    const pingRows: unknown[][] = []
    plans.forEach((p, i) => {
      if (p.status !== "in_transit" || p.driverIdx === null) return
      const truck = truckOfDriver.get(driverIds[p.driverIdx])
      if (!truck) return
      const o = CITIES[p.lane[0]]; const d = CITIES[p.lane[1]]
      const progress = 0.3 + rand() * 0.45
      for (let k = 4; k >= 0; k--) {
        const f = Math.max(0.02, progress - k * 0.035)
        pingRows.push([C, truck.id, new Date(Date.now() - k * 45 * 60000),
          o.lat + (d.lat - o.lat) * f + (rand() - 0.5) * 0.05,
          o.lng + (d.lng - o.lng) * f + (rand() - 0.5) * 0.05,
          int(80000, 420000), "demo"])
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
  if (scenario === "steady") return
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('loadoff-sandbox-seed'))`)
    // Two dispatched pickups now 4 hours late, nobody has arrived.
    await client.query(
      `UPDATE hub.stops SET appt_start = NOW() - interval '4 hours'
        WHERE carrier_id = $1 AND type = 'pickup' AND arrived_at IS NULL
          AND load_id IN (SELECT id FROM hub.loads WHERE carrier_id = $1 AND status = 'dispatched' LIMIT 2)`,
      [C]
    )
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
         '[{"item":"Air lines","note":"Audible leak at the glad hands — will not hold pressure"}]',
         FALSE, $2, d.first_name || ' ' || d.last_name, NOW()
         FROM hub.trucks t JOIN hub.drivers d ON d.id = t.assigned_driver_id
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

/** True when the sandbox looks fully seeded (all seats present + data volume). */
export async function sandboxSeeded(): Promise<boolean> {
  const rows = await query<{ users: number; loads: number }>(
    `SELECT (SELECT COUNT(*)::int FROM hub.users WHERE carrier_id = $1) AS users,
            (SELECT COUNT(*)::int FROM hub.loads WHERE carrier_id = $1) AS loads`,
    [SANDBOX_CARRIER_ID]
  )
  return (rows[0]?.users ?? 0) >= SANDBOX_SEATS.length && (rows[0]?.loads ?? 0) >= 200
}

export async function ensureSandboxSeeded(): Promise<{ seeded: boolean }> {
  if (await sandboxSeeded()) return { seeded: false }
  await seedSandbox()
  return { seeded: true }
}
