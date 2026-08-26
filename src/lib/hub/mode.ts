/**
 * Two-mode running state for HaulDesk.
 *
 * SIMULATION (default): generated data, SIMULATION badge, watermarked PDFs,
 * outbound email echoed to hub.email_outbox, live integrations forced off.
 * LEGIT: empty (or owner-entered) data; guards lift as credentials land.
 *
 * Env override HAULDESK_MODE=simulation|legit wins for tests/scripts.
 * Fail-closed for outbound email (treat unknown as simulation). Live
 * integrations fail-open if the table is missing so unit tests that never
 * migrated still exercise adapters.
 */
import { query, queryOne } from "./db"

export const SIM_WATERMARK = "SIMULATION — NOT A REAL DOCUMENT"

export const THIND_CARRIER_ID = "11111111-1111-1111-1111-111111111111"
export const ATS_CARRIER_ID = "22222222-2222-2222-2222-222222222222"

export const SIM_TENANTS = [
  { id: THIND_CARRIER_ID, key: "thind" as const, name: "Thind Transport LLC" },
  { id: ATS_CARRIER_ID, key: "ats" as const, name: "ATS Transport LLC" },
] as const

export type AppMode = "simulation" | "legit"
export type SimView = "thind" | "ats" | "all"

export interface PlatformState {
  mode: AppMode
  sim_seed: string | null
  sim_clock_date: string | null
  generated_at: string | null
}

function envOverride(): AppMode | null {
  const raw = process.env.HAULDESK_MODE?.trim().toLowerCase()
  if (raw === "legit" || raw === "simulation") return raw
  return null
}

export async function readPlatformState(): Promise<PlatformState | null> {
  try {
    return await queryOne<PlatformState>(
      `SELECT mode, sim_seed, sim_clock_date::text, generated_at::text
       FROM hub.platform_state WHERE id = 1`
    )
  } catch {
    return null
  }
}

/** Fail-closed: if we cannot prove legit, we are in simulation. */
export async function isSimulation(): Promise<boolean> {
  const env = envOverride()
  if (env) return env === "simulation"
  const row = await readPlatformState()
  return row?.mode !== "legit"
}

export async function getAppMode(): Promise<AppMode> {
  return (await isSimulation()) ? "simulation" : "legit"
}

/**
 * Live third-party calls (ELD, fuel cards, QBO, IMAP, FMCSA). Fail-open when
 * the table is missing so adapter unit tests keep working; once migrated,
 * simulation mode forces every adapter onto its CSV/mock fallback.
 */
export async function liveIntegrationsAllowed(): Promise<boolean> {
  const env = envOverride()
  if (env === "simulation") return false
  if (env === "legit") return true
  const row = await readPlatformState()
  // Fail-open unless the singleton row is explicitly simulation, so adapter
  // unit tests (and a missing table) keep exercising live-shaped code.
  return row?.mode !== "simulation"
}

export async function getSimClockDate(): Promise<Date> {
  const row = await readPlatformState()
  if (row?.sim_clock_date) return new Date(`${row.sim_clock_date}T12:00:00Z`)
  return new Date()
}

export async function setAppMode(mode: AppMode): Promise<void> {
  await query(
    `INSERT INTO hub.platform_state (id, mode, updated_at)
     VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()`,
    [mode]
  )
}

export async function recordSimSeed(seed: string, clockDate: string): Promise<void> {
  await query(
    `INSERT INTO hub.platform_state (id, mode, sim_seed, sim_clock_date, generated_at, updated_at)
     VALUES (1, 'simulation', $1, $2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       mode = 'simulation',
       sim_seed = EXCLUDED.sim_seed,
       sim_clock_date = EXCLUDED.sim_clock_date,
       generated_at = NOW(),
       updated_at = NOW()`,
    [seed, clockDate]
  )
}

export async function setSimClockDate(isoDate: string): Promise<void> {
  await query(
    `UPDATE hub.platform_state SET sim_clock_date = $1, updated_at = NOW() WHERE id = 1`,
    [isoDate]
  )
}

export function isSimTenantId(id: string | null | undefined): boolean {
  return id === THIND_CARRIER_ID || id === ATS_CARRIER_ID
}

export function simViewFromCarrierId(id: string | null | undefined): SimView {
  if (id === ATS_CARRIER_ID) return "ats"
  if (id === "all") return "all"
  return "thind"
}

export function carrierIdFromSimView(view: SimView, homeCarrierId: string): string | "all" {
  if (view === "all") return "all"
  if (view === "ats") return ATS_CARRIER_ID
  if (view === "thind") return THIND_CARRIER_ID
  return homeCarrierId
}
