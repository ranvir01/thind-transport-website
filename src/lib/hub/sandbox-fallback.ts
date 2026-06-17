import type { Carrier, CarrierSettings } from "./settings"
import type { Customer, Driver, FuelTransaction, Invoice, Load, Trailer, Truck } from "./types"
import type { DashboardStats, ExpiringItem } from "./loads"
import type { AgingSummary } from "./invoices"
import type { AgingBucket } from "./money"
import { scoreLoadCandidate } from "./ranker"

export const THIND_SANDBOX_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
export const ATS_SANDBOX_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
export const SANDBOX_CARRIER_IDS = [THIND_SANDBOX_ID, ATS_SANDBOX_ID]

const today = new Date()
const isoDate = (offsetDays: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export const fallbackCarriers: Carrier[] = [
  {
    id: THIND_SANDBOX_ID,
    name: "SANDBOX Thind Transport LLC",
    legal_name: "Thind Transport LLC",
    display_name: "Thind",
    dot_number: "2523064",
    mc_number: "876103",
    phone: "(206) 765-6300",
    email: "sandbox-thind@example.invalid",
    address: "PO Box 5114, Kent, WA 98064",
    environment: "sandbox",
    invoice_prefix: "SB-TT-",
    logo_url: null,
    remit_to: "Cascade Sample Factoring\nPO Box 1000, Seattle, WA 98101",
    status: "active",
  },
  {
    id: ATS_SANDBOX_ID,
    name: "SANDBOX ATS Transport LLC",
    legal_name: "ATS Transport LLC",
    display_name: "ATS",
    dot_number: "SAMPLE",
    mc_number: "SAMPLE",
    phone: "(253) 410-7259",
    email: "sandbox-ats@example.invalid",
    address: "SAMPLE yard address",
    environment: "sandbox",
    invoice_prefix: "SB-ATS-",
    logo_url: null,
    remit_to: "Cascade Sample Factoring\nPO Box 1000, Seattle, WA 98101",
    status: "active",
  },
]

export const fallbackSettings: CarrierSettings = {
  invoice: { prefix: "SB-", nextNumber: 7001, defaultTermsDays: 30 },
  pay: { companyDriverPerMile: 0.65, ownerOperatorPercentage: 0.88, payLoadedMilesOnly: true },
  detention: { freeHours: 2, ratePerHourCents: 6000 },
  costPerMileCents: 185,
  fsc: { baseCentsPerGallon: 125, mpg: 6 },
  randomTesting: { drugPct: 50, alcoholPct: 10 },
  factoring: {
    company: "Cascade Sample Factoring",
    remitName: "Cascade Sample Factoring",
    remitAddress: "PO Box 1000, Seattle, WA 98101",
    email: "sandbox-factor@example.invalid",
  },
  notifications: { officeEmail: "sandbox-office@example.invalid" },
}

const loadRows = [
  ["quoted", "reefer", "Frozen vegetables", 320000, 35000, 870, 28, "Kent", "WA", "Fresno", "CA", "Pacific Crest Logistics", "Harpreet Singh", "TT-231"],
  ["booked", "dry_van", "Retail fixtures", 210000, 18000, 420, 34, "Tacoma", "WA", "Boise", "ID", "Northwest Retail Freight", "Manpreet Kaur", "TT-188"],
  ["dispatched", "flatbed", "Steel coils", 395000, 45000, 980, 64, "Spokane", "WA", "Denver", "CO", "Mountain West Steel", "Gurpreet Gill", "TT-245"],
  ["at_pickup", "reefer", "Apples", 245000, 26000, 510, 12, "Yakima", "WA", "Portland", "OR", "Cascade Produce Co.", "Amandeep Dhillon", "TT-207"],
  ["in_transit", "dry_van", "Paper goods", 285000, 30000, 640, 80, "Seattle", "WA", "Reno", "NV", "Evergreen Cold Chain", "Harpreet Singh", "TT-231"],
  ["delivered", "flatbed", "Lumber", 365000, 40000, 760, 45, "Portland", "OR", "Salt Lake City", "UT", "Valley Distribution", "Manpreet Kaur", "TT-188"],
  ["pod_received", "reefer", "Dairy", 330000, 37000, 710, 18, "Boise", "ID", "Sacramento", "CA", "Pacific Crest Logistics", "Gurpreet Gill", "TT-245"],
  ["invoiced", "dry_van", "E-commerce freight", 250000, 24000, 540, 38, "Kent", "WA", "Oakland", "CA", "SlowPay Sample Brokerage", "Amandeep Dhillon", "TT-207"],
  ["paid", "reefer", "Frozen seafood", 410000, 52000, 1120, 55, "Seattle", "WA", "Los Angeles", "CA", "Northwest Retail Freight", "Harpreet Singh", "TT-231"],
  ["settled", "flatbed", "Machinery", 455000, 60000, 1260, 70, "Reno", "NV", "Missoula", "MT", "Mountain West Steel", "Gurpreet Gill", "TT-245"],
] as const

export function fallbackLoads(carrierId: string): Load[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "TT"
  return loadRows.map((row, index) => ({
    id: `${prefix.toLowerCase()}-fallback-load-${index + 1}`,
    carrier_id: carrierId,
    reference: `${prefix}-${7000 + index}`,
    customer_reference: `BR-${prefix}-${9000 + index}`,
    customer_id: `${prefix.toLowerCase()}-customer-${index % 6}`,
    status: row[0],
    equipment: row[1],
    commodity: row[2],
    weight_lbs: 38000 + index * 750,
    linehaul_cents: row[3],
    fuel_surcharge_cents: row[4],
    accessorials: index % 3 === 0 ? [{ label: "Detention", amount_cents: 12000 }] : [],
    loaded_miles: row[5],
    deadhead_miles: row[6],
    truck_id: `${prefix.toLowerCase()}-truck-${index % 4}`,
    trailer_id: `${prefix.toLowerCase()}-trailer-${index % 4}`,
    driver_id: `${prefix.toLowerCase()}-driver-${index % 4}`,
    dispatcher_id: null,
    source: index % 2 === 0 ? "dat" : "direct",
    factored: index % 4 === 0,
    settlement_id: row[0] === "settled" ? `${prefix.toLowerCase()}-settlement-1` : null,
    notes: "Local no-database sandbox fallback row.",
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
    customer_name: row[11],
    driver_name: row[12],
    truck_unit: row[13],
    trailer_unit: `${prefix}-TR-${index + 1}`,
    origin_city: row[7],
    origin_state: row[8],
    dest_city: row[9],
    dest_state: row[10],
    doc_kinds: ["rate_confirmation", ...(index > 5 ? ["pod"] : [])],
    invoice_id: ["invoiced", "paid", "settled"].includes(row[0]) ? `${prefix.toLowerCase()}-invoice-${index}` : null,
    invoice_status: row[0] === "invoiced" ? "overdue" : row[0] === "paid" || row[0] === "settled" ? "paid" : null,
  }))
}

export function fallbackDashboardStats(carrierId: string): DashboardStats {
  const loads = fallbackLoads(carrierId)
  const openInvoices = fallbackInvoices(carrierId).filter((invoice) => invoice.status !== "paid")
  return {
    active_loads: loads.filter((load) => !["settled", "cancelled", "paid", "invoiced", "quoted"].includes(load.status)).length,
    in_transit: loads.filter((load) => load.status === "in_transit").length,
    awaiting_pod: loads.filter((load) => load.status === "delivered").length,
    revenue_month_cents: String(loads.reduce((sum, load) => sum + load.linehaul_cents + load.fuel_surcharge_cents, 0)),
    revenue_week_cents: String(loads.slice(0, 5).reduce((sum, load) => sum + load.linehaul_cents + load.fuel_surcharge_cents, 0)),
    trucks_active: 4,
    trucks_total: 4,
    drivers_active: 4,
    ar_open_cents: String(openInvoices.reduce((sum, invoice) => sum + invoice.amount_cents - (invoice.paid_cents ?? 0), 0)),
    settlement_due_cents: "501050",
  }
}

export function fallbackExpiringItems(carrierId: string): ExpiringItem[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "Thind"
  return [
    { entity: "driver", name: `${prefix} sample driver`, kind: "Medical Card", due: isoDate(-12), href: "/hub/drivers" },
    { entity: "company", name: `${prefix} company`, kind: "COI", due: isoDate(21), href: "/hub/compliance" },
    { entity: "truck", name: `${prefix} Truck 231`, kind: "Annual Inspection", due: isoDate(55), href: "/hub/fleet" },
  ]
}

export function fallbackDrivers(carrierId: string): Driver[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "TT"
  return ["Harpreet Singh", "Manpreet Kaur", "Gurpreet Gill", "Amandeep Dhillon"].map((name, index) => {
    const [first, last] = name.split(" ")
    return {
      id: `${prefix.toLowerCase()}-driver-${index}`,
      user_id: null,
      first_name: first,
      last_name: last,
      phone: `(206) 555-01${String(index).padStart(2, "0")}`,
      email: `${first.toLowerCase()}.sample@example.invalid`,
      cdl_number: `SAMPLE-${prefix}-${index + 1}`,
      cdl_state: "WA",
      cdl_expiry: isoDate(220 + index * 30),
      medical_card_expiry: index === 1 ? isoDate(-12) : isoDate(45 + index * 25),
      hire_date: isoDate(-400 - index * 60),
      pay_type: index % 2 === 0 ? "percentage" : "per_mile",
      pay_rate: index % 2 === 0 ? "0.8800" : "0.6500",
      pay_loaded_miles_only: true,
      escrow_weekly_cents: index % 2 === 0 ? 5000 : 0,
      insurance_weekly_cents: index % 2 === 0 ? 31200 : 0,
      status: "active",
      emergency_contact_name: null,
      emergency_contact_phone: null,
      notes: "Sandbox fallback 1099 driver.",
    }
  })
}

export function fallbackCustomers(carrierId: string): (Customer & { load_count: number; total_revenue_cents: string; avg_days_to_pay: string | null })[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "TT"
  const rows = [
    ["Pacific Crest Logistics", "broker", "784512", null, 30, 2500000, true, "active", 6, 1285000, "18"],
    ["Cascade Produce Co.", "shipper", null, "444222", 21, 1800000, false, "active", 4, 860000, "14"],
    ["Northwest Retail Freight", "broker", "912334", null, 30, 3000000, false, "active", 7, 1510000, "23"],
    ["Mountain West Steel", "shipper", null, "555777", 15, 2200000, true, "active", 3, 1260000, "12"],
    ["SlowPay Sample Brokerage", "broker", "606060", null, 45, 900000, false, "on_hold", 2, 520000, "58"],
    ["Blacklisted Sample Loads", "broker", "999001", null, 60, 0, false, "blacklisted", 1, 125000, null],
  ] as const
  return rows.map((row, index) => ({
    id: `${prefix.toLowerCase()}-customer-${index}`,
    name: row[0],
    type: row[1],
    mc_number: row[2],
    dot_number: row[3],
    billing_email: `ap+${String(row[0]).toLowerCase().replace(/[^a-z0-9]/g, "")}@example.invalid`,
    billing_address: `${100 + index} Sample AP Way, Seattle, WA`,
    phone: `(206) 555-1${String(index).padStart(3, "0")}`,
    payment_terms_days: row[4],
    credit_limit_cents: row[5],
    factored: row[6],
    status: row[7],
    notes: row[7] === "blacklisted" ? "Sandbox blacklist example." : row[7] === "on_hold" ? "Sandbox slow payer example." : "Sandbox customer.",
    load_count: row[8],
    total_revenue_cents: String(row[9]),
    avg_days_to_pay: row[10],
  }))
}

export function fallbackTrucks(carrierId: string): Truck[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "TT"
  return [
    ["231", 2024, "Freightliner", "Cascadia", "company"],
    ["188", 2022, "Volvo", "VNL", "owner_operator"],
    ["245", 2025, "Freightliner", "Cascadia", "company"],
    ["207", 2023, "Peterbilt", "579", "owner_operator"],
  ].map((row, index) => ({
    id: `${prefix.toLowerCase()}-truck-${index}`,
    unit_number: `${prefix}-${row[0]}`,
    vin: `SANDBOXVIN${prefix}${index}`,
    plate: `SB${prefix}${index}`,
    plate_state: "WA",
    year: Number(row[1]),
    make: String(row[2]),
    model: String(row[3]),
    ownership: row[4] as "company" | "owner_operator",
    status: "active",
    registration_expiry: isoDate(180 + index * 20),
    inspection_due: isoDate(45 + index * 12),
    insurance_expiry: isoDate(80 + index * 14),
    assigned_driver_id: `${prefix.toLowerCase()}-driver-${index}`,
    tank_capacity_gallons: 240,
    driver_name: fallbackDrivers(carrierId)[index]?.first_name + " " + fallbackDrivers(carrierId)[index]?.last_name,
    notes: "Sandbox fallback truck.",
  }))
}

export function fallbackTrailers(carrierId: string): Trailer[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "ATS" : "TT"
  return ["reefer", "dry_van", "flatbed", "dry_van"].map((type, index) => ({
    id: `${prefix.toLowerCase()}-trailer-${index}`,
    unit_number: `${prefix}-TR-${index + 1}`,
    vin: `SANDBOXTRL${prefix}${index}`,
    plate: `TR${prefix}${index}`,
    plate_state: "WA",
    year: 2021 + index,
    make: index % 2 ? "Wabash" : "Utility",
    type: type as "flatbed" | "reefer" | "dry_van",
    status: "active",
    registration_expiry: isoDate(220 + index * 15),
    inspection_due: isoDate(35 + index * 18),
    notes: "Sandbox fallback trailer.",
  }))
}

export function fallbackFuelTransactions(carrierId: string): FuelTransaction[] {
  const trucks = fallbackTrucks(carrierId)
  const drivers = fallbackDrivers(carrierId)
  return trucks.flatMap((truck, index) => {
    const gallons = 92.5 + index * 9
    const unit = 439 + index * 3
    return [
      {
        id: `${truck.id}-fuel-1`,
        source: "sandbox",
        external_id: `${truck.id}-EFS-1`,
        card_program: index % 2 ? "Comdata Sample" : "EFS Sample",
        truck_id: truck.id,
        driver_id: drivers[index % drivers.length]?.id ?? null,
        ts: new Date(Date.now() - index * 86400000).toISOString(),
        merchant: "Pacific Pride Sample",
        city: index % 2 ? "Portland" : "Boise",
        jurisdiction: index % 2 ? "OR" : "ID",
        gallons: gallons.toFixed(3),
        fuel_type: "diesel",
        unit_price_cents: unit,
        total_cents: Math.round(gallons * unit),
        odometer: String((truck.current_odometer ?? 180000) + index * 450),
        truck_unit: truck.unit_number,
        driver_name: drivers[index % drivers.length] ? `${drivers[index % drivers.length].first_name} ${drivers[index % drivers.length].last_name}` : null,
      },
      {
        id: `${truck.id}-fuel-2`,
        source: "sandbox",
        external_id: `${truck.id}-EFS-2`,
        card_program: "WEX Sample",
        truck_id: truck.id,
        driver_id: drivers[index % drivers.length]?.id ?? null,
        ts: new Date(Date.now() - (index + 4) * 86400000).toISOString(),
        merchant: "Love's Sample",
        city: index % 2 ? "Reno" : "Yakima",
        jurisdiction: index % 2 ? "NV" : "WA",
        gallons: (78.2 + index * 5).toFixed(3),
        fuel_type: "diesel",
        unit_price_cents: 421 + index * 2,
        total_cents: Math.round((78.2 + index * 5) * (421 + index * 2)),
        odometer: String((truck.current_odometer ?? 180000) + index * 850),
        truck_unit: truck.unit_number,
        driver_name: drivers[index % drivers.length] ? `${drivers[index % drivers.length].first_name} ${drivers[index % drivers.length].last_name}` : null,
      },
    ]
  })
}

export function fallbackComplianceEntries(carrierId: string) {
  const drivers = fallbackDrivers(carrierId)
  const trucks = fallbackTrucks(carrierId)
  return [
    ...drivers.flatMap((driver) => [
      {
        entity: "driver" as const,
        entityId: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        kind: "CDL",
        due: driver.cdl_expiry,
        color: new Date(driver.cdl_expiry ?? "") < new Date() ? "red" as const : "green" as const,
        href: `/hub/drivers/${driver.id}`,
      },
      {
        entity: "driver" as const,
        entityId: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        kind: "Medical card",
        due: driver.medical_card_expiry,
        color: new Date(driver.medical_card_expiry ?? "") < new Date() ? "red" as const : new Date(driver.medical_card_expiry ?? "").getTime() - Date.now() < 30 * 86400000 ? "amber" as const : "green" as const,
        href: `/hub/drivers/${driver.id}`,
      },
    ]),
    ...trucks.flatMap((truck) => [
      { entity: "truck" as const, entityId: truck.id, name: `Truck #${truck.unit_number}`, kind: "Registration", due: truck.registration_expiry, color: "green" as const, href: `/hub/fleet/trucks/${truck.id}` },
      { entity: "truck" as const, entityId: truck.id, name: `Truck #${truck.unit_number}`, kind: "Annual inspection (396.17)", due: truck.inspection_due, color: "amber" as const, href: `/hub/fleet/trucks/${truck.id}` },
    ]),
    { entity: "company" as const, entityId: null, name: "Company", kind: "COI", due: isoDate(21), color: "amber" as const, href: "/hub/compliance", manualItemId: "fallback-coi" },
    { entity: "company" as const, entityId: null, name: "Company", kind: "UCR", due: isoDate(120), color: "green" as const, href: "/hub/compliance", manualItemId: "fallback-ucr" },
  ]
}

export function fallbackInvoices(carrierId: string): Invoice[] {
  const prefix = carrierId === ATS_SANDBOX_ID ? "SB-ATS" : "SB-TT"
  return [
    ["current", "sent", 278000, 0, 10],
    ["1-30", "overdue", 330000, 0, -16],
    ["31-60", "overdue", 187500, 50000, -38],
    ["current", "paid", 410000, 410000, 18],
  ].map((row, index) => ({
    id: `${prefix.toLowerCase()}-invoice-${index}`,
    carrier_id: carrierId,
    number: `${prefix}-${7001 + index}`,
    customer_id: `${prefix.toLowerCase()}-customer-${index}`,
    load_id: `${prefix.toLowerCase()}-fallback-load-${index + 7}`,
    amount_cents: Number(row[2]),
    issued_on: isoDate(-20 - index * 5),
    due_on: isoDate(Number(row[4])),
    status: row[1] as Invoice["status"],
    factored: index % 2 === 0,
    remit_to: "Cascade Sample Factoring\nPO Box 1000, Seattle, WA 98101",
    factoring_fee_cents: index % 2 === 0 ? Math.round(Number(row[2]) * 0.03) : 0,
    factoring_reserve_cents: 0,
    expected_net_cents: index % 2 === 0 ? Number(row[2]) - Math.round(Number(row[2]) * 0.03) : Number(row[2]),
    pdf_url: null,
    sent_log: [],
    customer_name: index === 1 ? "SlowPay Sample Brokerage" : "Pacific Crest Logistics",
    load_reference: `${prefix}-70${index}`,
    paid_cents: Number(row[3]),
  }))
}

export function fallbackAgingSummary(carrierId: string): AgingSummary {
  const buckets: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }
  const invoices = fallbackInvoices(carrierId)
    .filter((invoice) => invoice.status !== "paid")
    .map((invoice) => {
      const open_cents = invoice.amount_cents - (invoice.paid_cents ?? 0)
      const due = new Date(invoice.due_on)
      const daysPast = Math.floor((Date.now() - due.getTime()) / 86400000)
      const bucket: AgingBucket = daysPast <= 0 ? "current" : daysPast <= 30 ? "1-30" : daysPast <= 60 ? "31-60" : daysPast <= 90 ? "61-90" : "90+"
      buckets[bucket] += open_cents
      return { ...invoice, bucket, open_cents }
    })
  return {
    buckets,
    totalOpenCents: invoices.reduce((sum, invoice) => sum + invoice.open_cents, 0),
    invoices,
  }
}

export function fallbackCandidates(carrierId: string) {
  return [
    ["DAT", "Cascade Produce", "reefer", "Kent", "WA", "Fresno", "CA", 340000, 42000, 870, 26, "strong", "good", 18, false],
    ["Uber Freight", "PNW Retail", "dry_van", "Portland", "OR", "Reno", "NV", 275000, 26000, 575, 118, "average", "neutral", 28, false],
    ["DAT", "Mountain Steel", "flatbed", "Spokane", "WA", "Denver", "CO", 410000, 50000, 1120, 72, "strong", "neutral", 15, false],
    ["Direct", "Valley Foods", "reefer", "Seattle", "WA", "Boise", "ID", 230000, 22000, 510, 18, "average", "good", 21, false],
    ["DAT", "Slow Pay Sample", "dry_van", "Tacoma", "WA", "Phoenix", "AZ", 395000, 44000, 1410, 34, "weak", "bad", 58, false],
  ].map((row, index) => ({
    id: `${carrierId}-candidate-${index}`,
    carrier_id: carrierId,
    data_mode: "sandbox",
    source: row[0],
    broker_name: row[1],
    equipment: row[2],
    origin_city: row[3],
    origin_state: row[4],
    dest_city: row[5],
    dest_state: row[6],
    linehaul_cents: Number(row[7]),
    fuel_surcharge_cents: Number(row[8]),
    loaded_miles: Number(row[9]),
    deadhead_miles: Number(row[10]),
    score: scoreLoadCandidate({
      linehaulCents: Number(row[7]),
      fuelSurchargeCents: Number(row[8]),
      loadedMiles: Number(row[9]),
      deadheadMiles: Number(row[10]),
      dieselCentsPerGallon: 435,
      mpg: 6,
      estimatedTollsCents: index === 4 ? 32000 : 8500 + index * 2500,
      hosHoursRemaining: 8 - index,
      laneStrength: row[11] as "strong" | "average" | "weak",
      homeTimeFit: row[12] as "good" | "neutral" | "bad",
      customerPaymentDays: Number(row[13]),
      blacklisted: Boolean(row[14]),
      equipmentMatch: true,
    }),
  }))
}
