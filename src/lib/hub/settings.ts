import { query, queryOne } from "./db"

/** Typed carrier settings (stored as JSONB; merged over defaults on read). */
export interface CarrierSettings {
  invoice: { prefix: string; nextNumber: number; defaultTermsDays: number }
  pay: { companyDriverPerMile: number; ownerOperatorPercentage: number; payLoadedMilesOnly: boolean }
  detention: { freeHours: number; ratePerHourCents: number }
  costPerMileCents: number
  fsc: { baseCentsPerGallon: number; mpg: number }
  randomTesting: { drugPct: number; alcoholPct: number }
  factoring: { company: string | null; remitName: string | null; remitAddress: string | null; email: string | null }
  notifications: { officeEmail: string | null }
  /** Per-tenant branding (Phase 7). Written by setBrandAccentAction; not yet rendered anywhere. */
  branding: { accent: string | null }
}

export const DEFAULT_SETTINGS: CarrierSettings = {
  invoice: { prefix: "INV-", nextNumber: 1000, defaultTermsDays: 30 },
  pay: { companyDriverPerMile: 0.6, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true },
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
    pay: { ...DEFAULT_SETTINGS.pay, ...stored.pay },
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
