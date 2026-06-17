/**
 * Demo seed for the Thind Transport Hub (v2 — phases 1–3).
 *
 * Seeds: users for every role, trucks/trailers/drivers (pay + escrow config),
 * brokers/shippers, loads across the whole lifecycle (integer cents), invoices
 * (sent / overdue / paid / factored), payments, a settlement queue, advances,
 * escrow, expenses, a quarter of fuel transactions + position pings, IFTA tax
 * rates, compliance items in all colors, maintenance, and a live share link.
 *
 * Idempotent: wipes and re-creates hub.* data. Refuses to run on production.
 * Usage: npm run seed:demo
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { randomBytes } from "node:crypto"
import pg from "pg"
import bcrypt from "bcrypt"

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

const CARRIER = "11111111-1111-1111-1111-111111111111" // Thind (created by migration 002)

const CITY = {
  kent: { city: "Kent", state: "WA", lat: 47.3809, lng: -122.2348 },
  seattle: { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  spokane: { city: "Spokane", state: "WA", lat: 47.6588, lng: -117.426 },
  yakima: { city: "Yakima", state: "WA", lat: 46.6021, lng: -120.5059 },
  portland: { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  medford: { city: "Medford", state: "OR", lat: 42.3265, lng: -122.8756 },
  boise: { city: "Boise", state: "ID", lat: 43.615, lng: -116.2023 },
  sacramento: { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944 },
  oakland: { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712 },
  losangeles: { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  fresno: { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871 },
  reno: { city: "Reno", state: "NV", lat: 39.5296, lng: -119.8138 },
  saltlake: { city: "Salt Lake City", state: "UT", lat: 40.7608, lng: -111.891 },
  denver: { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  phoenix: { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  missoula: { city: "Missoula", state: "MT", lat: 46.8721, lng: -113.994 },
  billings: { city: "Billings", state: "MT", lat: 45.7833, lng: -108.5007 },
}

const daysAgo = (n, hour = 8) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const daysAhead = (n, hour = 8) => daysAgo(-n, hour)
const dateOnly = (iso) => iso.slice(0, 10)
const quarterKey = (d = new Date()) => `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`

async function main() {
  loadEnvLocal()
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("POSTGRES_URL required")
  if (process.env.VERCEL_ENV === "production" || /thindtransport|prod/i.test(url)) {
    throw new Error("Refusing to seed demo data into what looks like production")
  }

  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  const client = new pg.Client({ connectionString: url, ssl })
  await client.connect()
  const q = (text, params = []) => client.query(text, params)

  console.log("Wiping hub data…")
  await q(`TRUNCATE hub.audit_log, hub.integration_syncs, hub.claims, hub.incidents,
           hub.maintenance_records, hub.maintenance_schedules, hub.compliance_items,
           hub.ifta_reports, hub.jurisdiction_miles, hub.toll_transactions, hub.fuel_transactions,
           hub.escrow_ledger, hub.advances, hub.settlement_lines, hub.expenses, hub.settlements,
           hub.payments, hub.invoices,
           hub.crm_activities, hub.position_pings, hub.documents, hub.share_links,
           hub.import_templates, hub.load_events, hub.stops, hub.loads, hub.contacts, hub.users,
           hub.trucks, hub.trailers, hub.drivers, hub.customers RESTART IDENTITY CASCADE`)
  await q(`DELETE FROM hub.ifta_tax_rates`)
  // Reset invoice numbering
  await q(`UPDATE hub.carrier_settings SET settings = jsonb_set(settings, '{invoice,nextNumber}', '1001')
           WHERE carrier_id = $1`, [CARRIER])
  // Demo factoring config so the factored-invoice path is visible
  await q(`UPDATE hub.carrier_settings SET settings = jsonb_set(settings, '{factoring}',
           '{"company":"Summit Capital Factoring","remitName":"Summit Capital Factoring LLC","remitAddress":"PO Box 2200, Phoenix, AZ 85001","email":"funding@summitcapital.demo"}')
           WHERE carrier_id = $1`, [CARRIER])

  // ---- Users (one per role) ----
  console.log("Creating users…")
  const hash = await bcrypt.hash("LegacyDemoOnly1!", 10)
  const users = {}
  for (const [key, name, email, role] of [
    ["owner", "Sukhdev Thind", "owner@demo.thind", "owner"],
    ["dispatcher", "Maya Dhillon", "dispatch@demo.thind", "dispatcher"],
    ["accountant", "Priya Kaur", "accounting@demo.thind", "accountant"],
    ["driver", "Harpreet Singh", "driver@demo.thind", "driver"],
    ["broker", "Mike Reynolds", "broker@demo.thind", "broker"],
    ["shipper", "Dana Lee", "shipper@demo.thind", "shipper"],
  ]) {
    const { rows } = await q(
      `INSERT INTO hub.users (carrier_id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [CARRIER, email, hash, name, role]
    )
    users[key] = rows[0].id
  }

  // ---- Drivers ----
  console.log("Creating drivers…")
  const driverSeed = [
    // first, last, payType, rate, cdlDays, medDays, escrowWk, insuranceWk
    ["Harpreet", "Singh", "per_mile", 0.63, 320, 95, 0, 7500],
    ["Gurjit", "Sandhu", "per_mile", 0.63, 200, 250, 0, 7500],
    ["Jasdeep", "Brar", "percentage", 0.9, 400, 180, 5000, 0],
    ["Manny", "Gill", "percentage", 0.9, 150, 22, 10000, 0],
    ["Robert", "Castillo", "per_mile", 0.63, 500, 400, 0, 7500],
    ["Amrit", "Bains", "per_mile", 0.63, 90, -12, 0, 7500], // expired med card → red + not dispatch-legal
    ["Davinder", "Grewal", "percentage", 0.9, 700, 60, 5000, 0],
    ["Tony", "Marsh", "per_mile", 0.63, 45, 130, 0, 7500],
    ["Sukhwinder", "Mann", "percentage", 0.9, 365, 300, 10000, 0],
    ["Carlos", "Reyes", "per_mile", 0.63, 280, 18, 0, 7500],
  ]
  const driverIds = []
  for (let i = 0; i < driverSeed.length; i++) {
    const [first, last, payType, payRate, cdlDays, medDays, escrowWk, insWk] = driverSeed[i]
    const { rows } = await q(
      `INSERT INTO hub.drivers (carrier_id, first_name, last_name, phone, email, cdl_number, cdl_state,
         cdl_expiry, medical_card_expiry, hire_date, pay_type, pay_rate, pay_loaded_miles_only,
         escrow_weekly_cents, insurance_weekly_cents, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,$14,'active',$15) RETURNING id`,
      [
        CARRIER, first, last, `(206) 555-01${String(i).padStart(2, "0")}`,
        `${first.toLowerCase()}.${last.toLowerCase()}@demo.thind`,
        `WDL${100000 + i * 731}`, "WA",
        dateOnly(daysAhead(cdlDays)), dateOnly(daysAhead(medDays)),
        dateOnly(daysAgo(300 + i * 90)), payType, payRate, escrowWk, insWk,
        i === 0 ? users.driver : null,
      ]
    )
    driverIds.push(rows[0].id)
  }

  // ---- Trucks ----
  console.log("Creating trucks…")
  const truckSeed = [
    ["101", 2024, "Freightliner", "Cascadia", "company", "active", 200, 320, 95, 240],
    ["102", 2024, "Freightliner", "Cascadia", "company", "active", 95, 40, 95, 240],
    ["103", 2023, "Freightliner", "Cascadia", "company", "active", 300, 150, 200, 240],
    ["104", 2023, "Kenworth", "T680", "company", "active", 45, 22, 320, 220],
    ["105", 2022, "Peterbilt", "579", "company", "shop", 150, 90, 150, 220],
    ["201", 2023, "Volvo", "VNL 860", "owner_operator", "active", 280, 365, 280, 260],
    ["202", 2021, "Kenworth", "W900", "owner_operator", "active", 60, 200, 60, 250],
    ["203", 2022, "Peterbilt", "389", "owner_operator", "active", 400, 18, 400, 250],
    ["106", 2024, "Freightliner", "Cascadia", "company", "active", 330, 250, 330, 240],
    ["107", 2020, "Freightliner", "Cascadia", "company", "idle", -10, 75, 10, 240], // expired registration → red
  ]
  const truckIds = []
  for (let i = 0; i < truckSeed.length; i++) {
    const [unit, year, make, model, ownership, status, regDays, inspDays, insDays, tank] = truckSeed[i]
    const { rows } = await q(
      `INSERT INTO hub.trucks (carrier_id, unit_number, vin, plate, plate_state, year, make, model,
         ownership, status, registration_expiry, inspection_due, insurance_expiry, assigned_driver_id, tank_capacity_gallons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [
        CARRIER, unit, `1FUJGLDR${year}${String(43000 + i * 137)}`, `C${82000 + i * 53}J`, "WA",
        year, make, model, ownership, status,
        dateOnly(daysAhead(regDays)), dateOnly(daysAhead(inspDays)), dateOnly(daysAhead(insDays)),
        driverIds[i] ?? null, tank,
      ]
    )
    truckIds.push(rows[0].id)
  }

  // ---- Trailers ----
  console.log("Creating trailers…")
  const trailerSeed = [
    ["T-501", "dry_van", 2023, "Wabash"], ["T-502", "dry_van", 2022, "Great Dane"],
    ["T-503", "reefer", 2023, "Utility"], ["T-504", "reefer", 2021, "Thermo King"],
    ["T-505", "flatbed", 2022, "Fontaine"], ["T-506", "flatbed", 2020, "East"],
    ["T-507", "dry_van", 2024, "Hyundai"], ["T-508", "dry_van", 2019, "Wabash"],
  ]
  const trailerIds = []
  for (let i = 0; i < trailerSeed.length; i++) {
    const [unit, type, year, make] = trailerSeed[i]
    const { rows } = await q(
      `INSERT INTO hub.trailers (carrier_id, unit_number, type, year, make, status, registration_expiry, inspection_due)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7) RETURNING id`,
      [CARRIER, unit, type, year, make, dateOnly(daysAhead(100 + i * 40)), dateOnly(daysAhead(50 + i * 30))]
    )
    trailerIds.push(rows[0].id)
  }

  // ---- Customers ----
  console.log("Creating customers…")
  const customerSeed = [
    // name, type, mc, terms, factored
    ["Pacific Crest Logistics", "broker", "MC-784512", 30, false],
    ["Evergreen Freight Partners", "broker", "MC-651203", 30, false],
    ["Cascade Produce Co.", "shipper", null, 21, false],
    ["Summit Brokerage Group", "broker", "MC-912844", 45, true], // factored relationship
    ["Rainier Building Supply", "shipper", null, 30, false],
    ["BlueLine Transportation Svcs", "broker", "MC-447190", 30, false],
    ["High Desert Freight", "broker", "MC-583321", 60, false],
  ]
  const customerIds = []
  for (const [name, type, mc, terms, factored] of customerSeed) {
    const { rows } = await q(
      `INSERT INTO hub.customers (carrier_id, name, type, mc_number, billing_email, phone, payment_terms_days, factored, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
      [
        CARRIER, name, type, mc,
        `ap@${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.demo`,
        "(503) 555-0188", terms, factored,
      ]
    )
    customerIds.push(rows[0].id)
  }
  await q(`UPDATE hub.users SET customer_id = $1 WHERE id = $2`, [customerIds[0], users.broker])
  await q(`UPDATE hub.users SET customer_id = $1 WHERE id = $2`, [customerIds[2], users.shipper])

  const contactSeed = [
    [0, "Mike Reynolds", "Carrier rep", "(503) 555-0142"],
    [0, "Sarah Chen", "After hours", "(503) 555-0177"],
    [1, "Doug Whitfield", "Dispatch desk", "(425) 555-0123"],
    [3, "Angela Torres", "Accounting", "(602) 555-0156"],
  ]
  for (const [ci, name, role, phone] of contactSeed) {
    await q(
      `INSERT INTO hub.contacts (carrier_id, customer_id, name, role, phone, email) VALUES ($1,$2,$3,$4,$5,$6)`,
      [CARRIER, customerIds[ci], name, role, phone, `${name.toLowerCase().replace(/ /g, ".")}@demo.broker`]
    )
  }
  await q(
    `INSERT INTO hub.crm_activities (carrier_id, customer_id, kind, body, actor_name) VALUES
     ($1,$2,'call','Mike says reefer volume out of Yakima doubles in July — wants 2 trucks/week committed.','Maya Dhillon'),
     ($1,$2,'note','Pays in 22 days average. Good broker, no detention pushback.','Priya Kaur'),
     ($1,$3,'email','Sent updated insurance certificate for 2026.','Priya Kaur')`,
    [CARRIER, customerIds[0], customerIds[1]]
  )

  // ---- Loads (cents) ----
  console.log("Creating loads…")
  let refCounter = 1001
  const chain = ["booked", "dispatched", "at_pickup", "in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"]
  async function makeLoad(opts) {
    const {
      customer, status, equipment, commodity, weight, linehaulCents, fscCents, accessorials = [],
      miles, driver, truck, trailer, origin, dest, pickupDaysAgo, deliverDaysAgo,
      arrived = false, source = "direct", factored = false,
    } = opts
    const reference = `THD-${refCounter++}`
    const { rows } = await q(
      `INSERT INTO hub.loads (carrier_id, reference, customer_reference, customer_id, status, equipment,
         commodity, weight_lbs, linehaul_cents, fuel_surcharge_cents, accessorials, loaded_miles, deadhead_miles,
         truck_id, trailer_id, driver_id, dispatcher_id, source, factored, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [
        CARRIER, reference, `BRK${30000 + refCounter}`, customerIds[customer], status, equipment,
        commodity, weight, linehaulCents, fscCents, JSON.stringify(accessorials),
        miles, Math.round(miles * 0.08),
        truck != null ? truckIds[truck] : null,
        trailer != null ? trailerIds[trailer] : null,
        driver != null ? driverIds[driver] : null,
        users.dispatcher, source, factored,
        daysAgo(pickupDaysAgo + 1),
      ]
    )
    const loadId = rows[0].id
    const pickupDone = arrived || ["in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"].includes(status)
    const delivered = ["delivered", "pod_received", "invoiced", "paid", "settled"].includes(status)
    await q(
      `INSERT INTO hub.stops (carrier_id, load_id, sequence, type, facility, city, state, lat, lng, appt_start, arrived_at, departed_at)
       VALUES ($1,$2,1,'pickup',$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        CARRIER, loadId, `${origin.city} Distribution`, origin.city, origin.state, origin.lat, origin.lng,
        daysAgo(pickupDaysAgo, 8),
        pickupDone || arrived ? daysAgo(pickupDaysAgo, 9) : null,
        pickupDone ? daysAgo(pickupDaysAgo, 11) : null,
      ]
    )
    await q(
      `INSERT INTO hub.stops (carrier_id, load_id, sequence, type, facility, city, state, lat, lng, appt_start, arrived_at, departed_at)
       VALUES ($1,$2,2,'delivery',$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        CARRIER, loadId, `${dest.city} Receiving`, dest.city, dest.state, dest.lat, dest.lng,
        daysAgo(deliverDaysAgo, 14),
        delivered ? daysAgo(deliverDaysAgo, 14) : null,
        delivered ? daysAgo(deliverDaysAgo, 16) : null,
      ]
    )
    const upto = status === "quoted" ? 0 : chain.indexOf(status) + 1
    let prev = null
    const eventStatuses = status === "quoted" ? ["quoted"] : chain.slice(0, Math.max(upto, 1))
    for (let i = 0; i < eventStatuses.length; i++) {
      await q(
        `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_name, payload, created_at)
         VALUES ($1,$2,'status_change',$3,$4,$5)`,
        [CARRIER, loadId, "Maya Dhillon", JSON.stringify({ from: prev, to: eventStatuses[i] }), daysAgo(pickupDaysAgo + 1, 8 + i)]
      )
      prev = eventStatuses[i]
    }
    return { id: loadId, reference, customer: customerIds[customer], totalCents: linehaulCents + fscCents + accessorials.reduce((s, a) => s + a.amount_cents, 0) }
  }

  // Active board
  await makeLoad({ customer: 0, status: "booked", equipment: "reefer", commodity: "Frozen berries", weight: 41000, linehaulCents: 285000, fscCents: 32000, miles: 740, driver: 1, truck: 1, trailer: 2, origin: CITY.kent, dest: CITY.sacramento, pickupDaysAgo: -1, deliverDaysAgo: -3 })
  await makeLoad({ customer: 5, status: "booked", equipment: "dry_van", commodity: "Paper products", weight: 38500, linehaulCents: 198000, fscCents: 21000, miles: 465, driver: 5, truck: 4, origin: CITY.portland, dest: CITY.boise, pickupDaysAgo: -2, deliverDaysAgo: -3 }) // driver 5 has expired med card → legality stop on board
  await makeLoad({ customer: 1, status: "dispatched", equipment: "flatbed", commodity: "Lumber", weight: 44000, linehaulCents: 240000, fscCents: 26000, miles: 610, driver: 2, truck: 5, trailer: 4, origin: CITY.kent, dest: CITY.boise, pickupDaysAgo: 0, deliverDaysAgo: -2 })
  await makeLoad({ customer: 3, status: "at_pickup", equipment: "dry_van", commodity: "Retail goods", weight: 36000, linehaulCents: 210000, fscCents: 23000, miles: 520, driver: 3, truck: 3, trailer: 0, origin: CITY.spokane, dest: CITY.portland, pickupDaysAgo: 0, deliverDaysAgo: -1, arrived: true, factored: true })
  const inTransit = await makeLoad({ customer: 0, status: "in_transit", equipment: "reefer", commodity: "Fresh produce", weight: 42500, linehaulCents: 345000, fscCents: 38000, miles: 920, driver: 0, truck: 0, trailer: 3, origin: CITY.kent, dest: CITY.losangeles, pickupDaysAgo: 1, deliverDaysAgo: -1 })
  await makeLoad({ customer: 6, status: "in_transit", equipment: "dry_van", commodity: "Beverages", weight: 43000, linehaulCents: 275000, fscCents: 30000, miles: 820, driver: 6, truck: 6, trailer: 6, origin: CITY.portland, dest: CITY.saltlake, pickupDaysAgo: 1, deliverDaysAgo: 0 })
  await makeLoad({ customer: 2, status: "delivered", equipment: "reefer", commodity: "Apples", weight: 41800, linehaulCents: 220000, fscCents: 24000, miles: 540, driver: 4, truck: 8, trailer: 2, origin: CITY.yakima, dest: CITY.medford, pickupDaysAgo: 3, deliverDaysAgo: 1 })
  const podLoad = await makeLoad({ customer: 4, status: "pod_received", equipment: "flatbed", commodity: "Steel beams", weight: 45000, linehaulCents: 295000, fscCents: 31000, accessorials: [{ label: "Tarp", amount_cents: 10000 }], miles: 690, driver: 8, truck: 7, trailer: 5, origin: CITY.seattle, dest: CITY.boise, pickupDaysAgo: 4, deliverDaysAgo: 2 })

  // Settlement-eligible delivered loads for drivers 0 (company) and 2 (O/O)
  const settle1 = await makeLoad({ customer: 1, status: "pod_received", equipment: "dry_van", commodity: "Pet food", weight: 39000, linehaulCents: 210000, fscCents: 20000, miles: 520, driver: 0, truck: 0, trailer: 7, origin: CITY.portland, dest: CITY.reno, pickupDaysAgo: 6, deliverDaysAgo: 4 })
  const settle2 = await makeLoad({ customer: 0, status: "pod_received", equipment: "reefer", commodity: "Dairy", weight: 40500, linehaulCents: 195000, fscCents: 18000, miles: 480, driver: 0, truck: 0, trailer: 3, origin: CITY.kent, dest: CITY.boise, pickupDaysAgo: 5, deliverDaysAgo: 3 })
  const settle3 = await makeLoad({ customer: 3, status: "pod_received", equipment: "flatbed", commodity: "Pipe", weight: 44000, linehaulCents: 250000, fscCents: 30000, accessorials: [{ label: "Detention", amount_cents: 15000 }], miles: 800, driver: 2, truck: 5, trailer: 4, origin: CITY.seattle, dest: CITY.sacramento, pickupDaysAgo: 6, deliverDaysAgo: 4, factored: true })

  // Money pipeline: invoiced / overdue / paid
  const invoiced1 = await makeLoad({ customer: 1, status: "invoiced", equipment: "dry_van", commodity: "Appliances", weight: 39000, linehaulCents: 230000, fscCents: 25000, miles: 560, driver: 9, truck: 3, trailer: 7, origin: CITY.portland, dest: CITY.reno, pickupDaysAgo: 12, deliverDaysAgo: 10 })
  const overdue1 = await makeLoad({ customer: 6, status: "invoiced", equipment: "dry_van", commodity: "Tires", weight: 40000, linehaulCents: 265000, fscCents: 28000, miles: 700, driver: 7, truck: 2, trailer: 1, origin: CITY.spokane, dest: CITY.denver, pickupDaysAgo: 55, deliverDaysAgo: 53 })
  const factoredInv = await makeLoad({ customer: 3, status: "invoiced", equipment: "reefer", commodity: "Juice", weight: 42000, linehaulCents: 310000, fscCents: 34000, miles: 780, driver: 2, truck: 2, trailer: 3, origin: CITY.kent, dest: CITY.sacramento, pickupDaysAgo: 9, deliverDaysAgo: 7, factored: true })
  const paid1 = await makeLoad({ customer: 0, status: "paid", equipment: "reefer", commodity: "Frozen fish", weight: 41000, linehaulCents: 320000, fscCents: 36000, miles: 880, driver: 3, truck: 3, trailer: 2, origin: CITY.seattle, dest: CITY.losangeles, pickupDaysAgo: 20, deliverDaysAgo: 18 })

  // History (settled)
  const histLanes = [
    [0, CITY.kent, CITY.portland, "dry_van", 98000, 10500, 175],
    [1, CITY.seattle, CITY.spokane, "dry_van", 125000, 14000, 280],
    [0, CITY.kent, CITY.boise, "reefer", 235000, 26000, 505],
    [5, CITY.portland, CITY.fresno, "reefer", 320000, 35000, 750],
    [6, CITY.spokane, CITY.missoula, "flatbed", 110000, 12000, 200],
    [2, CITY.yakima, CITY.sacramento, "reefer", 290000, 32000, 752],
    [1, CITY.portland, CITY.denver, "dry_van", 380000, 42000, 1240],
    [4, CITY.seattle, CITY.phoenix, "flatbed", 430000, 47000, 1420],
    [0, CITY.kent, CITY.losangeles, "reefer", 350000, 38000, 1135],
    [3, CITY.spokane, CITY.billings, "dry_van", 145000, 16000, 540],
  ]
  for (let i = 0; i < histLanes.length; i++) {
    const [cust, origin, dest, equip, lh, fsc, miles] = histLanes[i]
    await makeLoad({
      customer: cust, status: "settled", equipment: equip, commodity: "Mixed freight",
      weight: 36000 + i * 800, linehaulCents: lh, fscCents: fsc, miles,
      driver: i % driverIds.length, truck: i % truckIds.length, trailer: i % trailerIds.length,
      origin, dest, pickupDaysAgo: 20 + i * 6, deliverDaysAgo: 18 + i * 6, source: "import",
    })
  }
  await makeLoad({ customer: 2, status: "quoted", equipment: "reefer", commodity: "Onions", weight: 40000, linehaulCents: 260000, fscCents: 0, miles: 640, origin: CITY.yakima, dest: CITY.oakland, pickupDaysAgo: -4, deliverDaysAgo: -6, source: "quote" })

  // ---- Invoices + payments ----
  console.log("Creating invoices…")
  let invoiceNo = 1001
  async function makeInvoice(load, { issuedDaysAgo, terms = 30, factored = false, payments = [], status }) {
    const number = `THD-INV-${invoiceNo++}`
    const issued = dateOnly(daysAgo(issuedDaysAgo))
    const due = dateOnly(daysAgo(issuedDaysAgo - terms))
    const remit = factored
      ? "Summit Capital Factoring LLC\nPO Box 2200, Phoenix, AZ 85001"
      : "Thind Transport\nPO Box 5114, Kent, WA 98064"
    const { rows } = await q(
      `INSERT INTO hub.invoices (carrier_id, number, customer_id, load_id, amount_cents, issued_on, due_on, status, factored, remit_to, sent_log)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [CARRIER, number, load.customer, load.id, load.totalCents, issued, due, status, factored,
       remit, JSON.stringify([{ to: "ap@demo.broker", at: daysAgo(issuedDaysAgo), kind: "invoice" }])]
    )
    for (const payment of payments) {
      await q(
        `INSERT INTO hub.payments (carrier_id, invoice_id, amount_cents, paid_on, method, reference)
         VALUES ($1,$2,$3,$4,'ACH',$5)`,
        [CARRIER, rows[0].id, payment.amountCents, dateOnly(daysAgo(payment.daysAgo)), payment.ref ?? null]
      )
    }
    await q(`UPDATE hub.carrier_settings SET settings = jsonb_set(settings, '{invoice,nextNumber}', $2::text::jsonb) WHERE carrier_id = $1`,
      [CARRIER, String(invoiceNo)])
    return rows[0].id
  }
  await makeInvoice(invoiced1, { issuedDaysAgo: 9, terms: 30, status: "sent" })
  await makeInvoice(overdue1, { issuedDaysAgo: 52, terms: 60 - 8, status: "overdue" }) // due ~time ago
  await makeInvoice(factoredInv, { issuedDaysAgo: 6, terms: 45, factored: true, status: "sent" })
  await makeInvoice(paid1, { issuedDaysAgo: 17, terms: 30, status: "paid", payments: [{ amountCents: paid1.totalCents, daysAgo: 2, ref: "ACH 99812" }] })

  // ---- Advances + expenses (feed the settlement run) ----
  console.log("Creating advances + expenses…")
  await q(
    `INSERT INTO hub.advances (carrier_id, driver_id, amount_cents, issued_on, reference, status)
     VALUES ($1,$2,20000,$3,'EFS code 4417','outstanding')`,
    [CARRIER, driverIds[0], dateOnly(daysAgo(3))]
  )
  await q(
    `INSERT INTO hub.expenses (carrier_id, category, amount_cents, incurred_on, driver_id, load_id, reimbursable, memo)
     VALUES ($1,'lumper',15000,$2,$3,$4,TRUE,'Lumper at Reno DC — receipt in hand')`,
    [CARRIER, dateOnly(daysAgo(4)), driverIds[0], settle1.id]
  )
  await q(
    `INSERT INTO hub.expenses (carrier_id, category, amount_cents, incurred_on, truck_id, memo)
     VALUES ($1,'maintenance',48500,$2,$3,'Brake job — Petes Truck Service'),
            ($1,'parking',3500,$4,$5,'Overnight secure lot')`,
    [CARRIER, dateOnly(daysAgo(10)), truckIds[4], dateOnly(daysAgo(2)), truckIds[0]]
  )

  // Escrow opening balances for O/O drivers
  for (const idx of [2, 3, 6, 8]) {
    await q(
      `INSERT INTO hub.escrow_ledger (carrier_id, driver_id, amount_cents, balance_cents, note)
       VALUES ($1,$2,$3,$3,'Opening balance')`,
      [CARRIER, driverIds[idx], 150000]
    )
  }

  // ---- Fuel: a quarter of transactions ----
  console.log("Creating fuel transactions…")
  const fuelStops = [
    ["Pilot #287", CITY.kent, "WA"], ["Loves #441", CITY.portland, "OR"],
    ["TA Boise", CITY.boise, "ID"], ["Petro Sacramento", CITY.sacramento, "CA"],
    ["Flying J Reno", CITY.reno, "NV"], ["Pilot SLC", CITY.saltlake, "UT"],
  ]
  let fuelN = 0
  for (let day = 84; day >= 2; day -= 3) {
    const truckIdx = fuelN % 8 // active trucks
    const stop = fuelStops[fuelN % fuelStops.length]
    const gallons = 95 + (fuelN % 5) * 12
    const ppgCents = 389 + (fuelN % 7) * 6
    await q(
      `INSERT INTO hub.fuel_transactions (carrier_id, source, external_id, card_program, truck_id, driver_id, ts,
         merchant, city, jurisdiction, gallons, fuel_type, unit_price_cents, total_cents, odometer)
       VALUES ($1,'csv:EFS',$2,'EFS',$3,$4,$5,$6,$7,$8,$9,'diesel',$10,$11,$12)`,
      [
        CARRIER, `EFS-${10000 + fuelN}`, truckIds[truckIdx], driverIds[truckIdx] ?? null,
        daysAgo(day, 7 + (fuelN % 9)), stop[0], stop[1].city, stop[2],
        gallons, ppgCents, Math.round(gallons * ppgCents), 95000 + truckIdx * 8000 + (84 - day) * 450,
      ]
    )
    fuelN++
  }
  // One over-capacity transaction → fraud flag (tank 240, gallons 312)
  await q(
    `INSERT INTO hub.fuel_transactions (carrier_id, source, external_id, card_program, truck_id, ts, merchant, city, jurisdiction, gallons, fuel_type, unit_price_cents, total_cents)
     VALUES ($1,'csv:Comdata','CMD-7781','Comdata',$2,$3,'Unknown stop','Fresno','CA',312,'diesel',410,127920)`,
    [CARRIER, truckIds[1], daysAgo(8, 23)]
  )

  // Tolls
  for (let i = 0; i < 8; i++) {
    await q(
      `INSERT INTO hub.toll_transactions (carrier_id, source, external_id, transponder, truck_id, ts, plaza, jurisdiction, amount_cents)
       VALUES ($1,'csv:BestPass',$2,'BP-22871',$3,$4,$5,'WA',$6)`,
      [CARRIER, `TOLL-${5000 + i}`, truckIds[i % 4], daysAgo(40 - i * 4, 12), "SR-520 Bridge", 950 + i * 50]
    )
  }

  // ---- Position pings: I-5 trail for in-transit truck + parked dots ----
  console.log("Creating position pings…")
  const i5Trail = [
    [47.38, -122.23], [47.0, -122.6], [46.6, -122.9], [46.1, -122.9], [45.6, -122.7],
    [45.2, -122.8], [44.6, -123.0], [44.0, -123.1], [43.2, -123.35], [42.4, -122.9],
    [41.8, -122.6], [41.3, -122.3], [40.8, -122.3], [40.2, -122.2], [39.5, -122.2],
  ]
  for (let i = 0; i < i5Trail.length; i++) {
    await q(
      `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, odometer, source)
       VALUES ($1,$2,$3,$4,$5,$6,'demo')`,
      [CARRIER, truckIds[0], new Date(Date.now() - (i5Trail.length - i) * 35 * 60000).toISOString(),
        i5Trail[i][0], i5Trail[i][1], 182000 + i * 38]
    )
  }
  // Quarter-long WA/OR/ID loop for IFTA computation on truck 102
  const loop = [
    CITY.kent, CITY.portland, CITY.medford, CITY.portland, CITY.kent, CITY.spokane, CITY.boise, CITY.spokane, CITY.kent,
  ]
  let odo = 142000
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < loop.length - 1; i++) {
      const a = loop[i]; const b = loop[i + 1]
      for (let s = 0; s <= 4; s++) {
        const lat = a.lat + ((b.lat - a.lat) * s) / 4
        const lng = a.lng + ((b.lng - a.lng) * s) / 4
        odo += 40
        await q(
          `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, odometer, source)
           VALUES ($1,$2,$3,$4,$5,$6,'demo')`,
          [CARRIER, truckIds[1],
            new Date(Date.now() - (80 - pass * 20 - i * 2) * 86400000 + s * 7200000).toISOString(),
            lat, lng, odo]
        )
      }
    }
  }
  const parked = [
    [2, CITY.kent], [3, CITY.spokane], [4, CITY.portland], [5, CITY.kent],
    [6, CITY.saltlake], [7, CITY.boise], [8, CITY.medford], [9, CITY.kent],
  ]
  for (const [ti, c] of parked) {
    await q(
      `INSERT INTO hub.position_pings (carrier_id, truck_id, ts, lat, lng, odometer, source)
       VALUES ($1,$2,$3,$4,$5,$6,'demo')`,
      [CARRIER, truckIds[ti], new Date(Date.now() - 22 * 60000).toISOString(),
        c.lat + (Math.random() - 0.5) * 0.04, c.lng + (Math.random() - 0.5) * 0.04, 95000 + ti * 8000]
    )
  }

  // ---- IFTA tax rates for the current quarter (plausible demo rates) ----
  console.log("Creating IFTA rates…")
  const quarter = quarterKey()
  const rates = [
    ["WA", 0.494, 0], ["OR", 0, 0], ["ID", 0.33, 0], ["CA", 0.908, 0], ["NV", 0.27, 0],
    ["UT", 0.365, 0], ["CO", 0.225, 0], ["AZ", 0.26, 0], ["MT", 0.2975, 0],
    ["IN", 0.55, 0.11], ["KY", 0.226, 0.102], ["VA", 0.382, 0],
  ]
  for (const [jur, rate, surcharge] of rates) {
    await q(
      `INSERT INTO hub.ifta_tax_rates (jurisdiction, quarter, rate, surcharge_rate) VALUES ($1,$2,$3,$4)
       ON CONFLICT (jurisdiction, quarter) DO UPDATE SET rate = $3, surcharge_rate = $4`,
      [jur, quarter, rate, surcharge]
    )
  }

  // ---- Compliance items (company-level) ----
  console.log("Creating compliance items…")
  const items = [
    ["2290 HVUT — stamped Schedule 1 (all trucks)", 70],
    ["UCR registration 2027", 200],
    ["IFTA license + cab card decals renewal", 25],
    ["Drug & alcohol consortium annual enrollment", -5], // overdue → red
    ["BOC-3 process agent on file", null],
  ]
  for (const [kind, days] of items) {
    await q(
      `INSERT INTO hub.compliance_items (carrier_id, entity_type, kind, due_on, status)
       VALUES ($1,'company',$2,$3,'open')`,
      [CARRIER, kind, days == null ? null : dateOnly(daysAhead(days))]
    )
  }

  // Maintenance schedule due soon on truck 101
  await q(
    `INSERT INTO hub.maintenance_schedules (carrier_id, truck_id, name, interval_miles, interval_days, last_done_on)
     VALUES ($1,$2,'PM service (oil + filters)',25000,90,$3)`,
    [CARRIER, truckIds[0], dateOnly(daysAgo(75))]
  )
  await q(
    `INSERT INTO hub.maintenance_records (carrier_id, truck_id, done_on, odometer, vendor, cost_cents, notes)
     VALUES ($1,$2,$3,176000,'Petes Truck Service',62500,'PM service + DOT inspection prep')`,
    [CARRIER, truckIds[0], dateOnly(daysAgo(75))]
  )

  // ---- Live share link for the in-transit load ----
  const token = randomBytes(16).toString("hex")
  await q(
    `INSERT INTO hub.share_links (carrier_id, load_id, token, created_by) VALUES ($1,$2,$3,$4)`,
    [CARRIER, inTransit.id, token, users.dispatcher]
  )

  console.log(`Done. Demo data ready.`)
  console.log(`  In-transit load: ${inTransit.reference} → tracking: /track/${token}`)
  console.log(`  Settlement-ready loads: ${settle1.reference}, ${settle2.reference} (company drv), ${settle3.reference} (O/O)`)
  console.log(`  POD-received load awaiting invoice: ${podLoad.reference}`)
  console.log("Legacy demo logins (password: LegacyDemoOnly1!):")
  console.log("  owner@demo.thind / dispatch@demo.thind / accounting@demo.thind")
  console.log("  driver@demo.thind / broker@demo.thind / shipper@demo.thind")
  await client.end()
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
