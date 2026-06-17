#!/usr/bin/env node
/**
 * Idempotent, clearly-watermarked HaulDesk sandbox seed.
 *
 * This is separate from production/go-live data. It creates two sandbox carriers
 * with believable sample operations so Sukhdev can click through HaulDesk from an
 * iPhone immediately, then switch to production setup screens to enter real facts.
 */
import bcrypt from "bcrypt"
import { connect, resetSandbox, SANDBOX_CARRIERS } from "./sandbox-reset.mjs"

const [THIND, ATS] = SANDBOX_CARRIERS
const OWNER_EMAIL = "owner@sandbox.hauldesk.local"
const DISPATCH_EMAIL = "dispatch@sandbox.hauldesk.local"
const DRIVER_EMAIL = "driver@sandbox.hauldesk.local"
const OWNER_PASSWORD = "SandboxOwner1!"
const DISPATCH_PASSWORD = "SandboxDispatch1!"
const DRIVER_PASSWORD = "SandboxDriver1!"

const days = (offset, hour = 9) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
const dateOnly = (offset) => days(offset).slice(0, 10)

async function insertOne(q, text, params = []) {
  const { rows } = await q(text, params)
  return rows[0]
}

async function seedCarrier(q, carrier) {
  const settings = {
    invoice: { prefix: carrier.prefix, nextNumber: carrier.nextInvoice, defaultTermsDays: 30 },
    pay: { companyDriverPerMile: 0.65, ownerOperatorPercentage: 0.88, payLoadedMilesOnly: true },
    detention: { freeHours: 2, ratePerHourCents: 6000 },
    costPerMileCents: carrier.costPerMileCents,
    fsc: { baseCentsPerGallon: 125, mpg: 6 },
    factoring: {
      company: "Cascade Sample Factoring",
      remitName: "Cascade Sample Factoring",
      remitAddress: "PO Box 1000, Seattle, WA 98101",
      email: "sandbox-factor@example.invalid",
      feeBps: 300,
      reserveBps: 0,
    },
    notifications: { officeEmail: "sandbox-office@example.invalid" },
  }

  await q(
    `INSERT INTO hub.carriers (
      id, name, legal_name, display_name, dot_number, mc_number, phone, email,
      address, environment, invoice_prefix, remit_to
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'sandbox',$10,$11)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      legal_name = EXCLUDED.legal_name,
      display_name = EXCLUDED.display_name,
      dot_number = EXCLUDED.dot_number,
      mc_number = EXCLUDED.mc_number,
      phone = EXCLUDED.phone,
      environment = 'sandbox',
      invoice_prefix = EXCLUDED.invoice_prefix,
      remit_to = EXCLUDED.remit_to`,
    [
      carrier.id,
      `SANDBOX ${carrier.legalName}`,
      carrier.legalName,
      carrier.displayName,
      carrier.dot,
      carrier.mc,
      carrier.phone,
      carrier.email,
      carrier.address,
      carrier.prefix,
      "Cascade Sample Factoring\nPO Box 1000, Seattle, WA 98101",
    ]
  )
  await q(
    `INSERT INTO hub.carrier_settings (carrier_id, settings)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (carrier_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
    [carrier.id, JSON.stringify(settings)]
  )

  for (const name of ["Linehaul", "Fuel surcharge", "Detention", "Layover", "Lumper", "TONU", "Other"]) {
    await q(
      `INSERT INTO hub.revenue_categories (carrier_id, data_mode, name)
       VALUES ($1,'sandbox',$2) ON CONFLICT (carrier_id, name) DO NOTHING`,
      [carrier.id, name]
    )
  }
  for (const name of ["Insurance", "ELD fee", "Trailer rent", "Escrow", "Advance recapture", "Fuel (O/O)", "Tolls (O/O)", "Occupational accident", "Other"]) {
    await q(
      `INSERT INTO hub.debit_categories (carrier_id, data_mode, name)
       VALUES ($1,'sandbox',$2) ON CONFLICT (carrier_id, name) DO NOTHING`,
      [carrier.id, name]
    )
  }

  const ooTariff = await insertOne(
    q,
    `INSERT INTO hub.pay_tariffs (
      carrier_id, data_mode, name, contractor_type, pay_type, rate_bps,
      fsc_passthrough_bps, plain_english, rules
    ) VALUES ($1,'sandbox',$2,'owner_operator_1099','percentage',8800,10000,$3,$4::jsonb)
    ON CONFLICT (carrier_id, name) DO UPDATE SET plain_english = EXCLUDED.plain_english
    RETURNING id`,
    [
      carrier.id,
      "OO-88",
      "Owner-operator gets 88% of gross linehaul plus 100% of fuel surcharge. Deduct weekly: $312 insurance, $45 ELD, $40 trailer rent, $50 escrow until $2,000 held. Driver pays own fuel and tolls; detention/layover/lumper pass through when broker pays.",
      JSON.stringify({ insuranceWeeklyCents: 31200, eldWeeklyCents: 4500, trailerRentWeeklyCents: 4000, escrowWeeklyCents: 5000, escrowCapCents: 200000 }),
    ]
  )
  const mileTariff = await insertOne(
    q,
    `INSERT INTO hub.pay_tariffs (
      carrier_id, data_mode, name, contractor_type, pay_type, loaded_rate_cents,
      empty_rate_cents, fsc_passthrough_bps, plain_english, rules
    ) VALUES ($1,'sandbox',$2,'company_driver_1099','per_mile',65,40,0,$3,$4::jsonb)
    ON CONFLICT (carrier_id, name) DO UPDATE SET plain_english = EXCLUDED.plain_english
    RETURNING id`,
    [
      carrier.id,
      "CD-65-1099",
      "1099 company driver gets $0.65 per loaded mile and $0.40 per empty mile. Detention pays $40/hr after 2 free hours when broker pays; layover $150/night; lumper reimbursed with receipt. Company pays fuel and tolls; advances recaptured $150/week when owed.",
      JSON.stringify({ detentionHourlyCents: 4000, layoverCents: 15000, advanceRecaptureWeeklyCents: 15000 }),
    ]
  )

  const driverRows = []
  for (const [i, d] of carrier.drivers.entries()) {
    const tariff = d.oo ? ooTariff.id : mileTariff.id
    const row = await insertOne(
      q,
      `INSERT INTO hub.drivers (
        carrier_id, data_mode, first_name, last_name, phone, email, cdl_number,
        cdl_state, cdl_expiry, medical_card_expiry, hire_date, pay_type, pay_rate,
        contractor_type, pay_tariff_id, escrow_weekly_cents, insurance_weekly_cents,
        pay_loaded_miles_only, status, notes
      ) VALUES (
        $1,'sandbox',$2,$3,$4,$5,$6,'WA',$7,$8,$9,$10,$11,$12,$13,$14,$15,true,'active',$16
      ) RETURNING id`,
      [
        carrier.id,
        d.first,
        d.last,
        d.phone,
        d.email,
        `SAMPLE-${carrier.short}-${i + 1}`,
        dateOnly(260 + i * 25),
        d.expiredMed ? dateOnly(-12) : dateOnly(55 + i * 20),
        dateOnly(-420 - i * 45),
        d.oo ? "percentage" : "per_mile",
        d.oo ? "0.8800" : "0.6500",
        d.oo ? "owner_operator_1099" : "company_driver_1099",
        tariff,
        d.oo ? 5000 : 0,
        d.oo ? 31200 : 0,
        `${d.oo ? "Owner-operator" : "Company-style"} 1099 sandbox driver assigned to ${d.homeDay} home-time preference.`,
      ]
    )
    driverRows.push({ ...d, id: row.id, tariff })
  }

  const truckRows = []
  for (const [i, t] of carrier.trucks.entries()) {
    const driver = driverRows[i % driverRows.length]
    const row = await insertOne(
      q,
      `INSERT INTO hub.trucks (
        carrier_id, data_mode, unit_number, vin, plate, plate_state, year, make,
        model, ownership, status, registration_expiry, inspection_due,
        insurance_expiry, assigned_driver_id, tank_capacity_gallons,
        current_odometer, eld_device_id, fuel_card_last4, notes
      ) VALUES (
        $1,'sandbox',$2,$3,$4,'WA',$5,$6,$7,$8,'active',$9,$10,$11,$12,$13,$14,$15,$16,$17
      ) RETURNING id`,
      [
        carrier.id,
        t.unit,
        `SANDBOXVIN${carrier.short}${String(i + 1).padStart(8, "0")}`,
        `S${carrier.short}${100 + i}`,
        t.year,
        t.make,
        t.model,
        t.oo ? "owner_operator" : "company",
        dateOnly(180 + i * 20),
        dateOnly(45 + i * 12),
        dateOnly(80 + i * 14),
        driver.id,
        t.tank,
        t.odo,
        `ELD-SAMPLE-${carrier.short}-${i + 1}`,
        String(4100 + i).slice(-4),
        `${t.type} sandbox truck with fake ELD and fuel-card details.`,
      ]
    )
    truckRows.push({ ...t, id: row.id, driverId: driver.id })
  }

  const trailerRows = []
  for (const [i, tr] of carrier.trailers.entries()) {
    const row = await insertOne(
      q,
      `INSERT INTO hub.trailers (
        carrier_id, data_mode, unit_number, vin, plate, plate_state, year, make,
        type, status, registration_expiry, inspection_due, notes
      ) VALUES ($1,'sandbox',$2,$3,$4,'WA',$5,$6,$7,'active',$8,$9,$10)
      RETURNING id`,
      [
        carrier.id,
        tr.unit,
        `SANDBOXTRL${carrier.short}${String(i + 1).padStart(8, "0")}`,
        `TR${carrier.short}${200 + i}`,
        tr.year,
        tr.make,
        tr.type,
        dateOnly(220 + i * 15),
        dateOnly(35 + i * 18),
        `${tr.type.replace("_", " ")} sandbox trailer.`,
      ]
    )
    trailerRows.push({ ...tr, id: row.id })
  }

  const customerRows = []
  for (const c of carrier.customers) {
    const row = await insertOne(
      q,
      `INSERT INTO hub.customers (
        carrier_id, data_mode, name, type, mc_number, dot_number, billing_email,
        billing_address, phone, payment_terms_days, credit_limit_cents, factored,
        status, notes
      ) VALUES ($1,'sandbox',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id`,
      [
        carrier.id,
        c.name,
        c.type,
        c.mc,
        c.dot,
        `ap+${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.invalid`,
        `${100 + customerRows.length} Sample AP Way, Seattle, WA`,
        c.phone,
        c.terms,
        c.credit,
        c.factored,
        c.blacklisted ? "blacklisted" : c.slow ? "on_hold" : "active",
        c.slow ? "Sandbox slow payer: invoices age into amber/red." : c.blacklisted ? "Sandbox blacklist example; ranker should penalize." : "Sandbox customer with believable terms.",
      ]
    )
    customerRows.push({ ...c, id: row.id })
  }

  const loadRows = []
  for (const [i, load] of carrier.loads.entries()) {
    const customer = customerRows[i % customerRows.length]
    const truck = truckRows[i % truckRows.length]
    const trailer = trailerRows[i % trailerRows.length]
    const driver = driverRows[i % driverRows.length]
    const ref = `${carrier.short}-${String(7000 + i).padStart(5, "0")}`
    const row = await insertOne(
      q,
      `INSERT INTO hub.loads (
        carrier_id, data_mode, reference, customer_reference, customer_id, status,
        equipment, commodity, weight_lbs, linehaul_cents, fuel_surcharge_cents,
        accessorials, loaded_miles, deadhead_miles, truck_id, trailer_id, driver_id,
        source, factored, notes, created_at
      ) VALUES (
        $1,'sandbox',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20::timestamptz
      ) RETURNING id`,
      [
        carrier.id,
        ref,
        `BR-${carrier.short}-${9000 + i}`,
        customer.id,
        load.status,
        load.equipment,
        load.commodity,
        load.weight,
        load.linehaul,
        load.fsc,
        JSON.stringify(load.accessorials ?? []),
        load.miles,
        load.deadhead,
        truck.id,
        trailer.id,
        driver.id,
        load.source,
        customer.factored,
        `Sandbox ${load.lane[0]}, ${load.lane[1]} → ${load.lane[2]}, ${load.lane[3]} load.`,
        days(-20 + i, 8),
      ]
    )
    loadRows.push({ ...load, id: row.id, ref, customer, truck, driver })
    await q(
      `INSERT INTO hub.stops (
        carrier_id, data_mode, load_id, sequence, type, facility, city, state,
        appt_start, appt_end, lat, lng
      ) VALUES
        ($1,'sandbox',$2,1,'pickup',$3,$4,$5,$6,$7,$8,$9),
        ($1,'sandbox',$2,2,'delivery',$10,$11,$12,$13,$14,$15,$16)`,
      [
        carrier.id,
        row.id,
        `${load.lane[0]} Sample Dock`,
        load.lane[0],
        load.lane[1],
        days(-8 + i, 8),
        days(-8 + i, 10),
        47.38 + i / 100,
        -122.23 - i / 100,
        `${load.lane[2]} Sample Receiver`,
        load.lane[2],
        load.lane[3],
        days(-7 + i, 14),
        days(-7 + i, 16),
        45.51 + i / 100,
        -122.67 - i / 100,
      ]
    )
    await q(
      `INSERT INTO hub.load_events (carrier_id, data_mode, load_id, kind, actor_name, payload, created_at)
       VALUES ($1,'sandbox',$2,'status_change','Sandbox seed',$3::jsonb,NOW())`,
      [carrier.id, row.id, JSON.stringify({ to: load.status, note: "Seeded lifecycle event" })]
    )
  }

  for (const [i, load] of loadRows.filter((l) => ["invoiced", "paid", "settled"].includes(l.status)).entries()) {
    const amount = load.linehaul + load.fsc + (load.accessorials ?? []).reduce((sum, a) => sum + a.amount_cents, 0)
    const dueOffset = load.status === "invoiced" && i % 2 === 0 ? -16 : 12
    const invoice = await insertOne(
      q,
      `INSERT INTO hub.invoices (
        carrier_id, data_mode, number, customer_id, load_id, amount_cents,
        issued_on, due_on, status, factored, remit_to
      ) VALUES ($1,'sandbox',$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        carrier.id,
        `${carrier.prefix}${carrier.nextInvoice + i}`,
        load.customer.id,
        load.id,
        amount,
        dateOnly(-20 + i),
        dateOnly(dueOffset),
        load.status === "settled" || load.status === "paid" ? "paid" : dueOffset < 0 ? "overdue" : "sent",
        load.customer.factored,
        "Cascade Sample Factoring\nPO Box 1000, Seattle, WA 98101",
      ]
    )
    if (load.status === "paid" || load.status === "settled") {
      await q(
        `INSERT INTO hub.payments (carrier_id, data_mode, invoice_id, amount_cents, paid_on, method, reference)
         VALUES ($1,'sandbox',$2,$3,$4,'ACH',$5)`,
        [carrier.id, invoice.id, amount, dateOnly(-2 - i), `SAMPLE-PMT-${carrier.short}-${i}`]
      )
    }
  }

  for (const tariff of [ooTariff, mileTariff]) {
    const driver = driverRows.find((d) => d.tariff === tariff.id)
    if (!driver) continue
    const draft = await insertOne(
      q,
      `INSERT INTO hub.settlements (
        carrier_id, data_mode, driver_id, period_start, period_end, status,
        gross_cents, deductions_cents, net_cents
      ) VALUES ($1,'sandbox',$2,$3,$4,'draft',$5,$6,$7)
      RETURNING id`,
      [carrier.id, driver.id, dateOnly(-7), dateOnly(-1), driver.oo ? 412500 : 148250, driver.oo ? 44700 : 15000, driver.oo ? 367800 : 133250]
    )
    const lines = driver.oo
      ? [
          ["earning", "88% linehaul on SB sample loads + 100% FSC", 412500],
          ["deduction", "Insurance", 31200],
          ["deduction", "ELD fee", 4500],
          ["deduction", "Trailer rent", 4000],
          ["deduction", "Escrow contribution", 5000],
        ]
      : [
          ["earning", "1,950 loaded mi × $0.65", 126750],
          ["earning", "430 empty mi × $0.40", 17200],
          ["reimbursement", "Lumper receipt", 4300],
          ["deduction", "Advance recapture", 15000],
        ]
    for (const [kind, label, amount] of lines) {
      await q(
        `INSERT INTO hub.settlement_lines (settlement_id, data_mode, kind, label, amount_cents)
         VALUES ($1,'sandbox',$2,$3,$4)`,
        [draft.id, kind, label, amount]
      )
    }
  }

  for (const [i, truck] of truckRows.entries()) {
    await q(
      `INSERT INTO hub.fuel_transactions (
        carrier_id, data_mode, source, external_id, card_program, truck_id,
        driver_id, ts, merchant, city, jurisdiction, gallons, fuel_type,
        unit_price_cents, total_cents, odometer, raw
      ) VALUES ($1,'sandbox','sandbox',$2,'EFS Sample',$3,$4,$5,$6,$7,$8,$9,'diesel',$10,$11,$12,$13::jsonb)`,
      [
        carrier.id,
        `${carrier.short}-FUEL-${i}`,
        truck.id,
        truck.driverId,
        days(-5 + i, 11),
        "Pacific Pride Sample",
        i % 2 ? "Portland" : "Boise",
        i % 2 ? "OR" : "ID",
        92.5 + i * 7,
        439 + i,
        Math.round((92.5 + i * 7) * (439 + i)),
        truck.odo + 300 + i * 100,
        JSON.stringify({ sample: true }),
      ]
    )
    await q(
      `INSERT INTO hub.toll_transactions (
        carrier_id, data_mode, source, external_id, transponder, truck_id, ts,
        plaza, jurisdiction, amount_cents, raw
      ) VALUES ($1,'sandbox','sandbox',$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        carrier.id,
        `${carrier.short}-TOLL-${i}`,
        `SAMPLE-TX-${i}`,
        truck.id,
        days(-4 + i, 14),
        i % 2 ? "Tacoma Narrows" : "I-15 Express",
        i % 2 ? "WA" : "UT",
        1850 + i * 625,
        JSON.stringify({ sample: true }),
      ]
    )
  }

  const complianceRows = [
    ["driver", driverRows[0].id, "Medical card", dateOnly(-12), "Expired sample med card"],
    ["company", null, "COI", dateOnly(21), "Expiring sample certificate of insurance"],
    ["truck", truckRows[0].id, "Annual inspection", dateOnly(80), "Healthy annual inspection"],
  ]
  for (const [entityType, entityId, kind, dueOn, note] of complianceRows) {
    await q(
      `INSERT INTO hub.compliance_items (carrier_id, data_mode, entity_type, entity_id, kind, due_on, status, note)
       VALUES ($1,'sandbox',$2,$3,$4,$5,'open',$6)`,
      [carrier.id, entityType, entityId, kind, dueOn, note]
    )
  }

  const candidates = [
    ["DAT", "Cascade Produce", "reefer", "Kent", "WA", "Fresno", "CA", 340000, 42000, 870, 26, 91],
    ["Uber Freight", "PNW Retail", "dry_van", "Portland", "OR", "Reno", "NV", 275000, 26000, 575, 118, 84],
    ["DAT", "Mountain Steel", "flatbed", "Spokane", "WA", "Denver", "CO", 410000, 50000, 1120, 72, 88],
    ["Direct", "Valley Foods", "reefer", "Seattle", "WA", "Boise", "ID", 230000, 22000, 510, 18, 79],
    ["DAT", "Slow Pay Sample", "dry_van", "Tacoma", "WA", "Phoenix", "AZ", 395000, 44000, 1410, 34, 63],
  ]
  for (const c of candidates) {
    await q(
      `INSERT INTO hub.load_candidates (
        carrier_id, data_mode, source, broker_name, equipment, origin_city,
        origin_state, dest_city, dest_state, pickup_at, delivery_at,
        linehaul_cents, fuel_surcharge_cents, loaded_miles, deadhead_miles, score
      ) VALUES ($1,'sandbox',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)`,
      [
        carrier.id,
        c[0],
        c[1],
        c[2],
        c[3],
        c[4],
        c[5],
        c[6],
        days(1, 8),
        days(3, 14),
        c[7],
        c[8],
        c[9],
        c[10],
        JSON.stringify({
          score: c[11],
          math: {
            ratePerTotalMile: ((c[7] + c[8]) / 100 / (c[9] + c[10])).toFixed(2),
            estimatedFuel: Math.round(((c[9] + c[10]) / 6) * 4.35 * 100),
            laneStrength: c[11] > 85 ? "strong outbound history" : c[11] > 75 ? "average outbound history" : "slow payer / weak fit penalty",
          },
        }),
      ]
    )
  }

  return { driverRows }
}

async function main() {
  const client = await connect()
  const q = (text, params = []) => client.query(text, params)
  try {
    await resetSandbox(client)
    await q("BEGIN")

    const hashOwner = await bcrypt.hash(OWNER_PASSWORD, 10)
    const hashDispatch = await bcrypt.hash(DISPATCH_PASSWORD, 10)
    const hashDriver = await bcrypt.hash(DRIVER_PASSWORD, 10)

    const carriers = [
      {
        id: THIND,
        short: "TT",
        legalName: "Thind Transport LLC",
        displayName: "Thind",
        dot: "2523064",
        mc: "876103",
        phone: "(206) 765-6300",
        email: "sandbox-thind@example.invalid",
        address: "PO Box 5114, Kent, WA 98064",
        prefix: "SB-TT-",
        nextInvoice: 7001,
        costPerMileCents: 185,
        drivers: [
          { first: "Harpreet", last: "Singh", phone: "(206) 555-0101", email: "harpreet.sample@example.invalid", oo: true, homeDay: "Friday" },
          { first: "Manpreet", last: "Kaur", phone: "(206) 555-0102", email: "manpreet.sample@example.invalid", oo: false, homeDay: "Sunday", expiredMed: true },
          { first: "Gurpreet", last: "Gill", phone: "(206) 555-0103", email: "gurpreet.sample@example.invalid", oo: true, homeDay: "Wednesday" },
          { first: "Amandeep", last: "Dhillon", phone: "(206) 555-0104", email: "amandeep.sample@example.invalid", oo: false, homeDay: "Friday" },
        ],
        trucks: [
          { unit: "TT-231", year: 2024, make: "Freightliner", model: "Cascadia", type: "reefer", tank: 240, odo: 182450, oo: false },
          { unit: "TT-188", year: 2022, make: "Volvo", model: "VNL", type: "dry", tank: 220, odo: 327880, oo: true },
          { unit: "TT-245", year: 2025, make: "Freightliner", model: "Cascadia", type: "flatbed", tank: 240, odo: 74120, oo: false },
          { unit: "TT-207", year: 2023, make: "Peterbilt", model: "579", type: "dry", tank: 230, odo: 245900, oo: true },
        ],
        trailers: [
          { unit: "TTR-901", year: 2021, make: "Utility", type: "reefer" },
          { unit: "TTV-331", year: 2020, make: "Wabash", type: "dry_van" },
          { unit: "TTF-118", year: 2022, make: "Fontaine", type: "flatbed" },
          { unit: "TTV-344", year: 2024, make: "Great Dane", type: "dry_van" },
        ],
      },
      {
        id: ATS,
        short: "ATS",
        legalName: "ATS Transport LLC",
        displayName: "ATS",
        dot: "SAMPLE",
        mc: "SAMPLE",
        phone: "(253) 410-7259",
        email: "sandbox-ats@example.invalid",
        address: "Sample ATS yard address",
        prefix: "SB-ATS-",
        nextInvoice: 3001,
        costPerMileCents: 190,
        drivers: [
          { first: "Jaspreet", last: "Sidhu", phone: "(253) 555-0201", email: "jaspreet.sample@example.invalid", oo: true, homeDay: "Friday" },
          { first: "Navdeep", last: "Brar", phone: "(253) 555-0202", email: "navdeep.sample@example.invalid", oo: false, homeDay: "Saturday" },
          { first: "Kuldeep", last: "Mann", phone: "(253) 555-0203", email: "kuldeep.sample@example.invalid", oo: true, homeDay: "Tuesday" },
        ],
        trucks: [
          { unit: "ATS-41", year: 2024, make: "Freightliner", model: "Cascadia", type: "reefer", tank: 240, odo: 121450, oo: false },
          { unit: "ATS-52", year: 2021, make: "Kenworth", model: "T680", type: "dry", tank: 220, odo: 381220, oo: true },
          { unit: "ATS-63", year: 2023, make: "Volvo", model: "VNL", type: "flatbed", tank: 230, odo: 208400, oo: false },
        ],
        trailers: [
          { unit: "ATSR-51", year: 2021, make: "Utility", type: "reefer" },
          { unit: "ATSV-77", year: 2020, make: "Hyundai", type: "dry_van" },
          { unit: "ATSF-21", year: 2022, make: "Fontaine", type: "flatbed" },
        ],
      },
    ]

    const sharedCustomers = [
      { name: "Pacific Crest Logistics", type: "broker", mc: "784512", dot: null, phone: "(503) 555-1000", terms: 30, credit: 2500000, factored: true },
      { name: "Cascade Produce Co.", type: "shipper", mc: null, dot: "444222", phone: "(509) 555-1100", terms: 21, credit: 1800000, factored: false },
      { name: "Northwest Retail Freight", type: "broker", mc: "912334", dot: null, phone: "(206) 555-1200", terms: 30, credit: 3000000, factored: false },
      { name: "Mountain West Steel", type: "shipper", mc: null, dot: "555777", phone: "(801) 555-1300", terms: 15, credit: 2200000, factored: true },
      { name: "SlowPay Sample Brokerage", type: "broker", mc: "606060", dot: null, phone: "(602) 555-1400", terms: 45, credit: 900000, factored: false, slow: true },
      { name: "Blacklisted Sample Loads", type: "broker", mc: "999001", dot: null, phone: "(909) 555-1500", terms: 60, credit: 0, factored: false, blacklisted: true },
      { name: "Evergreen Cold Chain", type: "broker", mc: "432118", dot: null, phone: "(425) 555-1600", terms: 30, credit: 2600000, factored: true },
      { name: "Valley Distribution", type: "shipper", mc: null, dot: "777888", phone: "(559) 555-1700", terms: 21, credit: 1600000, factored: false },
    ]
    const loads = [
      ["quoted", "reefer", "Frozen vegetables", 42000, 320000, 35000, 870, 28, "dat", ["Kent", "WA", "Fresno", "CA"]],
      ["booked", "dry_van", "Retail fixtures", 26000, 210000, 18000, 420, 34, "direct", ["Tacoma", "WA", "Boise", "ID"]],
      ["dispatched", "flatbed", "Steel coils", 47000, 395000, 45000, 980, 64, "dat", ["Spokane", "WA", "Denver", "CO"], [{ label: "Tarp", amount_cents: 15000 }]],
      ["at_pickup", "reefer", "Apples", 41000, 245000, 26000, 510, 12, "direct", ["Yakima", "WA", "Portland", "OR"]],
      ["in_transit", "dry_van", "Paper goods", 31000, 285000, 30000, 640, 80, "dat", ["Seattle", "WA", "Reno", "NV"]],
      ["delivered", "flatbed", "Lumber", 44000, 365000, 40000, 760, 45, "direct", ["Portland", "OR", "Salt Lake City", "UT"]],
      ["pod_received", "reefer", "Dairy", 39500, 330000, 37000, 710, 18, "dat", ["Boise", "ID", "Sacramento", "CA"], [{ label: "Detention", amount_cents: 12000 }]],
      ["invoiced", "dry_van", "E-commerce freight", 28000, 250000, 24000, 540, 38, "dat", ["Kent", "WA", "Oakland", "CA"]],
      ["paid", "reefer", "Frozen seafood", 39000, 410000, 52000, 1120, 55, "direct", ["Seattle", "WA", "Los Angeles", "CA"]],
      ["settled", "flatbed", "Machinery", 45500, 455000, 60000, 1260, 70, "dat", ["Reno", "NV", "Missoula", "MT"], [{ label: "Layover", amount_cents: 15000 }]],
    ]

    let thindDriverRows = []
    for (const carrier of carriers) {
      carrier.customers = sharedCustomers
      carrier.loads = loads.map((l, i) => ({
        status: l[0],
        equipment: l[1],
        commodity: l[2],
        weight: l[3],
        linehaul: l[4],
        fsc: l[5],
        miles: l[6],
        deadhead: l[7],
        source: l[8],
        lane: l[9],
        accessorials: l[10] ?? [],
      }))
      const seeded = await seedCarrier(q, carrier)
      if (carrier.id === THIND) thindDriverRows = seeded.driverRows
    }

    const owner = await insertOne(
      q,
      `INSERT INTO hub.users (carrier_id, data_mode, email, password_hash, name, role, phone)
       VALUES ($1,'sandbox',$2,$3,'Sandbox Owner','owner','(206) 555-0199')
       RETURNING id`,
      [THIND, OWNER_EMAIL, hashOwner]
    )
    const dispatcher = await insertOne(
      q,
      `INSERT INTO hub.users (carrier_id, data_mode, email, password_hash, name, role, phone)
       VALUES ($1,'sandbox',$2,$3,'Sandbox Dispatcher','dispatcher','(206) 555-0198')
       RETURNING id`,
      [THIND, DISPATCH_EMAIL, hashDispatch]
    )
    const driverUser = await insertOne(
      q,
      `INSERT INTO hub.users (carrier_id, data_mode, email, password_hash, name, role, phone)
       VALUES ($1,'sandbox',$2,$3,'Sandbox Driver','driver','(206) 555-0197')
       RETURNING id`,
      [THIND, DRIVER_EMAIL, hashDriver]
    )
    if (thindDriverRows[0]?.id) {
      await q(`UPDATE hub.users SET driver_id = $2 WHERE id = $1`, [driverUser.id, thindDriverRows[0].id])
      await q(`UPDATE hub.drivers SET user_id = $2 WHERE id = $1`, [thindDriverRows[0].id, driverUser.id])
    }
    for (const userId of [owner.id, dispatcher.id, driverUser.id]) {
      for (const carrierId of [THIND, ATS]) {
        await q(
          `INSERT INTO hub.user_carrier_access (user_id, carrier_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [userId, carrierId]
        )
      }
    }

    await q("COMMIT")

    console.log("\n✓ HaulDesk sandbox seeded with two companies and real-feeling sample operations.")
    console.log("\nSANDBOX ONLY logins:")
    console.log(`  Owner:      ${OWNER_EMAIL} / ${OWNER_PASSWORD}`)
    console.log(`  Dispatcher: ${DISPATCH_EMAIL} / ${DISPATCH_PASSWORD}`)
    console.log(`  Driver PWA: ${DRIVER_EMAIL} / ${DRIVER_PASSWORD}`)
    console.log("\nNext:")
    console.log("  npm run dev:mobile")
    console.log("  Open the printed HTTPS URL on iPhone Safari.\n")
  } catch (error) {
    await q("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`Sandbox seed failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
