/**
 * What a ten-lens audit of the test drive found, pinned so it stays fixed.
 *
 * Every case here is a thing the owner would have hit inside the first hour:
 * a money line that lied, an objective that could not be scored from its own
 * seat, a tour step with nothing behind it. Each was confirmed against a real
 * Postgres before it was fixed, and each assertion below was watched to FAIL
 * against the old code before the fix went in — a gate that has never been
 * red is a claim, not a guarantee.
 *
 * Runs when POSTGRES_URL is available; skips cleanly otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PoolClient } from "pg"
import { loadEnvLocal } from "../../../../scripts/env-local.mjs"
import { ORIENTATION_TEMPLATE } from "../recruiting-shared"
import { lockSandboxTenant, unlockSandboxTenant } from "./sandbox-tenant-lock"

loadEnvLocal({ skipWhenSet: "POSTGRES_URL" })

const hasDb = Boolean(process.env.POSTGRES_URL)
if (!hasDb) console.warn("\n⚠️  sandbox-audit-truth.test.ts SKIPPED — no POSTGRES_URL.\n")
const suite = hasDb ? describe : describe.skip

const C = "33333333-3333-3333-3333-333333333333"

suite("the sandbox tells the truth about money and work", () => {
  let query: typeof import("../db").query
  let readShiftMetrics: typeof import("../sandbox-shift").readShiftMetrics
  let readCompanyFeed: typeof import("../sandbox-feed").readCompanyFeed
  let driverUnsettledPay: typeof import("../driver-app").driverUnsettledPay
  let recordPayment: typeof import("../invoices").recordPayment
  let createInvoiceFromLoad: typeof import("../invoices").createInvoiceFromLoad
  let readStoredFileBytes: typeof import("../documents").readStoredFileBytes
  let portalLoadDocuments: typeof import("../portal").portalLoadDocuments
  let lock: PoolClient | null = null

  async function user(email: string) {
    const [row] = await query<{ id: string; name: string; driver_id: string | null; customer_id: string | null }>(
      `SELECT u.id, u.name, d.id AS driver_id, u.customer_id
         FROM hub.users u
         LEFT JOIN hub.drivers d ON d.user_id = u.id AND d.carrier_id = u.carrier_id
        WHERE u.carrier_id = $1 AND u.email = $2`,
      [C, email]
    )
    return row
  }

  beforeAll(async () => {
    lock = await lockSandboxTenant()
    ;({ query } = await import("../db"))
    ;({ readShiftMetrics } = await import("../sandbox-shift"))
    ;({ readCompanyFeed } = await import("../sandbox-feed"))
    ;({ driverUnsettledPay } = await import("../driver-app"))
    ;({ recordPayment, createInvoiceFromLoad } = await import("../invoices"))
    ;({ readStoredFileBytes } = await import("../documents"))
    ;({ portalLoadDocuments } = await import("../portal"))
    await (await import("../sandbox-seed")).seedSandbox()
  }, 240_000)

  afterAll(async () => {
    await unlockSandboxTenant(lock)
  }, 60_000)

  // ---- the seed ----

  it("stores every deduction line positive, the way the pay engine does", async () => {
    // Renderers prefix their own minus; a negative amount printed "−-$50.00"
    // on the settlement page and on the driver's phone.
    const [{ total, negative }] = await query<{ total: number; negative: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE sl.amount_cents < 0)::int AS negative
         FROM hub.settlement_lines sl JOIN hub.settlements s ON s.id = sl.settlement_id
        WHERE s.carrier_id = $1 AND sl.kind = 'deduction'`,
      [C]
    )
    expect(total).toBeGreaterThan(0)
    expect(negative).toBe(0)
  }, 60_000)

  it("explains every draft's deductions with lines that add up to them", async () => {
    // approveSettlement posts escrow off the ESCROW LINE, not the total. A
    // draft with a $75 deduction and no lines approved to a ledger that never
    // moved — on the seat whose blurb promises "escrow that adds up".
    const rows = await query<{ id: string; deductions_cents: number; lines_cents: string | null; escrow: number }>(
      `SELECT s.id, s.deductions_cents,
              (SELECT SUM(sl.amount_cents) FROM hub.settlement_lines sl
                WHERE sl.settlement_id = s.id AND sl.kind = 'deduction') AS lines_cents,
              (SELECT COUNT(*) FROM hub.settlement_lines sl
                WHERE sl.settlement_id = s.id AND sl.source_type = 'escrow')::int AS escrow
         FROM hub.settlements s
        WHERE s.carrier_id = $1 AND s.status = 'draft' AND s.deductions_cents > 0`,
      [C]
    )
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(Number(r.lines_cents ?? 0), r.id).toBe(r.deductions_cents)
    }
    expect(rows.some((r) => r.escrow > 0)).toBe(true)
  }, 60_000)

  it("has run payroll for every week before this one", async () => {
    // Loads delivered weeks ago with no settlement made the phone say a
    // driver was owed a month of back pay the office's own draft never showed.
    const [{ orphaned, paid }] = await query<{ orphaned: number; paid: number }>(
      `SELECT COUNT(*) FILTER (WHERE s.id IS NULL OR s.status <> 'paid')::int AS orphaned,
              COUNT(*) FILTER (WHERE s.status = 'paid')::int AS paid
         FROM hub.loads l
         LEFT JOIN hub.settlements s ON s.id = l.settlement_id AND s.carrier_id = l.carrier_id
        WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.driver_id IS NOT NULL
          AND l.status IN ('invoiced','paid','settled')
          AND l.delivered_at < date_trunc('week', NOW())`,
      [C]
    )
    expect(paid).toBeGreaterThan(0)
    expect(orphaned).toBe(0)
  }, 60_000)

  it("links this week's drafted loads to their draft, like draftSettlements would", async () => {
    const [{ unlinked, drafted }] = await query<{ unlinked: number; drafted: number }>(
      `SELECT COUNT(*) FILTER (WHERE l.settlement_id IS NULL)::int AS unlinked,
              COUNT(*) FILTER (WHERE l.settlement_id IS NOT NULL)::int AS drafted
         FROM hub.settlement_lines sl
         JOIN hub.settlements s ON s.id = sl.settlement_id AND s.carrier_id = $1 AND s.status = 'draft'
         JOIN hub.loads l ON l.id = sl.source_id::uuid AND l.carrier_id = $1
        WHERE sl.source_type = 'load'`,
      [C]
    )
    expect(drafted).toBeGreaterThan(0)
    expect(unlinked).toBe(0)
  }, 60_000)

  it("gives every applicant the orientation checklist, and leaves Dale one tick from hired", async () => {
    // The Hire button is gated on the checklist being present AND complete;
    // a bare row could never be hired, so the recruiter's marquee objective
    // was unreachable from the seed.
    const rows = await query<{ first_name: string; items: number; done: number; offers: number }>(
      `SELECT a.first_name, jsonb_array_length(a.orientation)::int AS items,
              (SELECT COUNT(*) FROM jsonb_array_elements(a.orientation) i WHERE (i->>'done')::boolean)::int AS done,
              (SELECT COUNT(*) FROM hub.offers o WHERE o.applicant_id = a.id AND o.status = 'sent')::int AS offers
         FROM hub.applicants a WHERE a.carrier_id = $1 ORDER BY a.first_name`,
      [C]
    )
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.items, r.first_name).toBe(ORIENTATION_TEMPLATE.length)
    const dale = rows.find((r) => r.first_name === "Dale")
    expect(dale?.done).toBe(ORIENTATION_TEMPLATE.length - 1)
    expect(dale?.offers).toBe(1)
  }, 60_000)

  it("writes DVIR defects in the shape the app reads", async () => {
    // DvirPanel, the driver's DvirForm and the safety page's grounded list
    // all render `defect.label`. The seed wrote `item`, so every seeded
    // defect printed as a bare dash: "• — Soft pedal, pulls right".
    const [{ total, unlabelled }] = await query<{ total: number; unlabelled: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE d->>'label' IS NULL)::int AS unlabelled
         FROM hub.dvirs v, jsonb_array_elements(v.defects) d
        WHERE v.carrier_id = $1`,
      [C]
    )
    expect(total).toBeGreaterThan(0)
    expect(unlabelled).toBe(0)
  }, 60_000)

  it("does not call a world seeded without its autopilot 'seeded'", async () => {
    // ensureSandboxSeeded trusts sandboxSeeded(). A world with every row but
    // no settings.sim (which a test's afterAll once left behind) is one no
    // heartbeat will ever advance — and the old check, users + loads only,
    // declined to repair it.
    const { sandboxSeeded } = await import("../sandbox-seed")
    expect(await sandboxSeeded()).toBe(true)
    const [saved] = await query<{ settings: unknown }>(
      `SELECT settings FROM hub.carrier_settings WHERE carrier_id = $1`,
      [C]
    )
    await query(`UPDATE hub.carrier_settings SET settings = settings - 'sim' WHERE carrier_id = $1`, [C])
    try {
      expect(await sandboxSeeded()).toBe(false)
    } finally {
      await query(`UPDATE hub.carrier_settings SET settings = $2::jsonb WHERE carrier_id = $1`, [C, JSON.stringify(saved.settings)])
    }
    expect(await sandboxSeeded()).toBe(true)
  }, 60_000)

  it("keeps DEF and reefer fuel out of the taxable gallons", async () => {
    // IFTA reads fuel_use. Every seeded row used to fall to the column default
    // ('tractor'), so the DEF was taxed as propulsion fuel and the reefer
    // exclusion the handbook promised had no rows to act on.
    const [{ def_as_tractor, reefer, tractor }] = await query<{ def_as_tractor: number; reefer: number; tractor: number }>(
      `SELECT COUNT(*) FILTER (WHERE fuel_type = 'DEF' AND fuel_use = 'tractor')::int AS def_as_tractor,
              COUNT(*) FILTER (WHERE fuel_use = 'reefer')::int AS reefer,
              COUNT(*) FILTER (WHERE fuel_use = 'tractor')::int AS tractor
         FROM hub.fuel_transactions WHERE carrier_id = $1`,
      [C]
    )
    expect(tractor).toBeGreaterThan(400)
    expect(reefer).toBeGreaterThanOrEqual(3)
    expect(def_as_tractor).toBe(0)
  }, 60_000)

  it("seeds delivery proof the broker and the shipper can actually open", async () => {
    for (const email of ["sandbox.broker@demo.thind", "sandbox.shipper@demo.thind"]) {
      const u = await user(email)
      expect(u.customer_id, email).toBeTruthy()
      const docs = await query<{ load_id: string; url: string; storage: string }>(
        `SELECT d.entity_id AS load_id, d.url, d.storage
           FROM hub.documents d
           JOIN hub.loads l ON l.id = d.entity_id AND l.carrier_id = d.carrier_id
          WHERE d.carrier_id = $1 AND d.entity_type = 'load' AND d.kind = 'pod' AND l.customer_id = $2`,
        [C, u.customer_id]
      )
      expect(docs.length, email).toBeGreaterThanOrEqual(2)
      for (const doc of docs) {
        // The portal's own reader lists it, and the bytes behind it are a PDF.
        const listed = await portalLoadDocuments(C, u.customer_id!, doc.load_id)
        expect(listed.some((d) => d.url === doc.url), doc.url).toBe(true)
        const bytes = await readStoredFileBytes(doc.url, doc.storage as "local" | "blob")
        expect(bytes?.subarray(0, 4).toString("latin1"), doc.url).toBe("%PDF")
      }
    }
  }, 120_000)

  // ---- the readers ----

  it("counts a load on a draft as not yet paid", async () => {
    // draftSettlements links loads the moment the draft is written. Reading
    // `settlement_id IS NULL` alone dropped every load the office had merely
    // started the paperwork on.
    const jordan = await user("sandbox.driver@demo.thind")
    const [{ on_draft, miles }] = await query<{ on_draft: number; miles: string }>(
      `SELECT COUNT(*) FILTER (WHERE s.status = 'draft')::int AS on_draft,
              COALESCE(SUM(l.loaded_miles), 0)::bigint AS miles
         FROM hub.loads l
         LEFT JOIN hub.settlements s ON s.id = l.settlement_id AND s.carrier_id = l.carrier_id
        WHERE l.carrier_id = $1 AND l.driver_id = $2 AND l.deleted_at IS NULL
          AND l.status IN ('delivered','pod_received','invoiced','paid')
          AND (l.settlement_id IS NULL OR s.status = 'draft')`,
      [C, jordan.driver_id]
    )
    expect(on_draft).toBeGreaterThan(0)
    // Jordan is 58c a loaded mile, and this is the whole of what he is owed.
    expect(await driverUnsettledPay(C, jordan.driver_id!)).toBe(Number(miles) * 58)
  }, 60_000)

  it("scores the POD the driver sends, not a status only the office can set", async () => {
    const jordan = await user("sandbox.driver@demo.thind")
    const rosa = await user("sandbox.books@demo.thind")
    const [load] = await query<{ id: string }>(
      `SELECT id FROM hub.loads WHERE carrier_id = $1 AND driver_id = $2 AND deleted_at IS NULL
        ORDER BY reference LIMIT 1`,
      [C, jordan.driver_id]
    )
    const before = (await readShiftMetrics(jordan.id, "driver")).myPodsSubmitted
    // Exactly what driverUploadDocument writes.
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'document', $3, $4, '{"kind":"pod","file":"pod.jpg","by":"driver"}'::jsonb)`,
      [C, load.id, jordan.id, jordan.name]
    )
    expect((await readShiftMetrics(jordan.id, "driver")).myPodsSubmitted).toBe(before + 1)
    // The office confirming it is the office's work, not his.
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'status_change', $3, $4, '{"to":"pod_received"}'::jsonb)`,
      [C, load.id, rosa.id, rosa.name]
    )
    expect((await readShiftMetrics(jordan.id, "driver")).myPodsSubmitted).toBe(before + 1)
    // And a BOL is not a POD.
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_id, actor_name, payload)
       VALUES ($1, $2, 'document', $3, $4, '{"kind":"bol","file":"bol.jpg","by":"driver"}'::jsonb)`,
      [C, load.id, jordan.id, jordan.name]
    )
    expect((await readShiftMetrics(jordan.id, "driver")).myPodsSubmitted).toBe(before + 1)
  }, 60_000)

  it("moves the owner's money line by exactly the payment she records", async () => {
    // recordPayment audits against the INVOICE id; the reader joined on the
    // payment's, matched nothing, and every payment the owner recorded was
    // worth $0 on the line while the objective beside it ticked.
    const priya = await user("sandbox.owner@demo.thind")
    const [a, b] = await query<{ id: string }>(
      `SELECT id FROM hub.invoices WHERE carrier_id = $1 AND status = 'sent' ORDER BY number LIMIT 2`,
      [C]
    )
    const before = (await readShiftMetrics(priya.id, "owner")).myCashMovedCents
    await recordPayment(C, a.id, { amountCents: 12_345, paidOn: "2026-08-14", method: "ACH" }, { id: priya.id, name: priya.name })
    expect((await readShiftMetrics(priya.id, "owner")).myCashMovedCents).toBe(before + 12_345)
    // The autopilot's payments carry a null actor and must never pad her.
    await recordPayment(C, b.id, { amountCents: 9_999, paidOn: "2026-08-14", method: "ACH" }, { id: null, name: "Summit Freight (AP)" })
    expect((await readShiftMetrics(priya.id, "owner")).myCashMovedCents).toBe(before + 12_345)
  }, 60_000)

  it("reads delivered freight on the same basis as billed freight", async () => {
    const priya = await user("sandbox.owner@demo.thind")
    // A fresh seed has no delivery EVENTS yet (they accrue as the sim runs),
    // so deliver one load that carries detention — the term the old query
    // dropped — and check the reader against the schema.
    const [load] = await query<{ id: string }>(
      `SELECT id FROM hub.loads
        WHERE carrier_id = $1 AND deleted_at IS NULL AND jsonb_array_length(accessorials) > 0
        ORDER BY reference LIMIT 1`,
      [C]
    )
    expect(load).toBeTruthy()
    await query(
      `INSERT INTO hub.load_events (carrier_id, load_id, kind, actor_name, payload)
       VALUES ($1, $2, 'status_change', 'test', '{"to":"delivered"}'::jsonb)`,
      [C, load.id]
    )
    const [{ cents }] = await query<{ cents: string }>(
      `SELECT COALESCE(SUM(l.linehaul_cents + l.fuel_surcharge_cents
                + COALESCE((SELECT SUM((a->>'amount_cents')::int) FROM jsonb_array_elements(l.accessorials) a), 0)), 0)::bigint AS cents
         FROM hub.loads l
        WHERE l.carrier_id = $1 AND l.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM hub.load_events e WHERE e.carrier_id = $1 AND e.load_id = l.id
                        AND e.kind = 'status_change' AND e.payload->>'to' = 'delivered')`,
      [C]
    )
    expect(Number(cents)).toBeGreaterThan(0)
    expect((await readShiftMetrics(priya.id, "owner")).coDeliveredCents).toBe(Number(cents))
  }, 60_000)

  // ---- the crew rail ----

  it("credits Rosa with the invoice she raised, and the autopilot with its own", async () => {
    const rosa = await user("sandbox.books@demo.thind")
    const [mine, theirs] = await query<{ id: string }>(
      `SELECT id FROM hub.loads WHERE carrier_id = $1 AND status = 'pod_received' AND deleted_at IS NULL
        ORDER BY reference LIMIT 2`,
      [C]
    )
    await createInvoiceFromLoad(C, mine.id, { id: rosa.id, name: rosa.name }, { email: false })
    await createInvoiceFromLoad(C, theirs.id, { id: null, name: "Blue Ridge autopilot" }, { email: false })
    const feed = await readCompanyFeed(25)
    const hers = feed.find((f) => f.who === rosa.name && /billed/.test(f.text))
    expect(hers?.ai).toBe(false)
    const bots = feed.find((f) => f.who === "Back office" && /billed/.test(f.text))
    expect(bots?.ai).toBe(true)
  }, 60_000)

  it("badges the autopilot's payments as AI and a human's as not", async () => {
    const priya = await user("sandbox.owner@demo.thind")
    const [a, b] = await query<{ id: string; customer: string }>(
      `SELECT i.id, c.name AS customer FROM hub.invoices i
         JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = $1
        WHERE i.carrier_id = $1 AND i.status = 'sent' ORDER BY i.number DESC LIMIT 2`,
      [C]
    )
    await recordPayment(C, a.id, { amountCents: 777, paidOn: "2026-08-14" }, { id: null, name: `${a.customer} (AP)` })
    await recordPayment(C, b.id, { amountCents: 888, paidOn: "2026-08-14" }, { id: priya.id, name: priya.name })
    const feed = await readCompanyFeed(25)
    expect(feed.find((f) => f.cents === 777)?.ai).toBe(true)
    expect(feed.find((f) => f.cents === 888)?.ai).toBe(false)
  }, 60_000)
})
