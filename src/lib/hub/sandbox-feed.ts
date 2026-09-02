import "server-only"
import { query } from "./db"
import { SANDBOX_CARRIER_ID } from "./sandbox"

/**
 * The company happening around you.
 *
 * Shift Mode's world already moves — trucks roll, brokers call, the back
 * office bills and collects — but until now none of it was visible unless you
 * went looking for it on the page it happened on. You could work a whole
 * shift and never notice you had colleagues. This is the crew rail: the last
 * few things that happened at Blue Ridge, in plain language, whoever did them.
 *
 * Two rules keep it honest:
 *
 *  1. Anything the simulation did is labelled `ai`. The autopilot signs its
 *     load events "Blue Ridge autopilot" and its money with a null actor, and
 *     the UI says so — the player is never left thinking a human teammate did
 *     something a machine did. What the LABEL adds is the job it was doing,
 *     which is real information: the same autopilot plays dispatch, the back
 *     office and forty drivers, and "the sim moved a load" tells you less
 *     than "dispatch put BRH-2041 on a truck".
 *  2. It reads committed rows only — no invented chatter, no filler between
 *     real events. A quiet company looks quiet.
 */

const C = SANDBOX_CARRIER_ID

export interface FeedItem {
  id: string
  at: string
  /** Who: a real teammate's name, or the crew the autopilot was standing in for. */
  who: string
  ai: boolean
  text: string
  /** Money attached to the event, in cents, when there is any. */
  cents: number | null
  kind: "freight" | "money" | "road"
  /** How many identical events this row stands for (see the collapse below). */
  count: number
}

/** What happened, for collapsing runs — never shown, only compared. */
type Verb =
  | "booked" | "dispatched" | "at_pickup" | "in_transit" | "delivered"
  | "pod_received" | "cancelled" | "moved" | "billed" | "paid"
  | "invoiced" | "load_paid" | "settled"

/** Statuses the back office owns — the wheels stopped turning a while ago. */
const BACK_OFFICE: ReadonlySet<string> = new Set(["invoiced", "load_paid", "settled", "billed", "paid"])

const AUTOPILOT = "Blue Ridge autopilot"

/** The autopilot wears whichever hat the job needs; name the hat, not the bot. */
function crewFor(verb: Verb): string {
  if (BACK_OFFICE.has(verb)) return "Back office"
  if (verb === "booked" || verb === "dispatched") return "Dispatch"
  return "Driver"
}

function phraseFor(verb: Verb, subject: string): string {
  switch (verb) {
    case "booked": return `booked ${subject} off the board`
    case "dispatched": return `put ${subject} on a truck`
    case "at_pickup": return `rolled into the shipper on ${subject}`
    case "in_transit": return `loaded and rolling on ${subject}`
    case "delivered": return `delivered ${subject}`
    case "pod_received": return `sent the POD for ${subject}`
    case "cancelled": return `cancelled ${subject}`
    case "billed": return `billed ${subject}`
    case "paid": return `paid ${subject}`
    case "invoiced": return `invoiced ${subject}`
    case "load_paid": return `booked the money in on ${subject}`
    case "settled": return `settled ${subject} with the driver`
    default: return `moved ${subject}`
  }
}

/**
 * One tick can stamp a dozen arrivals at once, and a rail of eight identical
 * "sent the POD for BRH-20xx" lines is worse than useless — it buries the one
 * thing that was different. Runs of the same crew doing the same thing
 * collapse into a single counted row.
 */
function pluralFor(verb: Verb, n: number): string {
  switch (verb) {
    case "booked": return `booked ${n} loads off the board`
    case "dispatched": return `put ${n} loads on trucks`
    case "at_pickup": return `arrived at ${n} shippers`
    case "in_transit": return `rolled out on ${n} loads`
    case "delivered": return `delivered ${n} loads`
    case "pod_received": return `sent ${n} PODs`
    case "cancelled": return `cancelled ${n} loads`
    case "billed": return `billed ${n} invoices`
    case "paid": return `sent ${n} payments`
    case "invoiced": return `invoiced ${n} loads`
    case "load_paid": return `booked the money in on ${n} loads`
    case "settled": return `settled ${n} loads with drivers`
    default: return `moved ${n} loads`
  }
}

/**
 * The last `limit` things that happened, newest first. Three cheap
 * carrier-scoped reads merged in JS rather than one clever UNION — the
 * shapes have nothing in common and the merge is a dozen rows.
 */
export async function readCompanyFeed(limit = 8): Promise<FeedItem[]> {
  const capped = Math.min(Math.max(1, limit), 25)
  const [moves, invoices, payments] = await Promise.all([
    query<{
      id: string; at: string; actor_name: string | null; to_status: string | null
      reference: string; cents: number
    }>(
      `SELECT e.id::text AS id, e.created_at AS at, e.actor_name,
              e.payload->>'to' AS to_status, l.reference,
              (l.linehaul_cents + l.fuel_surcharge_cents) AS cents
         FROM hub.load_events e
         JOIN hub.loads l ON l.id = e.load_id AND l.carrier_id = $1
        WHERE e.carrier_id = $1 AND e.kind = 'status_change' AND l.deleted_at IS NULL
        ORDER BY e.created_at DESC
        LIMIT $2`,
      [C, capped]
    ),
    // Who billed it comes off the audit row createInvoiceFromLoad writes: a
    // null actor is the autopilot's back office, a name is a human. Until
    // this join every invoice was captioned "Back office (AI)" — including
    // the ones Rosa raised herself, which credited her shift to a machine.
    query<{ id: string; at: string; number: string; cents: number; customer: string | null; actor: string | null }>(
      `SELECT i.id::text AS id, i.created_at AS at, i.number, i.amount_cents AS cents,
              c.name AS customer,
              (SELECT a.actor_name FROM hub.audit_log a
                WHERE a.carrier_id = $1 AND a.entity_type = 'invoice' AND a.action = 'create'
                  AND a.entity_id = i.id::text AND a.actor_id IS NOT NULL
                ORDER BY a.created_at DESC LIMIT 1) AS actor
         FROM hub.invoices i
         LEFT JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = $1
        WHERE i.carrier_id = $1
        ORDER BY i.created_at DESC
        LIMIT $2`,
      [C, capped]
    ),
    // A payment has no actor column; recordPayment logs it against the
    // invoice with the amount in new_value. The autopilot pays with a null
    // actor (sandbox-sim.ts payInvoice), a human with theirs — so the closest
    // matching audit row says which. The customer stays the subject of the
    // sentence either way; what changes is the AI badge.
    query<{ id: string; at: string; cents: number; number: string | null; customer: string | null; ai: boolean }>(
      `SELECT p.id::text AS id, p.created_at AS at, p.amount_cents AS cents,
              i.number, c.name AS customer,
              COALESCE((SELECT a.actor_id IS NULL FROM hub.audit_log a
                         WHERE a.carrier_id = $1 AND a.entity_type = 'payment' AND a.action = 'record'
                           AND a.entity_id = p.invoice_id::text
                           AND (a.new_value->>'amountCents')::bigint = p.amount_cents
                         ORDER BY ABS(EXTRACT(EPOCH FROM (a.created_at - p.created_at))) ASC
                         LIMIT 1), FALSE) AS ai
         FROM hub.payments p
         LEFT JOIN hub.invoices i ON i.id = p.invoice_id AND i.carrier_id = $1
         LEFT JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = $1
        WHERE p.carrier_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2`,
      [C, capped]
    ),
  ])

  const rows: (FeedItem & { verb: Verb })[] = []
  for (const m of moves) {
    // The autopilot signs as "Blue Ridge autopilot" on the road and as
    // "Dispatch autopilot" when it offers a player the next load
    // (sandbox-sim.ts offerPlayerLoad) — anything wearing that suffix is it.
    const ai = !m.actor_name || m.actor_name === AUTOPILOT || /autopilot$/i.test(m.actor_name)
    // A load reaching status 'paid' and a customer sending a payment are
    // different events with the same word on them; keep them apart so the
    // collapse never merges "invoiced 3 loads" with "sent 3 payments".
    const raw = m.to_status === "paid" ? "load_paid" : (m.to_status ?? "moved")
    const verb = raw as Verb
    const kind: FeedItem["kind"] = BACK_OFFICE.has(verb)
      ? "money"
      : verb === "booked" || verb === "dispatched"
        ? "freight"
        : "road"
    rows.push({
      id: `e-${m.id}`,
      at: new Date(m.at).toISOString(),
      who: ai ? crewFor(verb) : m.actor_name!,
      ai,
      text: phraseFor(verb, m.reference),
      cents: verb === "booked" ? m.cents : null,
      kind,
      count: 1,
      verb,
    })
  }
  for (const i of invoices) {
    rows.push({
      id: `i-${i.id}`,
      at: new Date(i.at).toISOString(),
      who: i.actor ?? "Back office",
      ai: !i.actor,
      text: phraseFor("billed", `${i.customer ?? "a customer"} on ${i.number}`),
      cents: i.cents,
      kind: "money",
      count: 1,
      verb: "billed",
    })
  }
  for (const p of payments) {
    rows.push({
      id: `p-${p.id}`,
      at: new Date(p.at).toISOString(),
      who: p.customer ?? "A customer",
      ai: p.ai,
      text: p.number ? phraseFor("paid", p.number) : "sent a payment",
      cents: p.cents,
      kind: "money",
      count: 1,
      verb: "paid",
    })
  }

  rows.sort((a, b) => b.at.localeCompare(a.at))

  const collapsed: (FeedItem & { verb: Verb })[] = []
  for (const row of rows) {
    const prev = collapsed[collapsed.length - 1]
    if (prev && prev.who === row.who && prev.verb === row.verb && prev.ai === row.ai) {
      prev.count += 1
      // Money adds up across a collapsed run; a rate on one of four loads
      // would read as the rate on all four.
      if (row.cents !== null) prev.cents = (prev.cents ?? 0) + row.cents
      prev.text = pluralFor(prev.verb, prev.count)
      continue
    }
    collapsed.push({ ...row })
  }

  return collapsed.slice(0, capped).map(({ verb: _verb, ...item }) => item)
}
