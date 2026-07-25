import { query, queryOne, hubDb } from "./db"
import { getCarrier, getCarrierSettings, nextInvoiceNumber } from "./settings"
import { getLoad, getLoadStops, changeLoadStatus } from "./loads"
import { getCustomer } from "./customers"
import { listDocuments, storeGeneratedPdf, readStoredFileBytes } from "./documents"
import { buildInvoicePdf, buildStatementPdf } from "./pdf"
import { invoiceTotalCents, agingBucket, type AgingBucket } from "./money"
import { logAudit } from "./audit"
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import { loadTotalCents, type Invoice, type HubDocument } from "./types"

const INVOICE_SELECT = `
  SELECT i.*, c.name AS customer_name, l.reference AS load_reference,
    COALESCE((SELECT SUM(amount_cents) FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id), 0)::int AS paid_cents
  FROM hub.invoices i
  JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id
  JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id
`

export async function listInvoices(
  carrierId: string,
  filters: { status?: string } = {}
): Promise<Invoice[]> {
  const params: unknown[] = [carrierId]
  let where = `i.carrier_id = $1`
  if (filters.status && filters.status !== "all") {
    params.push(filters.status)
    where += ` AND i.status = $${params.length}`
  }
  return query<Invoice>(`${INVOICE_SELECT} WHERE ${where} ORDER BY i.created_at DESC LIMIT 300`, params)
}

export async function getInvoice(carrierId: string, id: string): Promise<Invoice | null> {
  return queryOne<Invoice>(`${INVOICE_SELECT} WHERE i.carrier_id = $1 AND i.id = $2`, [carrierId, id])
}

export interface InvoicePayment {
  id: string
  amount_cents: number
  paid_on: string
  method: string | null
  reference: string | null
}

export async function listInvoicePayments(carrierId: string, invoiceId: string): Promise<InvoicePayment[]> {
  return query<InvoicePayment>(
    `SELECT id, amount_cents, paid_on, method, reference FROM hub.payments
     WHERE carrier_id = $1 AND invoice_id = $2 ORDER BY paid_on`,
    [carrierId, invoiceId]
  )
}

export async function getInvoiceForLoad(carrierId: string, loadId: string): Promise<Invoice | null> {
  return queryOne<Invoice>(
    `${INVOICE_SELECT} WHERE i.carrier_id = $1 AND i.load_id = $2 ORDER BY i.created_at DESC LIMIT 1`,
    [carrierId, loadId]
  )
}

/**
 * One-click invoicing at pod_received: number from tenant settings, branded PDF,
 * remit-to = the factor when the load is factored, emailed with POD + BOL attached.
 */
export async function createInvoiceFromLoad(
  carrierId: string,
  loadId: string,
  actor: { id: string; name: string }
): Promise<{ invoice: Invoice; emailed: boolean; error?: string }> {
  const load = await getLoad(carrierId, loadId)
  if (!load) throw new Error("Load not found")
  if (!load.customer_id) throw new Error("Load has no customer")
  if (!["pod_received", "delivered"].includes(load.status)) {
    throw new Error(`Load must be delivered/POD received to invoice (currently ${load.status})`)
  }
  const existing = await getInvoiceForLoad(carrierId, loadId)
  if (existing) throw new Error(`Already invoiced as ${existing.number}`)

  const [carrier, settings, customer, stops] = await Promise.all([
    getCarrier(carrierId),
    getCarrierSettings(carrierId),
    getCustomer(carrierId, load.customer_id),
    getLoadStops(carrierId, loadId),
  ])
  if (!carrier || !customer) throw new Error("Carrier or customer missing")

  const accessorials = Array.isArray(load.accessorials) ? load.accessorials : []
  const amountCents = invoiceTotalCents({
    linehaulCents: load.linehaul_cents,
    fuelSurchargeCents: load.fuel_surcharge_cents,
    accessorials,
  })
  if (amountCents !== loadTotalCents(load)) throw new Error("Invoice total mismatch — aborted")

  const number = await nextInvoiceNumber(carrierId)
  const issuedOn = new Date().toISOString().slice(0, 10)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (customer.payment_terms_days ?? settings.invoice.defaultTermsDays))
  const dueOn = dueDate.toISOString().slice(0, 10)

  const factored = load.factored || customer.factored
  const remitTo = factored && settings.factoring.remitName
    ? `${settings.factoring.remitName}\n${settings.factoring.remitAddress ?? ""}`.trim()
    : `${carrier.name}\n${carrier.address ?? ""}`.trim()

  const origin = stops.find((s) => s.type === "pickup")
  const dest = [...stops].reverse().find((s) => s.type === "delivery")
  const lane = `${origin ? `${origin.city}, ${origin.state}` : "—"} → ${dest ? `${dest.city}, ${dest.state}` : "—"}`

  const lines = [
    { label: `Linehaul — ${lane}`, amountCents: load.linehaul_cents },
    ...(load.fuel_surcharge_cents ? [{ label: "Fuel surcharge", amountCents: load.fuel_surcharge_cents }] : []),
    ...accessorials.map((a) => ({ label: a.label, amountCents: a.amount_cents })),
  ]

  const pdfBytes = await buildInvoicePdf({
    brand: {
      name: carrier.name, address: carrier.address, phone: carrier.phone,
      email: carrier.email, dot: carrier.dot_number, mc: carrier.mc_number,
      accent: settings.branding.accent,
    },
    number, issuedOn, dueOn,
    billTo: { name: customer.name, address: customer.billing_address, email: customer.billing_email },
    loadReference: load.reference,
    customerReference: load.customer_reference,
    lane, lines, totalCents: amountCents, remitTo, factored,
  })
  const pdfUrl = await storeGeneratedPdf(`${number}.pdf`, pdfBytes)

  const rows = await query<Invoice>(
    `INSERT INTO hub.invoices (carrier_id, number, customer_id, load_id, amount_cents, issued_on, due_on, status, factored, remit_to, pdf_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10)
     ON CONFLICT (carrier_id, load_id) DO NOTHING RETURNING *`,
    [carrierId, number, customer.id, loadId, amountCents, issuedOn, dueOn, factored, remitTo, pdfUrl]
  )
  if (rows.length === 0) {
    // Lost the race to a concurrent createInvoiceFromLoad call for the same load
    // (invoices_carrier_load_unique, migration 018) — the pre-check above is not
    // atomic with the INSERT, so re-fetch and report what actually landed.
    const raced = await getInvoiceForLoad(carrierId, loadId)
    throw new Error(raced ? `Already invoiced as ${raced.number}` : "Load was already invoiced")
  }
  const invoice = rows[0]

  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoice.id, action: "create",
    newValue: { number, amountCents, factored },
  })

  // Email with POD + BOL attached (best effort; invoice stays usable without SMTP)
  let emailed = false
  let error: string | undefined
  if (!isEmailConfigured()) {
    // Skip sending but DON'T return early — the load must still move to
    // "invoiced" below, or the UI keeps offering invoice creation forever.
    error = "Email not configured (set SMTP_USER/SMTP_PASS) — download the PDF and send it manually."
  } else if (customer.billing_email) {
    try {
      const docs = await listDocuments(carrierId, "load", loadId)
      const attachments: { filename: string; content: Buffer; contentType?: string }[] = [
        { filename: `${number}.pdf`, content: Buffer.from(pdfBytes), contentType: "application/pdf" },
      ]
      for (const doc of docs.filter((d) => ["pod", "bol"].includes(d.kind))) {
        // Read disk/blob directly. Since blobs went private, doc.url is the
        // relative /api/hub/files/<name> route: fetch() throws on it, and
        // absolutising against NEXTAUTH_URL hits a route that demands a session
        // this outbound server call does not carry — a 401 that this
        // best-effort block would swallow, shipping the invoice with no POD.
        const bytes = await readStoredFileBytes(doc.url, doc.storage)
        if (bytes) {
          attachments.push({
            filename: `${doc.kind.toUpperCase()}-${doc.file_name}`,
            content: bytes,
          })
        }
      }
      const transport = createMailTransport()
      await transport.sendMail({
        from: mailFrom(carrier.name),
        to: customer.billing_email,
        subject: `Invoice ${number} — ${load.reference} (${lane})`,
        text: `Invoice ${number} for load ${load.reference} is attached.\n\nAmount due: $${(amountCents / 100).toFixed(2)}\nDue date: ${dueOn}\nRemit to:\n${remitTo}\n\n${carrier.name}`,
        attachments,
      })
      emailed = true
      await query(
        `UPDATE hub.invoices SET status = 'sent', sent_log = sent_log || $2::jsonb, updated_at = NOW() WHERE id = $1 AND carrier_id = $3`,
        [invoice.id, JSON.stringify([{ to: customer.billing_email, at: new Date().toISOString(), kind: "invoice" }]), carrierId]
      )
      invoice.status = "sent"
    } catch (err) {
      error = err instanceof Error ? err.message : "Email failed"
    }
  }

  await changeLoadStatus(carrierId, loadId, "invoiced", actor)
  return { invoice, emailed, error }
}

export async function recordPayment(
  carrierId: string,
  invoiceId: string,
  input: { amountCents: number; paidOn: string; method?: string | null; reference?: string | null },
  actor: { id: string; name: string }
): Promise<Invoice> {
  // Every caller (office form, QBO sync, factor webhook) validates upstream,
  // but the status derivation below trusts amountCents blindly — a zero or
  // negative amount would insert a junk payment row and rewrite the invoice's
  // status off it, so the invariant is enforced here too.
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Payment amount must be a positive number of cents")
  }
  const invoice = await getInvoice(carrierId, invoiceId)
  if (!invoice) throw new Error("Invoice not found")

  // Insert + status derivation must be atomic: two concurrent payments both
  // reading the pre-insert paid_cents can leave a fully-paid invoice stuck at
  // 'partial'. Lock the invoice row and derive the new status from a live SUM
  // over hub.payments (including the just-inserted row) in the same statement.
  let newStatus: string
  const client = await hubDb().connect()
  try {
    await client.query("BEGIN")
    await client.query(`SELECT id FROM hub.invoices WHERE id = $1 AND carrier_id = $2 FOR UPDATE`, [invoiceId, carrierId])
    await client.query(
      `INSERT INTO hub.payments (carrier_id, invoice_id, amount_cents, paid_on, method, reference)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [carrierId, invoiceId, input.amountCents, input.paidOn, input.method ?? null, input.reference ?? null]
    )
    const { rows } = await client.query<{ status: string }>(
      `UPDATE hub.invoices SET status = CASE
         WHEN (SELECT COALESCE(SUM(amount_cents), 0) FROM hub.payments WHERE invoice_id = $1 AND carrier_id = $2) >= amount_cents
         THEN 'paid' ELSE 'partial' END,
       updated_at = NOW()
       WHERE id = $1 AND carrier_id = $2
       RETURNING status`,
      [invoiceId, carrierId]
    )
    newStatus = rows[0].status
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "payment", entityId: invoiceId, action: "record",
    newValue: { amountCents: input.amountCents, paidOn: input.paidOn, newStatus },
  })

  if (newStatus === "paid") {
    const load = await getLoad(carrierId, invoice.load_id)
    if (load && load.status === "invoiced") {
      await changeLoadStatus(carrierId, load.id, "paid", actor)
      // If the driver settlement already happened, the load is fully closed.
      if (load.settlement_id) await changeLoadStatus(carrierId, load.id, "settled", actor)
    }
  }
  return (await getInvoice(carrierId, invoiceId))!
}

export async function setInvoiceStatus(
  carrierId: string,
  invoiceId: string,
  status: "disputed" | "sent",
  actor: { id: string; name: string }
): Promise<void> {
  await query(
    `UPDATE hub.invoices SET status = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
    [carrierId, invoiceId, status]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoiceId, action: `status:${status}`,
  })
}

// ---- AR aging ----

export interface AgingSummary {
  buckets: Record<AgingBucket, number>
  totalOpenCents: number
  invoices: (Invoice & { bucket: AgingBucket; open_cents: number })[]
}

export async function getAgingSummary(carrierId: string): Promise<AgingSummary> {
  const invoices = await query<Invoice>(
    `${INVOICE_SELECT} WHERE i.carrier_id = $1 AND i.status NOT IN ('paid') ORDER BY i.due_on ASC`,
    [carrierId]
  )
  const buckets: Record<AgingBucket, number> = {
    current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0,
  }
  const now = new Date()
  const detailed = invoices.map((invoice) => {
    const openCents = invoice.amount_cents - (invoice.paid_cents ?? 0)
    const bucket = agingBucket(new Date(invoice.due_on), now)
    buckets[bucket] += openCents
    return { ...invoice, bucket, open_cents: openCents }
  })
  return {
    buckets,
    totalOpenCents: detailed.reduce((sum, inv) => sum + inv.open_cents, 0),
    invoices: detailed,
  }
}

/** Days past due at which a dunning email goes out. */
const REMINDER_RUNGS = [3, 10, 20] as const

/**
 * Which rung this invoice is owed, given how far past due it is and what has
 * already gone out (sent_log entries look like { kind: 'reminder-10d' }).
 *
 * Returns the HIGHEST crossed rung that has not been climbed yet, or null when
 * the ladder is up to date. The old check was `[3,10,20].includes(daysPast)`,
 * which only fired on the exact day: a cron that missed a run, or an invoice
 * that aged past 20 before anyone looked, was never chased again. Crossing a
 * rung is now enough, and climbing to a rung retires the ones below it so a
 * caught-up ladder never sends a softer reminder after a harder one.
 */
export function nextReminderRung(
  daysPast: number,
  sentLog: { kind?: string }[] | null | undefined
): number | null {
  const climbed = (Array.isArray(sentLog) ? sentLog : [])
    .map((entry) => /^reminder-(\d+)d$/.exec(String(entry?.kind ?? ""))?.[1])
    .map(Number)
    .filter((rung) => Number.isFinite(rung))
  const highestClimbed = climbed.length ? Math.max(...climbed) : 0
  const crossed = REMINDER_RUNGS.filter((rung) => daysPast >= rung)
  const target = crossed.length ? crossed[crossed.length - 1] : null
  return target !== null && target > highestClimbed ? target : null
}

/** Overdue reminder runner (cron): due+3/+10/+20 ladder, factored loads skipped. */
export async function runOverdueReminders(carrierId: string): Promise<{ sent: number; flaggedOverdue: number }> {
  const aging = await getAgingSummary(carrierId)
  const carrier = await getCarrier(carrierId)
  const settings = await getCarrierSettings(carrierId)
  let sent = 0
  let flaggedOverdue = 0
  const today = new Date()

  for (const invoice of aging.invoices) {
    if (invoice.factored || invoice.status === "disputed" || invoice.open_cents <= 0) continue
    const daysPast = Math.floor((today.getTime() - new Date(invoice.due_on).getTime()) / 86400000)
    if (daysPast <= 0) continue
    if (invoice.status !== "overdue") {
      await query(`UPDATE hub.invoices SET status = 'overdue', updated_at = NOW() WHERE id = $1 AND carrier_id = $2`, [invoice.id, carrierId])
      flaggedOverdue++
    }
    // One email per invoice per run, and never the same rung twice.
    const rung = nextReminderRung(daysPast, invoice.sent_log)
    if (rung === null) continue
    const customer = await getCustomer(carrierId, invoice.customer_id)
    if (!customer?.billing_email) continue
    try {
      const transport = createMailTransport()
      await transport.sendMail({
        from: mailFrom(carrier?.name ?? "Accounts Receivable"),
        to: customer.billing_email,
        cc: daysPast >= 20 ? settings.notifications.officeEmail ?? undefined : undefined,
        subject: `Past due: Invoice ${invoice.number} (${daysPast} days)`,
        text: `Invoice ${invoice.number} for load ${invoice.load_reference} was due on ${String(invoice.due_on).slice(0, 10)}.\nOpen balance: $${(invoice.open_cents / 100).toFixed(2)}.\n\nPlease remit to:\n${invoice.remit_to}\n\n${carrier?.name ?? ""}`,
      })
      await query(
        `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1 AND carrier_id = $3`,
        [invoice.id, JSON.stringify([{ to: customer.billing_email, at: new Date().toISOString(), kind: `reminder-${rung}d` }]), carrierId]
      )
      sent++
    } catch { /* reminder failures surface via integration_syncs in cron route */ }
  }
  return { sent, flaggedOverdue }
}

// ---- Customer statements ----

export interface CustomerStatement {
  customerId: string
  customerName: string
  billingEmail: string | null
  totalOpenCents: number
  buckets: Record<AgingBucket, number>
  invoices: (Invoice & { bucket: AgingBucket; open_cents: number })[]
}

async function loadOpenInvoicesByCustomer(
  carrierId: string,
  customerId?: string
): Promise<(Invoice & { billing_email: string | null })[]> {
  const params: unknown[] = [carrierId]
  let where = `i.carrier_id = $1 AND i.status NOT IN ('paid')`
  if (customerId) {
    params.push(customerId)
    where += ` AND i.customer_id = $${params.length}`
  }
  return query<Invoice & { billing_email: string | null }>(
    `SELECT i.*, c.name AS customer_name, c.billing_email, l.reference AS load_reference,
       COALESCE((SELECT SUM(amount_cents) FROM hub.payments WHERE invoice_id = i.id AND carrier_id = i.carrier_id), 0)::int AS paid_cents
     FROM hub.invoices i
     JOIN hub.customers c ON c.id = i.customer_id AND c.carrier_id = i.carrier_id
     JOIN hub.loads l ON l.id = i.load_id AND l.carrier_id = i.carrier_id
     WHERE ${where}
     ORDER BY c.name, i.due_on`,
    params
  )
}

function groupStatementsByCustomer(
  rows: (Invoice & { billing_email: string | null })[]
): CustomerStatement[] {
  const now = new Date()
  const byCustomer = new Map<string, CustomerStatement>()
  for (const row of rows) {
    const openCents = row.amount_cents - (row.paid_cents ?? 0)
    if (openCents <= 0) continue
    const bucket = agingBucket(new Date(row.due_on), now)
    let stmt = byCustomer.get(row.customer_id)
    if (!stmt) {
      stmt = {
        customerId: row.customer_id,
        customerName: row.customer_name ?? "—",
        billingEmail: row.billing_email,
        totalOpenCents: 0,
        buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        invoices: [],
      }
      byCustomer.set(row.customer_id, stmt)
    }
    stmt.totalOpenCents += openCents
    stmt.buckets[bucket] += openCents
    stmt.invoices.push({ ...row, bucket, open_cents: openCents })
  }
  return Array.from(byCustomer.values()).sort((a, b) => b.totalOpenCents - a.totalOpenCents)
}

/** Per-customer AR rollup for the "Customer statements" panel on the money page. */
export async function getCustomerStatements(carrierId: string): Promise<CustomerStatement[]> {
  return groupStatementsByCustomer(await loadOpenInvoicesByCustomer(carrierId))
}

export async function getCustomerStatementDetail(
  carrierId: string,
  customerId: string
): Promise<CustomerStatement | null> {
  const rows = await loadOpenInvoicesByCustomer(carrierId, customerId)
  return groupStatementsByCustomer(rows)[0] ?? null
}

/** Emails every open invoice for one customer as a single statement PDF (AR aging, one click). */
export async function sendCustomerStatement(
  carrierId: string,
  customerId: string,
  actor: { id: string; name: string }
): Promise<{ emailed: boolean; to?: string; totalOpenCents: number; invoiceCount: number; error?: string }> {
  const statement = await getCustomerStatementDetail(carrierId, customerId)
  if (!statement) throw new Error("No open invoices for this customer")
  if (!statement.billingEmail) throw new Error("No billing email on file for this customer")

  const carrier = await getCarrier(carrierId)
  if (!isEmailConfigured()) {
    return {
      emailed: false,
      totalOpenCents: statement.totalOpenCents,
      invoiceCount: statement.invoices.length,
      error: "Email not configured (set SMTP_USER/SMTP_PASS) — download the PDF from the money page and send it manually.",
    }
  }

  const settings = await getCarrierSettings(carrierId)
  const pdfBytes = await buildStatementPdf({
    brand: {
      name: carrier?.name ?? "Thind Transport", address: carrier?.address, phone: carrier?.phone,
      email: carrier?.email, dot: carrier?.dot_number, mc: carrier?.mc_number,
      accent: settings.branding.accent,
    },
    customerName: statement.customerName,
    statementDate: new Date().toISOString().slice(0, 10),
    invoices: statement.invoices.map((inv) => ({
      number: inv.number, loadReference: inv.load_reference ?? "—", dueOn: String(inv.due_on).slice(0, 10),
      bucket: inv.bucket, openCents: inv.open_cents,
    })),
    totalOpenCents: statement.totalOpenCents,
  })

  const transport = createMailTransport()
  await transport.sendMail({
    from: mailFrom(carrier?.name ?? "Accounts Receivable"),
    to: statement.billingEmail,
    subject: `Statement of account — ${carrier?.name ?? "Thind Transport"} (${statement.invoices.length} open invoice${statement.invoices.length === 1 ? "" : "s"})`,
    text: `Attached is your current statement of account.\n\nOpen balance: $${(statement.totalOpenCents / 100).toFixed(2)}\nOpen invoices: ${statement.invoices.map((i) => i.number).join(", ")}\n\n${carrier?.name ?? ""}`,
    attachments: [{
      filename: `statement-${statement.customerName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`,
      content: Buffer.from(pdfBytes), contentType: "application/pdf",
    }],
  })

  const sentAt = new Date().toISOString()
  await query(
    `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = ANY($1::uuid[]) AND carrier_id = $3`,
    [statement.invoices.map((inv) => inv.id), JSON.stringify([{ to: statement.billingEmail, at: sentAt, kind: "statement" }]), carrierId]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "customer", entityId: customerId, action: "statement-sent",
    newValue: { to: statement.billingEmail, totalOpenCents: statement.totalOpenCents, invoiceCount: statement.invoices.length },
  })

  return {
    emailed: true, to: statement.billingEmail,
    totalOpenCents: statement.totalOpenCents, invoiceCount: statement.invoices.length,
  }
}

/** Factoring packet: invoice + rate con + POD emailed to the factor. */
export async function sendFactoringPacket(
  carrierId: string,
  invoiceId: string,
  actor: { id: string; name: string }
): Promise<{ to: string }> {
  const invoice = await getInvoice(carrierId, invoiceId)
  if (!invoice) throw new Error("Invoice not found")
  const settings = await getCarrierSettings(carrierId)
  if (!settings.factoring.email) throw new Error("No factoring company email configured in settings")
  const carrier = await getCarrier(carrierId)

  const attachments: { filename: string; content: Buffer }[] = []
  // Read disk/blob directly rather than fetching the URL — see the note on the
  // invoice-email attachments above. A factoring packet that silently drops the
  // rate con or POD gets the submission rejected, so a miss must not be silent
  // in the same way a customer-email miss is.
  const missing: string[] = []
  const attachDoc = async (url: string, storage: HubDocument["storage"] | null, filename: string) => {
    const bytes = await readStoredFileBytes(url, storage)
    if (bytes) attachments.push({ filename, content: bytes })
    else missing.push(filename)
  }
  // Generated invoice PDFs have no hub.documents row, so no storage column —
  // readStoredFileBytes falls back to the rule they were written by.
  if (invoice.pdf_url) await attachDoc(invoice.pdf_url, null, `${invoice.number}.pdf`)
  const docs = await listDocuments(carrierId, "load", invoice.load_id)
  for (const doc of docs.filter((d) => ["rate_confirmation", "pod"].includes(d.kind))) {
    await attachDoc(doc.url, doc.storage, `${doc.kind}-${doc.file_name}`)
  }
  if (missing.length > 0) {
    throw new Error(
      `Could not read ${missing.join(", ")} — the factor would receive an incomplete packet. ` +
      `Re-upload the missing document and submit again.`
    )
  }

  const transport = createMailTransport()
  await transport.sendMail({
    from: mailFrom(carrier?.name ?? "Factoring"),
    to: settings.factoring.email,
    subject: `Factoring submission: ${invoice.number} / ${invoice.load_reference}`,
    text: `Submitting invoice ${invoice.number} ($${(invoice.amount_cents / 100).toFixed(2)}) for purchase.\nLoad: ${invoice.load_reference}\nDebtor: ${invoice.customer_name}\n\n${carrier?.name ?? ""}`,
    attachments,
  })
  await query(
    `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1 AND carrier_id = $3`,
    [invoice.id, JSON.stringify([{ to: settings.factoring.email, at: new Date().toISOString(), kind: "factoring-packet" }]), carrierId]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoiceId, action: "factoring-packet",
    newValue: { to: settings.factoring.email },
  })
  return { to: settings.factoring.email }
}
