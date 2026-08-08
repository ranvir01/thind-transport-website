/**
 * Insurance renewal packet (research wave 2, prompt-13).
 *
 * The premium is won 90–120 days before renewal: underwriters price the
 * submission in front of them, and an incomplete one gets the lazy quote.
 * LoadOff already holds ~80% of what a submission needs — drivers with
 * CDL/med dates, VINs, IFTA-measured mileage, maintenance history,
 * incidents with DOT-recordable flags, DVIR posture. This assembles that
 * 80% into one dated PDF; the owner attaches only loss runs and current
 * declarations pages, the two documents only the incumbent insurer can
 * produce.
 *
 * Facts only: every line below is read from the carrier's own records.
 * Nothing is estimated and nothing is embellished — an underwriting
 * document is the last place for either.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { query, queryOne } from "./db"
import { getCarrier } from "./settings"
import { storeGeneratedPdf } from "./documents"

export interface RenewalData {
  carrier: {
    name: string
    dot_number: string | null
    mc_number: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
  generatedOn: string
  trucks: {
    unit_number: string
    year: number | null
    make: string | null
    model: string | null
    vin: string | null
    plate: string | null
    plate_state: string | null
    ownership: string
    insurance_expiry: string | null
  }[]
  trailers: {
    unit_number: string
    year: number | null
    make: string | null
    type: string
    vin: string | null
    plate: string | null
  }[]
  drivers: {
    first_name: string
    last_name: string
    hire_date: string | null
    cdl_number: string | null
    cdl_state: string | null
    cdl_expiry: string | null
    medical_card_expiry: string | null
  }[]
  iftaQuarters: {
    quarter: string
    status: string
    fleet_miles: string | null
    fleet_gallons: string | null
    mpg: string | null
  }[]
  incidents: {
    occurred_at: string
    location: string | null
    description: string | null
    dot_recordable: boolean | null
  }[]
  claims: { kind: string; status: string; n: number }[]
  dvirs: { total: number; with_defects: number; unsafe: number }
  maintenance: { records12mo: number; costCents12mo: number; schedules: number }
}

export async function collectRenewalData(carrierId: string, now = new Date()): Promise<RenewalData> {
  const carrier = await getCarrier(carrierId)
  if (!carrier) throw new Error("Carrier not found")

  const cutoff24mo = new Date(now.getTime() - 730 * 86_400_000).toISOString()
  const cutoff12mo = new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10)
  const cutoff90d = new Date(now.getTime() - 90 * 86_400_000).toISOString()

  const [trucks, trailers, drivers, iftaQuarters, incidents, claims, dvirs, maint, schedules] =
    await Promise.all([
      query<RenewalData["trucks"][number]>(
        `SELECT unit_number, year, make, model, vin, plate, plate_state, ownership, insurance_expiry
         FROM hub.trucks WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'
         ORDER BY unit_number`,
        [carrierId]
      ),
      query<RenewalData["trailers"][number]>(
        `SELECT unit_number, year, make, type, vin, plate
         FROM hub.trailers WHERE carrier_id = $1 AND deleted_at IS NULL AND status <> 'retired'
         ORDER BY unit_number`,
        [carrierId]
      ),
      query<RenewalData["drivers"][number]>(
        `SELECT first_name, last_name, hire_date, cdl_number, cdl_state, cdl_expiry, medical_card_expiry
         FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'
         ORDER BY last_name, first_name`,
        [carrierId]
      ),
      query<RenewalData["iftaQuarters"][number]>(
        `SELECT quarter, status, fleet_miles, fleet_gallons, mpg
         FROM hub.ifta_reports WHERE carrier_id = $1 ORDER BY quarter DESC LIMIT 4`,
        [carrierId]
      ),
      query<RenewalData["incidents"][number]>(
        `SELECT occurred_at, location, description, dot_recordable
         FROM hub.incidents WHERE carrier_id = $1 AND occurred_at >= $2
         ORDER BY occurred_at DESC`,
        [carrierId, cutoff24mo]
      ),
      query<RenewalData["claims"][number]>(
        `SELECT kind, status, COUNT(*)::int AS n
         FROM hub.claims WHERE carrier_id = $1 GROUP BY kind, status ORDER BY kind, status`,
        [carrierId]
      ),
      queryOne<RenewalData["dvirs"]>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE jsonb_array_length(defects) > 0)::int AS with_defects,
                COUNT(*) FILTER (WHERE NOT safe_to_operate)::int AS unsafe
         FROM hub.dvirs WHERE carrier_id = $1 AND created_at >= $2`,
        [carrierId, cutoff90d]
      ),
      queryOne<{ records: number; cost_cents: string }>(
        `SELECT COUNT(*)::int AS records, COALESCE(SUM(cost_cents), 0)::bigint AS cost_cents
         FROM hub.maintenance_records WHERE carrier_id = $1 AND done_on >= $2`,
        [carrierId, cutoff12mo]
      ),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM hub.maintenance_schedules WHERE carrier_id = $1`,
        [carrierId]
      ),
    ])

  return {
    carrier: {
      name: carrier.name, dot_number: carrier.dot_number, mc_number: carrier.mc_number,
      phone: carrier.phone, email: carrier.email, address: carrier.address,
    },
    generatedOn: now.toISOString().slice(0, 10),
    trucks, trailers, drivers, iftaQuarters, incidents, claims,
    dvirs: dvirs ?? { total: 0, with_defects: 0, unsafe: 0 },
    maintenance: {
      records12mo: maint?.records ?? 0,
      costCents12mo: Number(maint?.cost_cents ?? 0),
      schedules: schedules?.n ?? 0,
    },
  }
}

const fmtDate = (d: unknown): string => {
  if (!d) return "—"
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}
const fmtMoney = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const trunc = (s: string | null, n: number): string => {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

/** Pure over collected data — testable without a database. */
export async function renderRenewalPdf(data: RenewalData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.12, 0.16)

  let page: PDFPage = pdf.addPage([612, 792])
  let y = 748

  const ensure = (needed: number) => {
    if (y - needed < 48) {
      page = pdf.addPage([612, 792])
      y = 748
    }
  }
  const line = (text: string, opts: { bold?: boolean; size?: number; gap?: number; x?: number } = {}) => {
    ensure(opts.gap ?? 14)
    page.drawText(text, {
      x: opts.x ?? 54, y, size: opts.size ?? 9.5, font: opts.bold ? bold : font, color: ink,
      maxWidth: 612 - (opts.x ?? 54) - 54, lineHeight: 12,
    })
    y -= opts.gap ?? 14
  }
  const row = (cells: { x: number; text: string; bold?: boolean }[], gap = 13) => {
    ensure(gap)
    for (const cell of cells) {
      page.drawText(cell.text, {
        x: cell.x, y, size: 8.5, font: cell.bold ? (bold as PDFFont) : font, color: ink,
      })
    }
    y -= gap
  }
  const heading = (text: string) => {
    ensure(34)
    y -= 8
    line(text, { bold: true, size: 12, gap: 18 })
  }

  const c = data.carrier
  line("INSURANCE RENEWAL SUBMISSION", { bold: true, size: 16, gap: 22 })
  line(`${c.name}  ·  USDOT ${c.dot_number ?? "—"}  ·  MC ${c.mc_number ?? "—"}`, { size: 11, gap: 15 })
  line(`${c.address ?? ""}   ${c.phone ?? ""}   ${c.email ?? ""}`.trim(), { gap: 13 })
  line(`Generated ${data.generatedOn} by LoadOff from this carrier's live operating records.`, { gap: 13 })

  heading(`Power units (${data.trucks.length})`)
  row([
    { x: 54, text: "Unit", bold: true }, { x: 90, text: "Year/Make/Model", bold: true },
    { x: 240, text: "VIN", bold: true }, { x: 390, text: "Plate", bold: true },
    { x: 455, text: "Ownership", bold: true }, { x: 520, text: "Ins. expiry", bold: true },
  ])
  for (const t of data.trucks) {
    row([
      { x: 54, text: t.unit_number },
      { x: 90, text: trunc(`${t.year ?? ""} ${t.make ?? ""} ${t.model ?? ""}`, 30) },
      { x: 240, text: t.vin ?? "—" },
      { x: 390, text: `${t.plate ?? "—"}${t.plate_state ? ` ${t.plate_state}` : ""}` },
      { x: 455, text: t.ownership === "owner_operator" ? "owner-op" : "company" },
      { x: 520, text: fmtDate(t.insurance_expiry) },
    ])
  }

  heading(`Trailers (${data.trailers.length})`)
  row([
    { x: 54, text: "Unit", bold: true }, { x: 90, text: "Year/Make", bold: true },
    { x: 220, text: "Type", bold: true }, { x: 290, text: "VIN", bold: true },
    { x: 455, text: "Plate", bold: true },
  ])
  for (const t of data.trailers) {
    row([
      { x: 54, text: t.unit_number },
      { x: 90, text: trunc(`${t.year ?? ""} ${t.make ?? ""}`, 24) },
      { x: 220, text: t.type.replace("_", " ") },
      { x: 290, text: t.vin ?? "—" },
      { x: 455, text: t.plate ?? "—" },
    ])
  }

  heading(`Drivers (${data.drivers.length} active)`)
  row([
    { x: 54, text: "Name", bold: true }, { x: 190, text: "Hired", bold: true },
    { x: 255, text: "CDL", bold: true }, { x: 390, text: "CDL expiry", bold: true },
    { x: 470, text: "Med card", bold: true },
  ])
  for (const d of data.drivers) {
    row([
      { x: 54, text: trunc(`${d.last_name}, ${d.first_name}`, 28) },
      { x: 190, text: fmtDate(d.hire_date) },
      { x: 255, text: `${d.cdl_number ?? "—"}${d.cdl_state ? ` (${d.cdl_state})` : ""}` },
      { x: 390, text: fmtDate(d.cdl_expiry) },
      { x: 470, text: fmtDate(d.medical_card_expiry) },
    ])
  }

  heading("Operations — IFTA-measured mileage (most recent quarters)")
  if (data.iftaQuarters.length === 0) {
    line("No IFTA reports computed yet.", { gap: 13 })
  } else {
    row([
      { x: 54, text: "Quarter", bold: true }, { x: 130, text: "Status", bold: true },
      { x: 210, text: "Fleet miles", bold: true }, { x: 310, text: "Gallons", bold: true },
      { x: 400, text: "MPG", bold: true },
    ])
    for (const q of data.iftaQuarters) {
      row([
        { x: 54, text: q.quarter }, { x: 130, text: q.status },
        { x: 210, text: q.fleet_miles ? Number(q.fleet_miles).toLocaleString("en-US") : "—" },
        { x: 310, text: q.fleet_gallons ? Number(q.fleet_gallons).toLocaleString("en-US") : "—" },
        { x: 400, text: q.mpg ? Number(q.mpg).toFixed(2) : "—" },
      ])
    }
    line("State-by-state jurisdiction detail is available from LoadOff's IFTA exports on request.", { gap: 13 })
  }

  const recordable = data.incidents.filter((i) => i.dot_recordable === true).length
  heading(`Loss history — incidents, last 24 months (${data.incidents.length} total, ${recordable} DOT-recordable)`)
  if (data.incidents.length === 0) {
    line("No incidents recorded in the last 24 months.", { gap: 13 })
  } else {
    for (const i of data.incidents.slice(0, 12)) {
      row([
        { x: 54, text: fmtDate(i.occurred_at) },
        { x: 130, text: trunc(i.location, 28) },
        { x: 300, text: trunc(i.description, 40) },
        { x: 520, text: i.dot_recordable ? "DOT-rec." : "" },
      ])
    }
    if (data.incidents.length > 12) {
      line(`…and ${data.incidents.length - 12} more on file in LoadOff.`, { gap: 13 })
    }
  }
  if (data.claims.length > 0) {
    line(
      `Claims on file: ${data.claims.map((cl) => `${cl.kind} ${cl.status} ×${cl.n}`).join(", ")}.`,
      { gap: 13 }
    )
  }

  heading("Safety & maintenance posture")
  line(
    `DVIRs, last 90 days: ${data.dvirs.total} filed · ${data.dvirs.with_defects} with defects noted · ` +
      `${data.dvirs.unsafe} marked not safe to operate.`,
    { gap: 13 }
  )
  line(
    `Maintenance, last 12 months: ${data.maintenance.records12mo} work records totaling ` +
      `${fmtMoney(data.maintenance.costCents12mo)} · ${data.maintenance.schedules} preventive-maintenance schedules tracked.`,
    { gap: 13 }
  )

  heading("To complete this submission, attach")
  line("1.  Loss runs (3–5 years) from the current insurer — request in writing; insurers must provide them.", { gap: 13 })
  line("2.  Current declarations pages for auto liability, cargo, and physical damage.", { gap: 13 })
  line("These are the only two items this packet cannot generate from operating records.", { gap: 13 })

  return pdf.save()
}

/** Most recently generated packet, for the compliance page's download link. */
export async function latestRenewalPacket(
  carrierId: string
): Promise<{ url: string; file_name: string; created_at: string } | null> {
  return queryOne<{ url: string; file_name: string; created_at: string }>(
    `SELECT url, file_name, created_at FROM hub.documents
     WHERE carrier_id = $1 AND entity_type = 'carrier' AND kind = 'insurance_renewal'
     ORDER BY created_at DESC LIMIT 1`,
    [carrierId]
  )
}

/** Generate, store, and index the packet as a carrier document. */
export async function buildRenewalPacket(
  carrierId: string,
  actor: { id: string },
  now = new Date()
): Promise<{ id: string; url: string; file_name: string }> {
  const data = await collectRenewalData(carrierId, now)
  const bytes = await renderRenewalPdf(data)
  const fileName = `insurance-renewal-packet-${data.generatedOn}.pdf`
  const url = await storeGeneratedPdf(fileName, bytes)
  const storage = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local"
  const rows = await query<{ id: string; url: string; file_name: string }>(
    `INSERT INTO hub.documents (carrier_id, entity_type, entity_id, kind, file_name, mime_type, size_bytes, storage, url, uploaded_by)
     VALUES ($1, 'carrier', $1, 'insurance_renewal', $2, 'application/pdf', $3, $4, $5, $6)
     RETURNING id, url, file_name`,
    [carrierId, fileName, bytes.length, storage, url, actor.id]
  )
  return rows[0]!
}
