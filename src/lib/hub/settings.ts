import { hubDbAvailable, query, queryOne } from "./db"
import { fallbackCarriers, fallbackSettings } from "./sandbox-fallback"
import { dollarsToCents } from "./types"

/** Typed carrier settings (stored as JSONB; merged over defaults on read). */
export interface CarrierSettings {
  invoice: {
    prefix: string
    nextNumber: number
    defaultTermsDays: number
    /**
     * Draft an invoice automatically once a load has a POD in hand.
     * The cron only ever CREATES the draft — it never emails the customer;
     * sending stays a human action on /hub/money. Set false to go back to
     * invoicing entirely by hand.
     */
    autoInvoiceOnPod: boolean
  }
  pay: {
    /**
     * Default company-driver rate, in INTEGER CENTS per mile (AGENTS.md:
     * "Money is integer cents everywhere"). Was `companyDriverPerMile`, a
     * fractional-dollar number — the single most-carried item in the backlog.
     * pay-rules.ts absorbed it with Math.round(rate * 100), so live loss was
     * about zero, but every new consumer had to remember the conversion and
     * a half-cent rate had no representation at all.
     * Migration 024 rewrites stored settings; getCarrierSettings below still
     * reads the legacy key so a row written by an older deploy keeps working.
     */
    companyDriverPerMileCents: number
    /** A share of linehaul, not money — 0.9 = 90%. Stays a ratio. */
    ownerOperatorPercentage: number
    payLoadedMilesOnly: boolean
  }
  detention: { freeHours: number; ratePerHourCents: number }
  /**
   * All-in operating cost assumption, integer cents per mile. The dispatch
   * board prices margin as revenue - miles x this, and lanes.ts ranks every
   * lane by it, so it is the single constant behind every margin figure in
   * the product.
   *
   * Default is ATRI's 2024 marginal-cost-of-trucking all-in figure ($2.336/mi
   * -> 234c). It shipped as 185c, which is below driver pay plus fuel alone at
   * any realistic rate, so every margin the product showed was flattered.
   * /hub/settings/operating-cost measures the carrier's own figure from their
   * fuel, maintenance, tolls, expenses and settlements so this can be set from
   * data rather than from either constant.
   */
  costPerMileCents: number
  fsc: { baseCentsPerGallon: number; mpg: number }
  randomTesting: { drugPct: number; alcoholPct: number }
  factoring: {
    company: string | null
    remitName: string | null
    remitAddress: string | null
    email: string | null
    feeBps?: number | null
    reserveBps?: number | null
  }
  notifications: { officeEmail: string | null }
  /** Per-tenant branding (Phase 7). Written by setBrandAccentAction; rendered on PDFs, the customer
   * portal chrome, and the driver PWA nav (each via its own accent-resolution helper). */
  branding: { accent: string | null }
  driverApp: {
    /**
     * Show a driver what each run pays them, on the load card and as a
     * running weekly total.
     *
     * Default ON: a driver who cannot see what the work is worth until the
     * office cuts a settlement is being asked to take it on trust. But pay
     * transparency is a real difference between carriers — some deliberately
     * keep per-load pay in the office until payroll — so it is a switch, not
     * an assumption. It gates the driver's OWN pay only; the linehaul is
     * never shown either way.
     */
    showRunPay: boolean
  }
}

export const DEFAULT_SETTINGS: CarrierSettings = {
  invoice: { prefix: "INV-", nextNumber: 1000, defaultTermsDays: 30, autoInvoiceOnPod: true },
  pay: { companyDriverPerMileCents: 60, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true },
  detention: { freeHours: 2, ratePerHourCents: 6000 },
  costPerMileCents: 234,
  fsc: { baseCentsPerGallon: 125, mpg: 6.0 },
  randomTesting: { drugPct: 50, alcoholPct: 10 },
  factoring: { company: null, remitName: null, remitAddress: null, email: null },
  notifications: { officeEmail: null },
  branding: { accent: null },
  driverApp: { showRunPay: true },
}

export interface Carrier {
  id: string
  name: string
  legal_name: string | null
  display_name: string | null
  dot_number: string | null
  mc_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  environment: "production" | "sandbox"
  invoice_prefix: string | null
  logo_url: string | null
  remit_to: string | null
  status: "active" | "suspended"
}

export async function getCarrier(carrierId: string): Promise<Carrier | null> {
  if (!hubDbAvailable()) return fallbackCarriers.find((carrier) => carrier.id === carrierId) ?? fallbackCarriers[0]
  return queryOne<Carrier>(`SELECT * FROM hub.carriers WHERE id = $1`, [carrierId])
}

export async function listCarriers(carrierIds: string[]): Promise<Carrier[]> {
  if (!hubDbAvailable()) {
    const allowed = new Set(carrierIds)
    return fallbackCarriers.filter((carrier) => allowed.has(carrier.id))
  }
  if (carrierIds.length === 0) return []
  return query<Carrier>(
    `SELECT * FROM hub.carriers WHERE id = ANY($1::uuid[]) ORDER BY environment DESC, display_name NULLS LAST, name`,
    [carrierIds]
  )
}

/**
 * Reads either shape. A tenant whose settings row still holds the legacy
 * fractional-dollar `companyDriverPerMile` (written before migration 024, or by
 * an older deploy still live during a rollout) is converted on read rather than
 * silently falling back to the 60-cent default, which would quietly re-rate
 * every driver imported afterwards.
 */
function mergePay(
  stored: (Partial<CarrierSettings["pay"]> & { companyDriverPerMile?: number }) | undefined
): CarrierSettings["pay"] {
  const merged = { ...DEFAULT_SETTINGS.pay, ...stored }
  if (stored?.companyDriverPerMileCents == null && typeof stored?.companyDriverPerMile === "number") {
    // dollarsToCents, not a bare Math.round(x * 100): this path must agree
    // with what migration 024 rewrites the same row to (exact numeric
    // ROUND(x * 100)). A half-cent tie like 0.565 drifts to 56.499… as a
    // double — bare rounding read 56¢ where the migration writes 57¢, so the
    // tenant's default rate changed by a cent the day the migration ran.
    merged.companyDriverPerMileCents = dollarsToCents(stored.companyDriverPerMile)
  }
  return merged
}

export async function getCarrierSettings(carrierId: string): Promise<CarrierSettings> {
  if (!hubDbAvailable()) return fallbackSettings
  const row = await queryOne<{ settings: Partial<CarrierSettings> }>(
    `SELECT settings FROM hub.carrier_settings WHERE carrier_id = $1`,
    [carrierId]
  )
  const stored = row?.settings ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    invoice: { ...DEFAULT_SETTINGS.invoice, ...stored.invoice },
    pay: mergePay(stored.pay),
    detention: { ...DEFAULT_SETTINGS.detention, ...stored.detention },
    fsc: { ...DEFAULT_SETTINGS.fsc, ...stored.fsc },
    randomTesting: { ...DEFAULT_SETTINGS.randomTesting, ...stored.randomTesting },
    factoring: { ...DEFAULT_SETTINGS.factoring, ...stored.factoring },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...stored.notifications },
    branding: { ...DEFAULT_SETTINGS.branding, ...stored.branding },
    driverApp: { ...DEFAULT_SETTINGS.driverApp, ...stored.driverApp },
  }
}

/**
 * Atomically reserve the next invoice number for a carrier.
 *
 * Upsert, not a bare UPDATE: jsonb_set('{invoice,nextNumber}') cannot create
 * the missing `invoice` parent, and a missing carrier_settings row matched
 * 0 rows. Both paths returned INV-1000 every time; the second invoice then
 * hit UNIQUE (carrier_id, number). Sparse INSERTs from saveCostPerMileAction /
 * updateOfficeEmailAction / setBrandAccentAction made the parent-missing
 * case the likely one. Same INSERT…ON CONFLICT + parent-seed form as those.
 */
export async function nextInvoiceNumber(carrierId: string): Promise<string> {
  const rows = await query<{ settings: { invoice?: { prefix?: string; nextNumber?: number | string } } }>(
    `INSERT INTO hub.carrier_settings (carrier_id, settings)
     VALUES ($1, jsonb_build_object('invoice', jsonb_build_object('nextNumber', 1001)))
     ON CONFLICT (carrier_id) DO UPDATE SET
       settings = jsonb_set(
         jsonb_set(
           hub.carrier_settings.settings, '{invoice}',
           COALESCE(hub.carrier_settings.settings->'invoice', '{}'::jsonb), TRUE),
         '{invoice,nextNumber}',
         (COALESCE((hub.carrier_settings.settings->'invoice'->>'nextNumber')::int, 1000) + 1)::text::jsonb,
         TRUE),
       updated_at = NOW()
     RETURNING settings`,
    [carrierId]
  )
  const settings = rows[0]?.settings
  if (!settings) {
    throw new Error("Could not reserve an invoice number")
  }
  const reserved = Number(settings.invoice?.nextNumber ?? 1001) - 1
  const prefix = settings.invoice?.prefix ?? DEFAULT_SETTINGS.invoice.prefix
  return `${prefix}${reserved}`
}
