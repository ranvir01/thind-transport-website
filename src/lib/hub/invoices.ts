import { query, queryOne } from "./db"
import { getCarrier, getCarrierSettings, nextInvoiceNumber } from "./settings"
import { getLoad, getLoadStops, changeLoadStatus } from "./loads"
import { getCustomer } from "./customers"
import { listDocuments, storeGeneratedPdf } from "./documents"
import { buildInvoicePdf } from "./pdf"
import { invoiceTotalCents, agingBucket, type AgingBucket } from "./money"
import { logAudit } from "./audit"
import { createMailTransport, mailFrom } from "@/lib/mailer"
import { loadTotalCents, type Invoice } from "./types"

const INVOICE_SELECT = `
  SELECT i.*, c.name AS customer_name, l.reference AS load_reference,
    COALESCE((SELECT SUM(amount_cents) FROM hub.payments WHERE invoice_id = i.id), 0)::int AS paid_cents
  FROM hub.invoices i
  JOIN hub.customers c ON c.id = i.customer_id
  JOIN hub.loads l ON l.id = i.load_id
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
    getLoadStops(loadId),
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
     VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10) RETURNING *`,
    [carrierId, number, customer.id, loadId, amountCents, issuedOn, dueOn, factored, remitTo, pdfUrl]
  )
  const invoice = rows[0]

  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoice.id, action: "create",
    newValue: { number, amountCents, factored },
  })

  // Email with POD + BOL attached (best effort; invoice stays usable without SMTP)
  let emailed = false
  let error: string | undefined
  if (customer.billing_email) {
    try {
      const docs = await listDocuments("load", loadId)
      const attachments: { filename: string; content: Buffer; contentType?: string }[] = [
        { filename: `${number}.pdf`, content: Buffer.from(pdfBytes), contentType: "application/pdf" },
      ]
      for (const doc of docs.filter((d) => ["pod", "bol"].includes(d.kind))) {
        try {
          const res = await fetch(
            doc.url.startsWith("http") ? doc.url : `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}${doc.url}`
          )
          if (res.ok) {
            attachments.push({
              filename: `${doc.kind.toUpperCase()}-${doc.file_name}`,
              content: Buffer.from(await res.arrayBuffer()),
            })
          }
        } catch { /* attachment fetch is best-effort */ }
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
        `UPDATE hub.invoices SET status = 'sent', sent_log = sent_log || $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [invoice.id, JSON.stringify([{ to: customer.billing_email, at: new Date().toISOString(), kind: "invoice" }])]
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
  const invoice = await getInvoice(carrierId, invoiceId)
  if (!invoice) throw new Error("Invoice not found")

  await query(
    `INSERT INTO hub.payments (carrier_id, invoice_id, amount_cents, paid_on, method, reference)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [carrierId, invoiceId, input.amountCents, input.paidOn, input.method ?? null, input.reference ?? null]
  )
  const paidTotal = (invoice.paid_cents ?? 0) + input.amountCents
  const newStatus = paidTotal >= invoice.amount_cents ? "paid" : "partial"
  await query(`UPDATE hub.invoices SET status = $2, updated_at = NOW() WHERE id = $1`, [invoiceId, newStatus])
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

/** Overdue reminder runner (cron): due+3/+10/+20 days, factored loads skipped. */
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
      await query(`UPDATE hub.invoices SET status = 'overdue', updated_at = NOW() WHERE id = $1`, [invoice.id])
      flaggedOverdue++
    }
    if (![3, 10, 20].includes(daysPast)) continue
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
        `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1`,
        [invoice.id, JSON.stringify([{ to: customer.billing_email, at: new Date().toISOString(), kind: `reminder-${daysPast}d` }])]
      )
      sent++
    } catch { /* reminder failures surface via integration_syncs in cron route */ }
  }
  return { sent, flaggedOverdue }
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
  const fetchDoc = async (url: string, filename: string) => {
    try {
      const res = await fetch(url.startsWith("http") ? url : `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}${url}`)
      if (res.ok) attachments.push({ filename, content: Buffer.from(await res.arrayBuffer()) })
    } catch { /* best effort */ }
  }
  if (invoice.pdf_url) await fetchDoc(invoice.pdf_url, `${invoice.number}.pdf`)
  const docs = await listDocuments("load", invoice.load_id)
  for (const doc of docs.filter((d) => ["rate_confirmation", "pod"].includes(d.kind))) {
    await fetchDoc(doc.url, `${doc.kind}-${doc.file_name}`)
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
    `UPDATE hub.invoices SET sent_log = sent_log || $2::jsonb WHERE id = $1`,
    [invoice.id, JSON.stringify([{ to: settings.factoring.email, at: new Date().toISOString(), kind: "factoring-packet" }])]
  )
  await logAudit({
    carrierId, actorId: actor.id, actorName: actor.name,
    entityType: "invoice", entityId: invoiceId, action: "factoring-packet",
    newValue: { to: settings.factoring.email },
  })
  return { to: settings.factoring.email }
}
