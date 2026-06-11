/**
 * Demo seed for the Thind Transport Hub.
 *
 * Populates a believable fleet: users for every role, trucks, trailers,
 * drivers, brokers, loads across the whole lifecycle, stops with real
 * city coordinates, and a position trail so the fleet map is alive.
 *
 * Idempotent: wipes and re-creates hub.* data (never touches the public
 * website tables). Refuses to run against production.
 *
 * Usage: npm run seed:demo
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
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

const CITY = {
  kent: { city: "Kent", state: "WA", lat: 47.3809, lng: -122.2348 },
  seattle: { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  spokane: { city: "Spokane", state: "WA", lat: 47.6588, lng: -117.426 },
  portland: { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  boise: { city: "Boise", state: "ID", lat: 43.615, lng: -116.2023 },
  sacramento: { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944 },
  oakland: { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712 },
  reno: { city: "Reno", state: "NV", lat: 39.5296, lng: -119.8138 },
  saltlake: { city: "Salt Lake City", state: "UT", lat: 40.7608, lng: -111.891 },
  denver: { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  phoenix: { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  losangeles: { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  fresno: { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871 },
  medford: { city: "Medford", state: "OR", lat: 42.3265, lng: -122.8756 },
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
  await q(`TRUNCATE hub.audit_log, hub.crm_activities, hub.position_pings, hub.documents,
           hub.load_status_events, hub.stops, hub.loads, hub.contacts, hub.users,
           hub.trucks, hub.trailers, hub.drivers, hub.customers RESTART IDENTITY CASCADE`)

  // ---- Users (one per role; demo credentials documented in docs/demo-script.md) ----
  console.log("Creating users…")
  const hash = await bcrypt.hash("ThindDemo1!", 10)
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
      `INSERT INTO hub.users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      [email, hash, name, role]
    )
    users[key] = rows[0].id
  }

  // ---- Drivers ----
  console.log("Creating drivers…")
  const driverSeed = [
    ["Harpreet", "Singh", "per_mile", 0.63, 320, 95],
    ["Gurjit", "Sandhu", "per_mile", 0.63, 200, 250],
    ["Jasdeep", "Brar", "percentage", 0.9, 400, 180],
    ["Manny", "Gill", "percentage", 0.9, 150, 22],
    ["Robert", "Castillo", "per_mile", 0.63, 500, 400],
    ["Amrit", "Bains", "per_mile", 0.63, 90, 365],
    ["Davinder", "Grewal", "percentage", 0.9, 700, 60],
    ["Tony", "Marsh", "per_mile", 0.63, 45, 130],
    ["Sukhwinder", "Mann", "percentage", 0.9, 365, 300],
    ["Carlos", "Reyes", "per_mile", 0.63, 280, 18],
  ]
  const driverIds = []
  for (let i = 0; i < driverSeed.length; i++) {
    const [first, last, payType, payRate, cdlDays, medDays] = driverSeed[i]
    const { rows } = await q(
      `INSERT INTO hub.drivers (first_name, last_name, phone, email, cdl_number, cdl_state,
         cdl_expiry, medical_card_expiry, hire_date, pay_type, pay_rate, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12) RETURNING id`,
      [
        first, last, `(206) 555-01${String(i).padStart(2, "0")}`,
        `${first.toLowerCase()}.${last.toLowerCase()}@demo.thind`,
        `WDL${100000 + i * 731}`, "WA",
        daysAhead(cdlDays).slice(0, 10), daysAhead(medDays).slice(0, 10),
        daysAgo(300 + i * 90).slice(0, 10), payType, payRate,
        i === 0 ? users.driver : null,
      ]
    )
    driverIds.push(rows[0].id)
  }

  // ---- Trucks ----
  console.log("Creating trucks…")
  const truckSeed = [
    ["101", 2024, "Freightliner", "Cascadia", "company", "active", 200, 320, 95],
    ["102", 2024, "Freightliner", "Cascadia", "company", "active", 95, 40, 95],
    ["103", 2023, "Freightliner", "Cascadia", "company", "active", 300, 150, 200],
    ["104", 2023, "Kenworth", "T680", "company", "active", 45, 22, 320],
    ["105", 2022, "Peterbilt", "579", "company", "shop", 150, 90, 150],
    ["201", 2023, "Volvo", "VNL 860", "owner_operator", "active", 280, 365, 280],
    ["202", 2021, "Kenworth", "W900", "owner_operator", "active", 60, 200, 60],
    ["203", 2022, "Peterbilt", "389", "owner_operator", "active", 400, 18, 400],
    ["106", 2024, "Freightliner", "Cascadia", "company", "active", 330, 250, 330],
    ["107", 2020, "Freightliner", "Cascadia", "company", "idle", 10, 75, 10],
  ]
  const truckIds = []
  for (let i = 0; i < truckSeed.length; i++) {
    const [unit, year, make, model, ownership, status, regDays, inspDays, insDays] = truckSeed[i]
    const { rows } = await q(
      `INSERT INTO hub.trucks (unit_number, vin, plate, plate_state, year, make, model,
         ownership, status, registration_expiry, inspection_due, insurance_expiry, assigned_driver_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        unit, `1FUJGLDR${year}${String(43000 + i * 137)}`, `C${82000 + i * 53}J`, "WA",
        year, make, model, ownership, status,
        daysAhead(regDays).slice(0, 10), daysAhead(inspDays).slice(0, 10), daysAhead(insDays).slice(0, 10),
        driverIds[i] ?? null,
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
      `INSERT INTO hub.trailers (unit_number, type, year, make, status, registration_expiry, inspection_due)
       VALUES ($1,$2,$3,$4,'active',$5,$6) RETURNING id`,
      [unit, type, year, make, daysAhead(100 + i * 40).slice(0, 10), daysAhead(50 + i * 30).slice(0, 10)]
    )
    trailerIds.push(rows[0].id)
  }

  // ---- Customers (brokers/shippers) ----
  console.log("Creating customers…")
  const customerSeed = [
    ["Pacific Crest Logistics", "broker", "MC-784512", 30, false],
    ["Evergreen Freight Partners", "broker", "MC-651203", 30, false],
    ["Cascade Produce Co.", "shipper", null, 21, false],
    ["Summit Brokerage Group", "broker", "MC-912844", 45, true],
    ["Rainier Building Supply", "shipper", null, 30, false],
    ["BlueLine Transportation Svcs", "broker", "MC-447190", 30, false],
    ["High Desert Freight", "broker", "MC-583321", 60, false],
  ]
  const customerIds = []
  for (const [name, type, mc, terms, factored] of customerSeed) {
    const { rows } = await q(
      `INSERT INTO hub.customers (name, type, mc_number, billing_email, phone, payment_terms_days, factored, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING id`,
      [
        name, type, mc,
        `ap@${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.demo`,
        "(503) 555-0188", terms, factored,
      ]
    )
    customerIds.push(rows[0].id)
  }
  // Link the demo broker login to a customer
  await q(`UPDATE hub.users SET customer_id = $1 WHERE id = $2`, [customerIds[0], users.broker])
  await q(`UPDATE hub.users SET customer_id = $1 WHERE id = $2`, [customerIds[2], users.shipper])

  // Contacts + CRM notes
  const contactSeed = [
    [0, "Mike Reynolds", "Carrier rep", "(503) 555-0142"],
    [0, "Sarah Chen", "After hours", "(503) 555-0177"],
    [1, "Doug Whitfield", "Dispatch desk", "(425) 555-0123"],
    [3, "Angela Torres", "Accounting", "(602) 555-0156"],
  ]
  for (const [ci, name, role, phone] of contactSeed) {
    await q(
      `INSERT INTO hub.contacts (customer_id, name, role, phone, email) VALUES ($1,$2,$3,$4,$5)`,
      [customerIds[ci], name, role, phone, `${name.toLowerCase().replace(/ /g, ".")}@demo.broker`]
    )
  }
  await q(
    `INSERT INTO hub.crm_activities (customer_id, kind, body, actor_name) VALUES
     ($1,'call','Mike says reefer volume out of Yakima doubles in July — wants 2 trucks/week committed.','Maya Dhillon'),
     ($1,'note','Pays in 22 days average. Good broker, no detention pushback.','Priya Kaur'),
     ($2,'email','Sent updated insurance certificate for 2026.','Priya Kaur')`,
    [customerIds[0], customerIds[1]]
  )

  // ---- Loads across the lifecycle ----
  console.log("Creating loads…")
  let refCounter = 1001
  async function makeLoad(opts) {
    const {
      customer, status, equipment, commodity, weight, linehaul, fsc, miles,
      driver, truck, trailer, origin, dest, pickupDaysAgo, deliverDaysAgo,
      arrived = false, departed = false, source = "direct",
    } = opts
    const reference = `THD-${refCounter++}`
    const { rows } = await q(
      `INSERT INTO hub.loads (reference, customer_reference, customer_id, status, equipment,
         commodity, weight_lbs, linehaul, fuel_surcharge, loaded_miles, deadhead_miles,
         truck_id, trailer_id, driver_id, dispatcher_id, source, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [
        reference, `BRK${30000 + refCounter}`, customerIds[customer], status, equipment,
        commodity, weight, linehaul, fsc, miles, Math.round(miles * 0.08),
        truck != null ? truckIds[truck] : null,
        trailer != null ? trailerIds[trailer] : null,
        driver != null ? driverIds[driver] : null,
        users.dispatcher, source,
        daysAgo(pickupDaysAgo + 1),
      ]
    )
    const loadId = rows[0].id
    const pickupArrive = daysAgo(pickupDaysAgo, 9)
    const pickupDepart = daysAgo(pickupDaysAgo, 11)
    const delivArrive = daysAgo(deliverDaysAgo, 14)
    const delivDepart = daysAgo(deliverDaysAgo, 16)
    const pickupDone = arrived || ["in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"].includes(status)
    const delivered = ["delivered", "pod_received", "invoiced", "paid", "settled"].includes(status)
    await q(
      `INSERT INTO hub.stops (load_id, sequence, type, facility, city, state, lat, lng, appt_start, arrived_at, departed_at)
       VALUES ($1,1,'pickup',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        loadId, `${origin.city} Distribution`, origin.city, origin.state, origin.lat, origin.lng,
        daysAgo(pickupDaysAgo, 8),
        pickupDone || arrived ? pickupArrive : null,
        pickupDone ? pickupDepart : null,
      ]
    )
    await q(
      `INSERT INTO hub.stops (load_id, sequence, type, facility, city, state, lat, lng, appt_start, arrived_at, departed_at)
       VALUES ($1,2,'delivery',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        loadId, `${dest.city} Receiving`, dest.city, dest.state, dest.lat, dest.lng,
        daysAgo(deliverDaysAgo, 14),
        delivered ? delivArrive : null,
        delivered && departed !== false ? delivDepart : null,
      ]
    )
    // Status history trail
    const chain = ["booked", "dispatched", "at_pickup", "in_transit", "delivered", "pod_received", "invoiced", "paid", "settled"]
    const upto = status === "quoted" ? 0 : chain.indexOf(status) + 1
    let prev = null
    const eventBase = status === "quoted" ? ["quoted"] : chain.slice(0, Math.max(upto, 1))
    for (let i = 0; i < eventBase.length; i++) {
      await q(
        `INSERT INTO hub.load_status_events (load_id, from_status, to_status, actor_name, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [loadId, prev, eventBase[i], "Maya Dhillon", daysAgo(pickupDaysAgo + 1, 8 + i)]
      )
      prev = eventBase[i]
    }
    return loadId
  }

  // Active board loads
  await makeLoad({ customer: 0, status: "booked", equipment: "reefer", commodity: "Frozen berries", weight: 41000, linehaul: 2850, fsc: 320, miles: 740, driver: 1, truck: 1, trailer: 2, origin: CITY.kent, dest: CITY.sacramento, pickupDaysAgo: -1, deliverDaysAgo: -3 })
  await makeLoad({ customer: 5, status: "booked", equipment: "dry_van", commodity: "Paper products", weight: 38500, linehaul: 1980, fsc: 210, miles: 465, origin: CITY.portland, dest: CITY.boise, pickupDaysAgo: -2, deliverDaysAgo: -3 })
  await makeLoad({ customer: 1, status: "dispatched", equipment: "flatbed", commodity: "Lumber", weight: 44000, linehaul: 2400, fsc: 260, miles: 610, driver: 2, truck: 5, trailer: 4, origin: CITY.kent, dest: CITY.boise, pickupDaysAgo: 0, deliverDaysAgo: -2 })
  await makeLoad({ customer: 3, status: "at_pickup", equipment: "dry_van", commodity: "Retail goods", weight: 36000, linehaul: 2100, fsc: 230, miles: 520, driver: 3, truck: 3, trailer: 0, origin: CITY.spokane, dest: CITY.portland, pickupDaysAgo: 0, deliverDaysAgo: -1, arrived: true })
  const inTransit1 = await makeLoad({ customer: 0, status: "in_transit", equipment: "reefer", commodity: "Fresh produce", weight: 42500, linehaul: 3450, fsc: 380, miles: 920, driver: 0, truck: 0, trailer: 3, origin: CITY.kent, dest: CITY.losangeles, pickupDaysAgo: 1, deliverDaysAgo: -1 })
  await makeLoad({ customer: 6, status: "in_transit", equipment: "dry_van", commodity: "Beverages", weight: 43000, linehaul: 2750, fsc: 300, miles: 820, driver: 6, truck: 6, trailer: 6, origin: CITY.portland, dest: CITY.saltlake, pickupDaysAgo: 1, deliverDaysAgo: 0 })
  await makeLoad({ customer: 2, status: "delivered", equipment: "reefer", commodity: "Apples", weight: 41800, linehaul: 2200, fsc: 240, miles: 540, driver: 5, truck: 8, trailer: 2, origin: CITY.kent, dest: CITY.medford, pickupDaysAgo: 3, deliverDaysAgo: 1 })
  await makeLoad({ customer: 4, status: "pod_received", equipment: "flatbed", commodity: "Steel beams", weight: 45000, linehaul: 2950, fsc: 310, miles: 690, driver: 8, truck: 7, trailer: 5, origin: CITY.seattle, dest: CITY.boise, pickupDaysAgo: 4, deliverDaysAgo: 2 })

  // Money pipeline + history
  await makeLoad({ customer: 1, status: "invoiced", equipment: "dry_van", commodity: "Pet food", weight: 39000, linehaul: 2300, fsc: 250, miles: 560, driver: 9, truck: 3, trailer: 7, origin: CITY.portland, dest: CITY.reno, pickupDaysAgo: 7, deliverDaysAgo: 5 })
  await makeLoad({ customer: 3, status: "paid", equipment: "reefer", commodity: "Dairy", weight: 40500, linehaul: 3100, fsc: 340, miles: 780, driver: 2, truck: 2, trailer: 3, origin: CITY.kent, dest: CITY.sacramento, pickupDaysAgo: 14, deliverDaysAgo: 12 })
  const histLanes = [
    [0, CITY.kent, CITY.portland, "dry_van", 980, 105, 175],
    [1, CITY.seattle, CITY.spokane, "dry_van", 1250, 140, 280],
    [0, CITY.kent, CITY.boise, "reefer", 2350, 260, 505],
    [5, CITY.portland, CITY.fresno, "reefer", 3200, 350, 750],
    [6, CITY.spokane, CITY.missoula, "flatbed", 1100, 120, 200],
    [2, CITY.kent, CITY.sacramento, "reefer", 2900, 320, 752],
    [1, CITY.portland, CITY.denver, "dry_van", 3800, 420, 1240],
    [4, CITY.seattle, CITY.phoenix, "flatbed", 4300, 470, 1420],
    [0, CITY.kent, CITY.losangeles, "reefer", 3500, 380, 1135],
    [3, CITY.spokane, CITY.billings, "dry_van", 1450, 160, 540],
  ]
  for (let i = 0; i < histLanes.length; i++) {
    const [cust, origin, dest, equip, lh, fsc, miles] = histLanes[i]
    await makeLoad({
      customer: cust, status: "settled", equipment: equip, commodity: "Mixed freight",
      weight: 36000 + i * 800, linehaul: lh, fsc, miles,
      driver: i % driverIds.length, truck: i % truckIds.length, trailer: i % trailerIds.length,
      origin, dest, pickupDaysAgo: 20 + i * 6, deliverDaysAgo: 18 + i * 6, source: "import",
    })
  }
  // One quoted + one cancelled for realism
  await makeLoad({ customer: 2, status: "quoted", equipment: "reefer", commodity: "Onions", weight: 40000, linehaul: 2600, fsc: 0, miles: 640, origin: CITY.kent, dest: CITY.oakland, pickupDaysAgo: -4, deliverDaysAgo: -6 })

  // ---- Position pings: trail down I-5 for the in-transit truck, dots for the rest ----
  console.log("Creating position pings…")
  const i5Trail = [
    [47.38, -122.23], [47.0, -122.6], [46.6, -122.9], [46.1, -122.9], [45.6, -122.7],
    [45.2, -122.8], [44.6, -123.0], [44.0, -123.1], [43.2, -123.35], [42.4, -122.9],
    [41.8, -122.6], [41.3, -122.3], [40.8, -122.3], [40.2, -122.2], [39.5, -122.2],
  ]
  for (let i = 0; i < i5Trail.length; i++) {
    await q(
      `INSERT INTO hub.position_pings (truck_id, ts, lat, lng, odometer, source)
       VALUES ($1,$2,$3,$4,$5,'demo')`,
      [truckIds[0], new Date(Date.now() - (i5Trail.length - i) * 35 * 60000).toISOString(),
        i5Trail[i][0], i5Trail[i][1], 182000 + i * 38, ]
    )
  }
  const parked = [
    [1, CITY.kent], [2, CITY.kent], [3, CITY.spokane], [4, CITY.portland],
    [5, CITY.kent], [6, CITY.saltlake], [7, CITY.boise], [8, CITY.medford], [9, CITY.kent],
  ]
  for (const [ti, c] of parked) {
    await q(
      `INSERT INTO hub.position_pings (truck_id, ts, lat, lng, odometer, source)
       VALUES ($1,$2,$3,$4,$5,'demo')`,
      [truckIds[ti], new Date(Date.now() - 22 * 60000).toISOString(),
        c.lat + (Math.random() - 0.5) * 0.04, c.lng + (Math.random() - 0.5) * 0.04, 95000 + ti * 8000]
    )
  }

  console.log(`Done. Demo data ready — in-transit reefer load: ${inTransit1}`)
  console.log("Logins (password: ThindDemo1!):")
  console.log("  owner@demo.thind / dispatch@demo.thind / accounting@demo.thind")
  console.log("  driver@demo.thind / broker@demo.thind / shipper@demo.thind")
  await client.end()
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
