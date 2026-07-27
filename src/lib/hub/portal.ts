/**
 * External portals (Phase 5/M9): invitation-only broker and shipper accounts,
 * scoped to ONE customer at the query layer. Portal queries in this file are
 * the only data path for external users — they never expose other customers'
 * loads, internal margins, raw GPS history, or driver personal information.
 */
import { randomBytes } from "crypto"
import path from "path"
import bcrypt from "bcrypt"
import { query, queryOne } from "./db"
import { stateForPoint } from "./geo"
import { assertCarrierRefs } from "./tenancy"

// ---- Invitations ----

export async function createPortalInvitation(
  carrierId: string,
  customerId: string,
  email: string,
  role: "broker" | "shipper",
  invitedByName: string
): Promise<{ token: string }> {
  // Two-sided guard at the data layer: the caller verifies today, but an
  // invitation binding a foreign customer_id must be impossible from here too.
  await assertCarrierRefs(carrierId, { customer_id: customerId })
  const token = randomBytes(24).toString("hex") // 192-bit
  await query(
    `INSERT INTO hub.portal_invitations (carrier_id, customer_id, email, role, token, invited_by_name, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '7 days')`,
    [carrierId, customerId, email.toLowerCase(), role, token, invitedByName]
  )
  return { token }
}

export async function getInvitation(token: string) {
  return queryOne<{
    id: string; carrier_id: string; customer_id: string; email: string
    role: "broker" | "shipper"; accepted_user_id: string | null; expires_at: string
    customer_name?: string
  }>(
    `SELECT i.*, c.name AS customer_name
     FROM hub.portal_invitations i JOIN hub.customers c ON c.id = i.customer_id
     WHERE i.token = $1`,
    [token]
  )
}

/** Accept an invitation: creates the scoped portal account. */
export async function acceptInvitation(
  token: string,
  input: { name: string; password: string }
): Promise<{ ok: boolean; error?: string; email?: string }> {
  const invitation = await getInvitation(token)
  if (!invitation) return { ok: false, error: "Invitation not found" }
  if (invitation.accepted_user_id) return { ok: false, error: "Already used — just sign in" }
  if (new Date(invitation.expires_at) < new Date()) {
    return { ok: false, error: "Invitation expired — ask for a new one" }
  }
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM hub.users WHERE email = $1`,
    [invitation.email]
  )
  if (existing) return { ok: false, error: "An account with this email already exists — sign in instead" }

  const hash = await bcrypt.hash(input.password, 10)
  const rows = await query<{ id: string }>(
    `INSERT INTO hub.users (carrier_id, email, password_hash, name, role, customer_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [invitation.carrier_id, invitation.email, hash, input.name.trim(), invitation.role, invitation.customer_id]
  )
  // Carrier pinned alongside the id even though both came from the same token
  // row: the write carries its own scope, so no later refactor of the lookup
  // can turn this into a mutation addressable by invitation id alone.
  await query(
    `UPDATE hub.portal_invitations SET accepted_user_id = $1 WHERE id = $2 AND carrier_id = $3`,
    [rows[0].id, invitation.id, invitation.carrier_id]
  )
  return { ok: true, email: invitation.email }
}

export async function listPortalUsers(carrierId: string, customerId: string) {
  return query<{ id: string; email: string; name: string; role: string; active: boolean }>(
    `SELECT id, email, name, role, active FROM hub.users
     WHERE carrier_id = $1 AND customer_id = $2 AND role IN ('broker','shipper')
     ORDER BY name`,
    [carrierId, customerId]
  )
}

// ---- Scoped portal queries (THE isolation boundary — tested) ----

export interface PortalLoad {
  id: string
  reference: string
  customer_reference: string | null
  status: string
  equipment: string
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  pickup_at: string | null
  delivery_at: string | null
  /** City-level only: "In <state>, heading to <city>" — never raw pings. */
  position_hint: string | null
}

/** Public-safe stop for the portal timeline: no facility address, refs, or GPS. */
export interface PortalStop {
  id: string
  sequence: number
  type: "pickup" | "delivery"
  city: string
  state: string
  fcfs: boolean
  appt_start: string | null
  appt_end: string | null
  arrived_at: string | null
  departed_at: string | null
}

const PORTAL_LOAD_SELECT = `
  SELECT l.id, l.reference, l.customer_reference, l.status, l.equipment, l.truck_id,
    fs.city AS origin_city, fs.state AS origin_state,
    ls.city AS dest_city, ls.state AS dest_state,
    fs.appt_start AS pickup_at, COALESCE(ls.appt_end, ls.appt_start) AS delivery_at
  FROM hub.loads l
  LEFT JOIN LATERAL (SELECT city, state, appt_start FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'pickup' ORDER BY sequence LIMIT 1) fs ON TRUE
  LEFT JOIN LATERAL (SELECT city, state, appt_start, appt_end FROM hub.stops WHERE load_id = l.id AND carrier_id = l.carrier_id AND type = 'delivery' ORDER BY sequence DESC LIMIT 1) ls ON TRUE
  WHERE l.carrier_id = $1 AND l.customer_id = $2 AND l.deleted_at IS NULL
    AND l.status <> 'cancelled'`

/** City-level position hint for an in-transit load (latest ping → state only, never raw GPS). */
async function positionHint(
  carrierId: string,
  load: { status: string; truck_id: string | null; dest_city: string | null }
): Promise<string | null> {
  if (load.status !== "in_transit" || !load.truck_id) return null
  const ping = await queryOne<{ lat: number; lng: number; ts: string }>(
    `SELECT lat, lng, ts FROM hub.position_pings
     WHERE carrier_id = $1 AND truck_id = $2 ORDER BY ts DESC LIMIT 1`,
    [carrierId, load.truck_id]
  )
  if (!ping) return null
  const state = stateForPoint(ping.lat, ping.lng)
  return `${state ? `In ${state}` : "On the road"}, heading to ${load.dest_city ?? "delivery"} — updated ${new Date(ping.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
}

/** Loads visible to a portal account: their customer's only, no money/driver fields. */
export async function portalLoads(
  carrierId: string,
  customerId: string,
  limit = 50
): Promise<PortalLoad[]> {
  const loads = await query<PortalLoad & { truck_id: string | null }>(
    `${PORTAL_LOAD_SELECT}
     ORDER BY l.created_at DESC LIMIT $3`,
    [carrierId, customerId, limit]
  )
  for (const load of loads) {
    load.position_hint = await positionHint(carrierId, load)
    delete (load as { truck_id?: string | null }).truck_id
  }
  return loads
}

/** ONE load for a portal account, with its stop timeline. Same scoping as portalLoads
 *  (both carrier AND customer in the WHERE) so a guessed id never crosses customers. */
export async function portalLoad(
  carrierId: string,
  customerId: string,
  loadId: string
): Promise<(PortalLoad & { stops: PortalStop[] }) | null> {
  const load = await queryOne<PortalLoad & { truck_id: string | null }>(
    `${PORTAL_LOAD_SELECT} AND l.id = $3`,
    [carrierId, customerId, loadId]
  )
  if (!load) return null
  const stops = await query<PortalStop>(
    `SELECT id, sequence, type, city, state, fcfs, appt_start, appt_end, arrived_at, departed_at
     FROM hub.stops WHERE carrier_id = $1 AND load_id = $2 ORDER BY sequence`,
    [carrierId, loadId]
  )
  load.position_hint = await positionHint(carrierId, load)
  delete (load as { truck_id?: string | null }).truck_id
  return { ...load, stops }
}

/** Documents a portal user may download for ONE of their loads: POD/BOL only. */
export async function portalLoadDocuments(
  carrierId: string,
  customerId: string,
  loadId: string
): Promise<{ id: string; kind: string; file_name: string; url: string }[]> {
  return query(
    `SELECT d.id, d.kind, d.file_name, d.url
     FROM hub.documents d
     JOIN hub.loads l ON l.id = d.entity_id AND d.entity_type = 'load' AND d.carrier_id = l.carrier_id
     WHERE l.carrier_id = $1 AND l.customer_id = $2 AND l.id = $3 AND l.deleted_at IS NULL
       AND d.kind IN ('pod','bol')
     ORDER BY d.created_at DESC`,
    [carrierId, customerId, loadId]
  )
}

/** Invoices + payment status for the portal customer (brokers). */
export async function portalInvoices(carrierId: string, customerId: string) {
  return query<{
    id: string; number: string; amount_cents: number; issued_on: string; due_on: string
    status: string; pdf_url: string | null; load_reference: string
  }>(
    `SELECT i.id, i.number, i.amount_cents, i.issued_on, i.due_on, i.status, i.pdf_url,
       l.reference AS load_reference
     FROM hub.invoices i JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id
     WHERE i.carrier_id = $1 AND i.customer_id = $2
     ORDER BY i.issued_on DESC LIMIT 50`,
    [carrierId, customerId]
  )
}

/** The carrier's shareable packet docs (COI, W-9, authority letter). */
export async function portalPacketDocuments(carrierId: string) {
  return query<{ id: string; kind: string; file_name: string; url: string }>(
    `SELECT DISTINCT ON (kind) id, kind, file_name, url
     FROM hub.documents
     WHERE carrier_id = $1 AND entity_type = 'carrier' AND entity_id = $1
       AND kind IN ('insurance','w9','authority_letter')
     ORDER BY kind, created_at DESC`,
    [carrierId]
  )
}

/**
 * Files an external portal user may fetch from the file-serving route: POD/BOL
 * on THEIR customer's loads, the carrier's packet docs, and their customer's
 * invoice PDFs — never settlements, CDL scans, or other customers' paperwork.
 * Same-carrier is not enough for an external account; the deactivated-account
 * check rides along so a disabled login can't keep pulling files by URL.
 */
export async function portalFileVisible(
  carrierId: string,
  userId: string,
  fileName: string
): Promise<boolean> {
  const account = await queryOne<{ customer_id: string | null }>(
    `SELECT customer_id FROM hub.users
     WHERE id = $1 AND carrier_id = $2 AND role IN ('broker','shipper') AND active`,
    [userId, carrierId]
  )
  if (!account?.customer_id) return false
  const url = `/api/hub/files/${path.basename(fileName)}`
  const claim = await queryOne<{ ok: number }>(
    `SELECT 1 AS ok FROM hub.documents d
       JOIN hub.loads l ON l.id = d.entity_id AND d.entity_type = 'load' AND l.carrier_id = d.carrier_id
     WHERE d.url = $1 AND d.carrier_id = $2 AND l.customer_id = $3
       AND l.deleted_at IS NULL AND d.kind IN ('pod','bol')
     UNION ALL
     SELECT 1 AS ok FROM hub.documents
     WHERE url = $1 AND carrier_id = $2 AND entity_type = 'carrier' AND entity_id = $2
       AND kind IN ('insurance','w9','authority_letter')
     UNION ALL
     SELECT 1 AS ok FROM hub.invoices
     WHERE pdf_url = $1 AND carrier_id = $2 AND customer_id = $3
     LIMIT 1`,
    [url, carrierId, account.customer_id]
  )
  return Boolean(claim)
}

/** Shipper quote request → a 'quoted' load + CRM activity + office alert. */
export async function createQuoteRequest(
  carrierId: string,
  customerId: string,
  input: {
    originCity: string; originState: string
    destCity: string; destState: string
    pickupDate: string | null
    equipment: "flatbed" | "reefer" | "dry_van"
    weightLbs: number | null
    commodity: string | null
    requestedByName: string
  }
): Promise<{ reference: string }> {
  const { createLoad } = await import("./loads")
  const load = await createLoad(
    carrierId,
    {
      customer_id: customerId,
      status: "quoted",
      equipment: input.equipment,
      commodity: input.commodity,
      weight_lbs: input.weightLbs,
      linehaul_cents: 0,
      fuel_surcharge_cents: 0,
      accessorials: [],
      source: "quote",
      notes: `Quote requested by ${input.requestedByName} through the portal.`,
      stops: [
        {
          type: "pickup", city: input.originCity, state: input.originState,
          appt_start: input.pickupDate ? `${input.pickupDate}T08:00:00` : null,
        },
        { type: "delivery", city: input.destCity, state: input.destState },
      ],
    },
    { id: null, name: input.requestedByName }
  )
  await query(
    `INSERT INTO hub.crm_activities (carrier_id, customer_id, load_id, kind, body, actor_name)
     VALUES ($1, $2, $3, 'note', $4, $5)`,
    [
      carrierId, customerId, load.id,
      `Quote request via portal: ${input.originCity}, ${input.originState} → ${input.destCity}, ${input.destState} (${input.equipment}).`,
      input.requestedByName,
    ]
  )
  const { notifyRoles } = await import("./notify")
  await notifyRoles(carrierId, ["owner", "dispatcher"], {
    kind: "quote",
    title: `Quote request: ${input.originCity} → ${input.destCity}`,
    body: `From the shipper portal (${input.requestedByName}). Price it and call back.`,
    link: `/hub/loads/${load.id}`,
  })
  return { reference: load.reference }
}
