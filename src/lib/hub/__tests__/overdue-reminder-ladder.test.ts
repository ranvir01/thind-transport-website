/**
 * Regression: dunning fired only on days EXACTLY 3, 10 and 20 past due
 * (`if (![3,10,20].includes(daysPast)) continue`). A cron run that slipped a
 * day skipped that rung forever, and any invoice that drifted past day 20
 * before anyone looked was permanently unchaseable — the seeded book had one
 * sitting at 22 days that could never be emailed again. It is a ladder now:
 * crossing a rung is enough, sent_log records which rungs have been climbed,
 * and one invoice never gets more than one reminder per run.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, sendMail } = vi.hoisted(() => ({
  queryMock: vi.fn(async (_sql: string, _params?: unknown[]) => [] as unknown[]),
  sendMail: vi.fn(async (_message: Record<string, unknown>) => undefined),
}))

vi.mock("../db", () => ({ query: queryMock, queryOne: vi.fn(async () => null), hubDb: vi.fn() }))
vi.mock("../settings", () => ({
  getCarrier: vi.fn(async () => ({ id: "carrier-1", name: "Thind Transport" })),
  getCarrierSettings: vi.fn(async () => ({
    notifications: { officeEmail: "office@thind.test" },
    invoice: { defaultTermsDays: 30 },
    factoring: { remitName: null, remitAddress: null, email: null },
    branding: { accent: null },
  })),
  nextInvoiceNumber: vi.fn(async () => "THD-INV-1001"),
}))
vi.mock("../customers", () => ({
  getCustomer: vi.fn(async () => ({ id: "cust-1", name: "Cascade Produce Co.", billing_email: "ap@cascade.test" })),
}))
vi.mock("../loads", () => ({
  getLoad: vi.fn(async () => null),
  getLoadStops: vi.fn(async () => []),
  changeLoadStatus: vi.fn(async () => null),
}))
vi.mock("../documents", () => ({ listDocuments: vi.fn(async () => []), storeGeneratedPdf: vi.fn(async () => "/x.pdf") }))
vi.mock("../pdf", () => ({ buildInvoicePdf: vi.fn(), buildStatementPdf: vi.fn() }))
vi.mock("../audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/mailer", () => ({
  isEmailConfigured: vi.fn(() => true),
  createMailTransport: vi.fn(() => ({ sendMail })),
  mailFrom: vi.fn(() => "billing@thind.test"),
}))

import { nextReminderRung, runOverdueReminders } from "../invoices"

const CARRIER = "carrier-1"

/**
 * Pinned (compliance.test.ts pattern): fixtures like invoiceRow(9) sit exactly
 * one day below a reminder rung, so a run straddling UTC midnight between
 * fixture creation and runOverdueReminders' own `new Date()` climbed a rung
 * the test asserted quiet.
 */
const PINNED_CLOCK = new Date(Date.UTC(2026, 5, 15, 12)) // 2026-06-15T12:00Z

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
})

afterAll(() => {
  vi.useRealTimers()
})

type SentEntry = { to: string; at: string; kind: string }

/** An open invoice N days past due, with whatever has already been mailed on it. */
function invoiceRow(
  daysPast: number,
  sentLog: SentEntry[] = [],
  overrides: Record<string, unknown> = {}
) {
  const due = new Date(PINNED_CLOCK.getTime() - daysPast * 86_400_000).toISOString().slice(0, 10)
  return {
    id: `inv-${daysPast}`, carrier_id: CARRIER, number: `THD-INV-${1000 + daysPast}`,
    customer_id: "cust-1", load_id: "load-1", load_reference: "THD-1042",
    amount_cents: 240000, paid_cents: 0, issued_on: due, due_on: due,
    status: "sent", factored: false, remit_to: "Thind Transport", pdf_url: null,
    sent_log: sentLog, ...overrides,
  }
}

const reminder = (rung: number): SentEntry => ({ to: "ap@cascade.test", at: "2026-01-01T00:00:00Z", kind: `reminder-${rung}d` })

function withInvoices(rows: unknown[]) {
  queryMock.mockImplementation(async (sql: string) =>
    sql.includes("FROM hub.invoices i") && sql.includes("ORDER BY i.due_on") ? rows : []
  )
}

/** The kinds appended to sent_log by this run, in order. */
function loggedKinds(): string[] {
  return queryMock.mock.calls
    .filter(([sql]) => sql.includes("sent_log = sent_log ||"))
    .map(([, params]) => (JSON.parse(String(params?.[1])) as SentEntry[])[0].kind)
}

beforeEach(() => {
  vi.setSystemTime(PINNED_CLOCK)
  queryMock.mockClear()
  sendMail.mockClear()
  queryMock.mockImplementation(async () => [])
})

describe("nextReminderRung", () => {
  it("stays quiet before the first rung", () => {
    expect(nextReminderRung(1, [])).toBeNull()
    expect(nextReminderRung(2, [])).toBeNull()
  })

  it("fires on the rung day", () => {
    expect(nextReminderRung(3, [])).toBe(3)
    expect(nextReminderRung(10, [reminder(3)])).toBe(10)
    expect(nextReminderRung(20, [reminder(3), reminder(10)])).toBe(20)
  })

  it("still fires when the cron missed the exact day", () => {
    // The old `[3,10,20].includes(daysPast)` sent nothing on any of these.
    expect(nextReminderRung(4, [])).toBe(3)
    expect(nextReminderRung(9, [reminder(3)])).toBeNull()
    expect(nextReminderRung(11, [reminder(3)])).toBe(10)
  })

  it("chases an invoice that drifted past the last rung", () => {
    // The seeded 22-day invoice: previously unchaseable forever.
    expect(nextReminderRung(22, [])).toBe(20)
    expect(nextReminderRung(365, [reminder(3), reminder(10)])).toBe(20)
  })

  it("jumps straight to the hardest crossed rung instead of stacking emails", () => {
    expect(nextReminderRung(12, [])).toBe(10)
    expect(nextReminderRung(40, [])).toBe(20)
  })

  it("never repeats or steps back down a rung already climbed", () => {
    expect(nextReminderRung(3, [reminder(3)])).toBeNull()
    expect(nextReminderRung(13, [reminder(10)])).toBeNull()
    expect(nextReminderRung(30, [reminder(20)])).toBeNull()
    expect(nextReminderRung(99, [reminder(3), reminder(10), reminder(20)])).toBeNull()
  })

  it("ignores non-reminder sent_log entries and a missing log", () => {
    const noise = [
      { to: "ap@cascade.test", at: "2026-01-01T00:00:00Z", kind: "invoice" },
      { to: "ap@cascade.test", at: "2026-01-01T00:00:00Z", kind: "statement" },
      { to: "factor@test", at: "2026-01-01T00:00:00Z", kind: "factoring-packet" },
    ]
    expect(nextReminderRung(5, noise)).toBe(3)
    expect(nextReminderRung(5, null)).toBe(3)
    expect(nextReminderRung(5, undefined)).toBe(3)
  })
})

describe("runOverdueReminders", () => {
  it("chases the 22-day invoice the old exact-day check had abandoned", async () => {
    withInvoices([invoiceRow(22)])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(1)
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "ap@cascade.test",
      subject: expect.stringContaining("22 days"),
      cc: "office@thind.test",
    })
    expect(loggedKinds()).toEqual(["reminder-20d"])
  })

  it("sends the missed rung on the next run after a skipped cron day", async () => {
    withInvoices([invoiceRow(4)])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(1)
    expect(loggedKinds()).toEqual(["reminder-3d"])
  })

  it("sends at most one reminder per invoice per run", async () => {
    withInvoices([invoiceRow(12)])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(1)
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(loggedKinds()).toEqual(["reminder-10d"])
  })

  it("does not re-send a rung already in sent_log", async () => {
    withInvoices([invoiceRow(6, [reminder(3)])])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("climbs the rung one calendar day later — the edge the pinned clock guards", async () => {
    // 9 days past due with rung 3 climbed is quiet…
    withInvoices([invoiceRow(9, [reminder(3)])])
    expect((await runOverdueReminders(CARRIER)).sent).toBe(0)

    // …but the same invoice crosses rung 10 at the next UTC midnight. Before
    // the file-wide pin, a live-clock run straddling midnight between fixture
    // creation and the runner's `new Date()` produced exactly this flip.
    vi.setSystemTime(new Date(PINNED_CLOCK.getTime() + 86_400_000))
    queryMock.mockClear()
    sendMail.mockClear()
    withInvoices([invoiceRow(9, [reminder(3)])]) // due date re-derived from the pin, so now 10 days past
    expect((await runOverdueReminders(CARRIER)).sent).toBe(1)
    expect(loggedKinds()).toEqual(["reminder-10d"])
  })

  it("still skips factored and disputed invoices however old they get", async () => {
    withInvoices([
      invoiceRow(45, [], { id: "inv-factored", factored: true }),
      invoiceRow(46, [], { id: "inv-disputed", status: "disputed" }),
    ])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("skips invoices that are paid off or not yet due, and still flags the rest overdue", async () => {
    withInvoices([
      invoiceRow(-5, [], { id: "inv-current" }),
      invoiceRow(8, [], { id: "inv-settled", paid_cents: 240000 }),
      invoiceRow(9, [reminder(3)], { id: "inv-quiet" }),
    ])

    const result = await runOverdueReminders(CARRIER)

    expect(result.sent).toBe(0)
    // A past-due invoice with nothing owed on the ladder is still flagged
    // overdue; the fully-paid one is skipped before flagging, as before.
    const flagged = queryMock.mock.calls
      .filter(([sql]) => sql.includes("SET status = 'overdue'"))
      .map(([, params]) => params?.[0])
    expect(flagged).toEqual(["inv-quiet"])
    expect(result.flaggedOverdue).toBe(1)
  })

  it("walks one invoice up the whole ladder across successive runs", async () => {
    const log: SentEntry[] = []
    for (const [daysPast, expected] of [[3, "reminder-3d"], [11, "reminder-10d"], [26, "reminder-20d"]] as const) {
      queryMock.mockClear()
      sendMail.mockClear()
      withInvoices([invoiceRow(daysPast, [...log])])

      await runOverdueReminders(CARRIER)

      expect(loggedKinds()).toEqual([expected])
      log.push(reminder(Number(expected.match(/\d+/)![0])))
    }
    // Ladder exhausted: an even older invoice gets nothing more.
    queryMock.mockClear()
    sendMail.mockClear()
    withInvoices([invoiceRow(60, [...log])])

    expect((await runOverdueReminders(CARRIER)).sent).toBe(0)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
