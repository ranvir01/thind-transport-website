import { query, queryOne } from "./db"

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
  costPerMileCents: number
  fsc: { baseCentsPerGallon: number; mpg: number }
  randomTesting: { drugPct: number; alcoholPct: number }
  factoring: { company: string | null; remitName: string | null; remitAddress: string | null; email: string | null }
  notifications: { officeEmail: string | null }
  /** Per-tenant branding (Phase 7). Written by setBrandAccentAction; rendered on PDFs, the customer
   * portal chrome, and the driver PWA nav (each via its own accent-resolution helper). */
  branding: { accent: string | null }
}

export const DEFAULT_SETTINGS: CarrierSettings = {
  invoice: { prefix: "INV-", nextNumber: 1000, defaultTermsDays: 30, autoInvoiceOnPod: true },
  pay: { companyDriverPerMileCents: 60, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true },
  detention: { freeHours: 2, ratePerHourCents: 6000 },
  costPerMileCents: 185,
  fsc: { baseCentsPerGallon: 125, mpg: 6.0 },
  randomTesting: { drugPct: 50, alcoholPct: 10 },
  factoring: { company: null, remitName: null, remitAddress: null, email: null },
  notifications: { officeEmail: null },
  branding: { accent: null },
}

export interface Carrier {
  id: string
  name: string
  dot_number: string | null
  mc_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  status: "active" | "suspended"
}

export async function getCarrier(carrierId: string): Promise<Carrier | null> {
  return queryOne<Carrier>(`SELECT * FROM hub.carriers WHERE id = $1`, [carrierId])
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
    merged.companyDriverPerMileCents = Math.round(stored.companyDriverPerMile * 100)
  }
  return merged
}

export async function getCarrierSettings(carrierId: string): Promise<CarrierSettings> {
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
  }
}

/** Atomically reserve the next invoice number for a carrier. */
export async function nextInvoiceNumber(carrierId: string): Promise<string> {
  const rows = await query<{ settings: { invoice?: { prefix?: string; nextNumber?: number } } }>(
    `UPDATE hub.carrier_settings
     SET settings = jsonb_set(settings, '{invoice,nextNumber}',
       (COALESCE((settings->'invoice'->>'nextNumber')::int, 1000) + 1)::text::jsonb),
       updated_at = NOW()
     WHERE carrier_id = $1
     RETURNING settings`,
    [carrierId]
  )
  const settings = rows[0]?.settings
  const reserved = (settings?.invoice?.nextNumber ?? 1001) - 1
  const prefix = settings?.invoice?.prefix ?? DEFAULT_SETTINGS.invoice.prefix
  return `${prefix}${reserved}`
}
