"use server"

/**
 * Tenant onboarding (Phase 7/M11): a new carrier creates its own workspace
 * self-serve — company facts, owner account, sensible defaults — and lands on
 * a getting-started checklist that walks them to fully live. No sales call.
 */
import bcrypt from "bcrypt"
import { hubDb, queryOne } from "@/lib/hub/db"
import { getHubUser, requireOwner } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"

interface Result {
  ok: boolean
  error?: string
}

export async function createWorkspaceAction(input: {
  companyName: string
  dotNumber?: string
  mcNumber?: string
  phone?: string
  ownerName: string
  email: string
  password: string
}): Promise<Result> {
  if (!input.companyName.trim()) return { ok: false, error: "What's the company called?" }
  if (!input.ownerName.trim()) return { ok: false, error: "Your name is needed" }
  if (!input.email.includes("@")) return { ok: false, error: "Enter a real email" }
  if ((input.password ?? "").length < 8) return { ok: false, error: "Password needs 8+ characters" }

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
    await client.query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings) VALUES ($1, $2)`,
      [
        carrierId,
        JSON.stringify({
          invoice: { prefix: `${prefix}-INV-`, nextNumber: 1001, defaultTermsDays: 30 },
          pay: { companyDriverPerMile: 0.6, ownerOperatorPercentage: 0.9, payLoadedMilesOnly: true },
          detention: { freeHours: 2, ratePerHourCents: 6000 },
          costPerMileCents: 185,
          fsc: { baseCentsPerGallon: 125, mpg: 6.0 },
          randomTesting: { drugPct: 50, alcoholPct: 10 },
          factoring: { company: null, remitName: null, remitAddress: null, email: null },
          notifications: { officeEmail: input.email.toLowerCase() },
        }),
      ]
    )
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
    return { ok: false, error: err instanceof Error ? err.message : "Could not create the workspace" }
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
}

/** Which getting-started steps are done (drives the new-carrier checklist). */
export async function gettingStartedState(): Promise<GettingStarted | null> {
  const user = await getHubUser()
  if (!user) return null
  const row = await queryOne<{ trucks: string; drivers: string; customers: string; loads: string; packet: string }>(
    `SELECT
       (SELECT COUNT(*) FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL) AS trucks,
       (SELECT COUNT(*) FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL) AS drivers,
       (SELECT COUNT(*) FROM hub.customers WHERE carrier_id = $1 AND deleted_at IS NULL) AS customers,
       (SELECT COUNT(*) FROM hub.loads WHERE carrier_id = $1 AND deleted_at IS NULL) AS loads,
       (SELECT COUNT(*) FROM hub.documents WHERE carrier_id = $1 AND entity_type = 'carrier') AS packet`,
    [user.carrierId]
  )
  if (!row) return null
  return {
    trucks: Number(row.trucks) > 0,
    drivers: Number(row.drivers) > 0,
    customers: Number(row.customers) > 0,
    loads: Number(row.loads) > 0,
    packet: Number(row.packet) > 0,
  }
}

/** Owner sets the workspace accent color (per-tenant branding, Phase 7). */
export async function setBrandAccentAction(accent: string): Promise<Result> {
  try {
    const user = await requireOwner()
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return { ok: false, error: "Pick a color" }
    const { query } = await import("@/lib/hub/db")
    await query(
      `UPDATE hub.carrier_settings SET settings = jsonb_set(settings, '{branding,accent}', to_jsonb($2::text), TRUE), updated_at = NOW()
       WHERE carrier_id = $1`,
      [user.carrierId, accent]
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" }
  }
}
