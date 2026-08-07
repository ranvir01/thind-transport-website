"use server"

/**
 * Tenant onboarding (Phase 7/M11): a new carrier creates its own workspace
 * self-serve — company facts, owner account, sensible defaults — and lands on
 * a getting-started checklist that walks them to fully live. No sales call.
 */
import bcrypt from "bcrypt"
import { hubDb, queryOne } from "@/lib/hub/db"
import { isLockedOut, recordAttempt } from "@/lib/hub/auth-throttle"
import { acceptDriverInvite } from "@/lib/hub/driver-invite"
import { getHubUser, requireOwner } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import { dollarsToCents } from "@/lib/hub/types"
import {
  carrierAllowedToOperate,
  carrierAuthorityStatus,
  extractQcCarrier,
} from "@/lib/hub/vetting-fmcsa"

interface Result {
  ok: boolean
  error?: string
}

// Detention is billed from the price book AND accrued from settings — seed both
// from one number so a new tenant never invoices a different rate than it accrues.
const DEFAULT_DETENTION_CENTS_PER_HOUR = 6000

/**
 * Accessorial price book seeded for every new workspace (industry-typical,
 * all editable in Settings → Price Book). Without this, "Add accessorial"
 * on the first booked load offers an empty list.
 */
const DEFAULT_PRICE_BOOK: ReadonlyArray<{ name: string; amountCents: number; unit: string }> = [
  { name: "Detention", amountCents: DEFAULT_DETENTION_CENTS_PER_HOUR, unit: "per_hour" },
  { name: "Layover", amountCents: 25000, unit: "per_day" },
  { name: "TONU", amountCents: 20000, unit: "flat" },
  { name: "Stop-off", amountCents: 10000, unit: "flat" },
  { name: "Tarp", amountCents: 10000, unit: "flat" },
  { name: "Lumper", amountCents: 0, unit: "pass_through" },
]

/**
 * Signup is unauthenticated and each call inserts a carrier + settings + price
 * book + owner user, so it gets the same throttle login has (5 per 15 minutes),
 * keyed on the email AND on the caller's IP — the email key alone would not
 * slow a bot cycling fresh addresses. Generic message on purpose: a throttle
 * response must not hint at whether an account exists.
 */
const SIGNUP_THROTTLED = "Too many signup attempts — try again in a few minutes"

/** Best-effort caller IP; unavailable (non-request context) just drops that key. */
async function signupThrottleKeys(email: string): Promise<string[]> {
  const keys = [`email:${email}`]
  try {
    const { headers } = await import("next/headers")
    const h = await headers()
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim()
    if (ip && ip.length <= 64) keys.push(`ip:${ip}`)
  } catch {
    /* no request headers available — the email key still applies */
  }
  return keys
}

export interface CarrierAuthorityCheck {
  legalName: string | null
  dbaName: string | null
  allowedToOperate: boolean | null
  authorityStatus: string | null
}

/**
 * Live DOT/MC lookup at signup time (FMCSA QCMobile, phase-7.md M11 step 1).
 * Pre-auth and non-persisting — a failed or unconfigured lookup just falls
 * back to manual entry, it never blocks workspace creation.
 */
export async function verifyCarrierAuthorityAction(input: {
  dotNumber?: string
  mcNumber?: string
}): Promise<{ ok: boolean; result: CarrierAuthorityCheck | null; error?: string }> {
  const webKey = process.env.FMCSA_WEBKEY
  if (!webKey) return { ok: false, result: null, error: "Live verification isn't configured" }
  const dot = input.dotNumber?.trim()
  const mc = input.mcNumber?.trim()
  if (!dot && !mc) return { ok: false, result: null, error: "Enter a DOT or MC number first" }

  const base = "https://mobile.fmcsa.dot.gov/qc/services/carriers"
  const urls: string[] = []
  if (mc) urls.push(`${base}/docket-number/${encodeURIComponent(mc)}?webKey=${webKey}`)
  if (dot) urls.push(`${base}/${encodeURIComponent(dot)}?webKey=${webKey}`)

  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) continue
      const json = await response.json()
      const carrier = extractQcCarrier(json)
      if (carrier) {
        return {
          ok: true,
          result: {
            legalName: carrier.legalName ?? null,
            dbaName: carrier.dbaName ?? null,
            allowedToOperate: carrierAllowedToOperate(carrier),
            authorityStatus: carrierAuthorityStatus(carrier),
          },
        }
      }
    } catch {
      /* try the next identifier */
    }
  }
  return { ok: false, result: null, error: "No FMCSA record found for that DOT/MC" }
}

export async function createWorkspaceAction(input: {
  companyName: string
  dotNumber?: string
  mcNumber?: string
  phone?: string
  ownerName: string
  email: string
  password: string
  /** Optional brand accent picked in the wizard; invalid values are dropped, never block signup. */
  accent?: string
  /** Company-driver rate in dollars per mile (wizard pay step). Omitted → standard default. */
  payPerMile?: number
  /** Owner-operator share as a percent, 1–100 (wizard pay step). Omitted → standard default. */
  ownerOperatorPct?: number
}): Promise<Result> {
  if (!input.companyName.trim()) return { ok: false, error: "What's the company called?" }
  if (!input.ownerName.trim()) return { ok: false, error: "Your name is needed" }
  if (!input.email.includes("@")) return { ok: false, error: "Enter a real email" }
  if ((input.password ?? "").length < 8) return { ok: false, error: "Password needs 8+ characters" }
  // Pay is money, not cosmetics: a provided-but-nonsense value is an error, never a silent default.
  if (input.payPerMile !== undefined &&
      (!Number.isFinite(input.payPerMile) || input.payPerMile <= 0 || input.payPerMile > 5)) {
    return { ok: false, error: "Company driver rate looks off — enter dollars per mile, like 0.60" }
  }
  if (input.ownerOperatorPct !== undefined &&
      (!Number.isFinite(input.ownerOperatorPct) || input.ownerOperatorPct < 1 || input.ownerOperatorPct > 100)) {
    return { ok: false, error: "Owner-operator share must be between 1 and 100 percent" }
  }

  // Throttle before any query: everything below this line costs database work.
  const throttleKeys = await signupThrottleKeys(input.email.trim().toLowerCase())
  for (const key of throttleKeys) {
    if (await isLockedOut(key, "signup")) return { ok: false, error: SIGNUP_THROTTLED }
  }
  // Charged up front, so an attempt that times out or throws still counts.
  for (const key of throttleKeys) await recordAttempt(key, false, "signup")

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE email = $1`,
    [input.email.toLowerCase()]
  )
  if (existing) return { ok: false, error: "That email already has an account — sign in instead" }

  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    const { rows: carrierRows } = await client.query(
      `INSERT INTO hub.carriers (name, dot_number, mc_number, phone, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        input.companyName.trim(), input.dotNumber?.trim() || null, input.mcNumber?.trim() || null,
        input.phone?.trim() || null, input.email.toLowerCase(),
      ]
    )
    const carrierId = carrierRows[0].id as string
    const prefix = input.companyName.trim().replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "LD"
    const accent = /^#[0-9a-fA-F]{6}$/.test(input.accent ?? "") ? input.accent : null
    // Cents, per AGENTS.md. input.payPerMile is dollars off the signup form.
    const perMileCents = input.payPerMile !== undefined ? dollarsToCents(input.payPerMile) : 60
    const ooShare = input.ownerOperatorPct !== undefined ? Math.round(input.ownerOperatorPct * 100) / 10000 : 0.9
    await client.query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings) VALUES ($1, $2)`,
      [
        carrierId,
        JSON.stringify({
          invoice: { prefix: `${prefix}-INV-`, nextNumber: 1001, defaultTermsDays: 30 },
          pay: { companyDriverPerMileCents: perMileCents, ownerOperatorPercentage: ooShare, payLoadedMilesOnly: true },
          detention: { freeHours: 2, ratePerHourCents: DEFAULT_DETENTION_CENTS_PER_HOUR },
          costPerMileCents: 234,
          fsc: { baseCentsPerGallon: 125, mpg: 6.0 },
          randomTesting: { drugPct: 50, alcoholPct: 10 },
          factoring: { company: null, remitName: null, remitAddress: null, email: null },
          notifications: { officeEmail: input.email.toLowerCase() },
          ...(accent ? { branding: { accent } } : {}),
        }),
      ]
    )
    for (const item of DEFAULT_PRICE_BOOK) {
      await client.query(
        `INSERT INTO hub.accessorial_types (carrier_id, name, default_amount_cents, unit)
         VALUES ($1,$2,$3,$4) ON CONFLICT (carrier_id, name) DO NOTHING`,
        [carrierId, item.name, item.amountCents, item.unit]
      )
    }
    const hash = await bcrypt.hash(input.password, 10)
    await client.query(
      `INSERT INTO hub.users (carrier_id, email, password_hash, name, role)
       VALUES ($1,$2,$3,$4,'owner')`,
      [carrierId, input.email.toLowerCase(), hash, input.ownerName.trim()]
    )
    await client.query("COMMIT")
    await logAudit({
      carrierId, actorName: input.ownerName.trim(),
      entityType: "carrier", entityId: carrierId, action: "workspace_created",
      newValue: { name: input.companyName.trim() },
    })
    return { ok: true }
  } catch (err) {
    await client.query("ROLLBACK")
    return actionError(err, "Could not create the workspace")
  } finally {
    client.release()
  }
}

export interface GettingStarted {
  trucks: boolean
  drivers: boolean
  customers: boolean
  loads: boolean
  packet: boolean
  fuel: boolean
}

/** Which getting-started steps are done (drives the new-carrier checklist). */
export async function gettingStartedState(): Promise<GettingStarted | null> {
  const user = await getHubUser()
  if (!user) return null
  const row = await queryOne<{ trucks: string; drivers: string; customers: string; loads: string; packet: string; fuel: string }>(
    `SELECT
       (SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL) AS trucks,
       (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL) AS drivers,
       (SELECT COUNT(*) FROM hub.customers WHERE carrier_id = $1 AND deleted_at IS NULL) AS customers,
       (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL) AS loads,
       (SELECT COUNT(*) FROM hub.documents WHERE carrier_id = $1 AND entity_type = 'carrier') AS packet,
       (SELECT COUNT(*) FROM hub.fuel_transactions WHERE carrier_id = $1) AS fuel`,
    [user.carrierId]
  )
  if (!row) return null
  return {
    trucks: Number(row.trucks) > 0,
    drivers: Number(row.drivers) > 0,
    customers: Number(row.customers) > 0,
    loads: Number(row.loads) > 0,
    packet: Number(row.packet) > 0,
    fuel: Number(row.fuel) > 0,
  }
}

/** Public: a driver accepts their app invite (token-gated; no session required). */
export async function acceptDriverInviteAction(
  token: string,
  input: { password: string }
): Promise<Result & { email?: string }> {
  if ((input.password ?? "").length < 8) return { ok: false, error: "Password needs 8+ characters" }
  try {
    return await acceptDriverInvite(token, { password: input.password })
  } catch (err) {
    return actionError(err, "Could not create the account")
  }
}

/** Owner sets the workspace accent color (per-tenant branding, Phase 7). */
export async function setBrandAccentAction(accent: string | null): Promise<Result> {
  try {
    const user = await requireOwner()
    if (accent !== null && !/^#[0-9a-fA-F]{6}$/.test(accent)) return { ok: false, error: "Pick a color" }
    const { query } = await import("@/lib/hub/db")
    if (accent === null) {
      // Reset to the standard look: delete the key instead of storing null so
      // the read path's defaulting stays the single meaning of "unset". No
      // upsert needed — a carrier with no row/parent is already reset.
      await query(
        `UPDATE hub.carrier_settings
         SET settings = settings #- '{branding,accent}', updated_at = NOW()
         WHERE carrier_id = $1`,
        [user.carrierId]
      )
      return { ok: true }
    }
    // jsonb_set can't create the missing '{branding}' parent key (it returns
    // the target unchanged), so seed the parent first; the upsert also covers
    // a carrier with no settings row at all.
    await query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, jsonb_build_object('branding', jsonb_build_object('accent', $2::text)))
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = jsonb_set(
           jsonb_set(hub.carrier_settings.settings, '{branding}',
             COALESCE(hub.carrier_settings.settings->'branding', '{}'::jsonb), TRUE),
           '{branding,accent}', to_jsonb($2::text), TRUE),
         updated_at = NOW()`,
      [user.carrierId, accent]
    )
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not save")
  }
}
