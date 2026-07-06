/**
 * Branded PDF generation (pdf-lib): invoices, settlement statements, and the
 * IFTA quarterly worksheet share one simple document builder.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { fmtCentsExact } from "./types"

/**
 * pdf-lib's StandardFonts use WinAnsi encoding and THROW on characters outside
 * it ("WinAnsi cannot encode \u{2192}") — which took down invoice creation for
 * every load, because lanes are rendered "Kent, WA \u{2192} Boise, ID". App strings
 * keep their typography; this sanitizer runs at the PDF boundary only.
 */
const WINANSI_MAP: Record<string, string> = {
  "\u2192": "->", "\u2190": "<-", "\u2194": "<->",
  "\u2013": "-", "\u2014": "-", "\u2212": "-",
  "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
  "\u2026": "...", "\u2022": "-", "\u00A0": " ",
}

export function winAnsiSafe(value: string): string {
  let out = value.replace(/[\u2190\u2192\u2194\u2013\u2014\u2212\u2018\u2019\u201C\u201D\u2026\u2022\u00A0]/g, (ch) => WINANSI_MAP[ch] ?? "?")
  // De-accent anything decomposable (NFKD strips combining marks), then drop
  // whatever still falls outside Latin-1 — a "?" beats a crashed invoice.
  out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  return out.replace(/[^\x00-\xFF]/g, "?")
}

const NAVY = rgb(0.055, 0.086, 0.129)
const GOLD = rgb(0.949, 0.663, 0)
const GRAY = rgb(0.35, 0.39, 0.45)
const LIGHT = rgb(0.92, 0.94, 0.96)

export interface PdfBrand {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  dot?: string | null
  mc?: string | null
}

interface TableColumn {
  header: string
  width: number
  align?: "left" | "right"
}

class DocBuilder {
  page: PDFPage
  y: number
  constructor(
    readonly doc: PDFDocument,
    readonly fonts: { regular: PDFFont; bold: PDFFont }
  ) {
    this.page = doc.addPage([612, 792]) // US Letter
    this.y = 740
  }

  ensureRoom(height: number) {
    if (this.y - height < 50) {
      this.page = this.doc.addPage([612, 792])
      this.y = 740
    }
  }

  header(rawBrand: PdfBrand, rawTitle: string) {
    const brand: PdfBrand = {
      ...rawBrand,
      name: winAnsiSafe(rawBrand.name),
      address: rawBrand.address ? winAnsiSafe(rawBrand.address) : rawBrand.address,
      phone: rawBrand.phone ? winAnsiSafe(rawBrand.phone) : rawBrand.phone,
      email: rawBrand.email ? winAnsiSafe(rawBrand.email) : rawBrand.email,
    }
    const title = winAnsiSafe(rawTitle)
    this.page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: NAVY })
    this.page.drawText(brand.name.toUpperCase(), {
      x: 40, y: 766, size: 16, font: this.fonts.bold, color: rgb(1, 1, 1),
    })
    this.page.drawText(title.toUpperCase(), {
      x: 612 - 40 - this.fonts.bold.widthOfTextAtSize(title.toUpperCase(), 13),
      y: 767, size: 13, font: this.fonts.bold, color: GOLD,
    })
    this.y = 738
    const meta = [
      brand.address, brand.phone, brand.email,
      [brand.dot ? `DOT ${brand.dot}` : null, brand.mc ? `MC ${brand.mc}` : null].filter(Boolean).join(" · "),
    ].filter((v): v is string => Boolean(v && v.length))
    for (const line of meta) {
      this.page.drawText(line, { x: 40, y: this.y, size: 8.5, font: this.fonts.regular, color: GRAY })
      this.y -= 11
    }
    this.y -= 8
  }

  text(rawValue: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) {
    const value = winAnsiSafe(rawValue)
    this.ensureRoom(16)
    this.page.drawText(value, {
      x: opts.x ?? 40, y: this.y, size: opts.size ?? 10,
      font: opts.bold ? this.fonts.bold : this.fonts.regular,
      color: opts.color ?? NAVY,
    })
    this.y -= (opts.size ?? 10) + 5
  }

  keyValue(rawPairs: [string, string][], x = 40) {
    const pairs = rawPairs.map(([k, v]) => [winAnsiSafe(k), winAnsiSafe(v)] as [string, string])
    for (const [key, value] of pairs) {
      this.ensureRoom(14)
      this.page.drawText(key, { x, y: this.y, size: 9, font: this.fonts.bold, color: GRAY })
      this.page.drawText(value, { x: x + 120, y: this.y, size: 9, font: this.fonts.regular, color: NAVY })
      this.y -= 13
    }
    this.y -= 4
  }

  table(rawColumns: TableColumn[], rawRows: string[][]) {
    const columns = rawColumns.map((c) => ({ ...c, header: winAnsiSafe(c.header) }))
    const rows = rawRows.map((r) => r.map((v) => winAnsiSafe(v ?? "")))
    this.ensureRoom(24)
    let x = 40
    this.page.drawRectangle({ x: 36, y: this.y - 4, width: 540, height: 17, color: NAVY })
    for (const col of columns) {
      const w = this.fonts.bold.widthOfTextAtSize(col.header, 8.5)
      this.page.drawText(col.header, {
        x: col.align === "right" ? x + col.width - w : x,
        y: this.y, size: 8.5, font: this.fonts.bold, color: rgb(1, 1, 1),
      })
      x += col.width
    }
    this.y -= 18
    let stripe = false
    for (const row of rows) {
      this.ensureRoom(15)
      if (stripe) {
        this.page.drawRectangle({ x: 36, y: this.y - 3.5, width: 540, height: 14.5, color: LIGHT })
      }
      stripe = !stripe
      x = 40
      for (let i = 0; i < columns.length; i++) {
        const value = row[i] ?? ""
        const col = columns[i]
        const w = this.fonts.regular.widthOfTextAtSize(value, 8.5)
        this.page.drawText(value, {
          x: col.align === "right" ? x + col.width - w : x,
          y: this.y, size: 8.5, font: this.fonts.regular, color: NAVY,
        })
        x += col.width
      }
      this.y -= 14.5
    }
    this.y -= 6
  }

  totalLine(rawLabel: string, rawValue: string) {
    const label = winAnsiSafe(rawLabel)
    const value = winAnsiSafe(rawValue)
    this.ensureRoom(20)
    const w = this.fonts.bold.widthOfTextAtSize(value, 12)
    this.page.drawText(label, { x: 360, y: this.y, size: 11, font: this.fonts.bold, color: NAVY })
    this.page.drawText(value, { x: 576 - w, y: this.y, size: 12, font: this.fonts.bold, color: NAVY })
    this.y -= 20
  }

  box(rawTitle: string, rawLines: string[]) {
    const title = winAnsiSafe(rawTitle)
    const lines = rawLines.map((l) => winAnsiSafe(l))
    const height = 16 + lines.length * 12 + 8
    this.ensureRoom(height)
    this.page.drawRectangle({
      x: 36, y: this.y - height + 12, width: 250, height,
      borderColor: GRAY, borderWidth: 0.8,
    })
    this.page.drawText(title, { x: 44, y: this.y - 2, size: 9, font: this.fonts.bold, color: GRAY })
    let ly = this.y - 16
    for (const line of lines) {
      this.page.drawText(line, { x: 44, y: ly, size: 9, font: this.fonts.regular, color: NAVY })
      ly -= 12
    }
    this.y -= height + 6
  }
}

async function newBuilder(): Promise<DocBuilder> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  return new DocBuilder(doc, { regular, bold })
}

// ---- Invoice ----

export interface InvoicePdfInput {
  brand: PdfBrand
  number: string
  issuedOn: string
  dueOn: string
  billTo: { name: string; address?: string | null; email?: string | null }
  loadReference: string
  customerReference?: string | null
  lane: string
  lines: { label: string; amountCents: number }[]
  totalCents: number
  remitTo: string
  factored: boolean
}

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const b = await newBuilder()
  b.header(input.brand, `Invoice ${input.number}`)
  b.keyValue([
    ["Invoice #", input.number],
    ["Issued", input.issuedOn],
    ["Due", input.dueOn],
    ["Load", `${input.loadReference}${input.customerReference ? ` / ${input.customerReference}` : ""}`],
    ["Lane", input.lane],
  ])
  b.text(`Bill to: ${input.billTo.name}`, { bold: true })
  if (input.billTo.address) b.text(input.billTo.address, { size: 9, color: GRAY })
  b.y -= 6
  b.table(
    [
      { header: "DESCRIPTION", width: 420 },
      { header: "AMOUNT", width: 120, align: "right" },
    ],
    input.lines.map((line) => [line.label, fmtCentsExact(line.amountCents)])
  )
  b.totalLine("TOTAL DUE", fmtCentsExact(input.totalCents))
  b.box(input.factored ? "REMIT TO (FACTORED — NOTICE OF ASSIGNMENT)" : "REMIT TO", input.remitTo.split("\n"))
  if (input.factored) {
    b.text("This invoice has been assigned. Payment must be made to the factor above.", { size: 8.5, color: GRAY })
  }
  return b.doc.save()
}

// ---- Customer statement (AR rollup, one PDF per customer) ----

export interface StatementPdfInput {
  brand: PdfBrand
  customerName: string
  statementDate: string
  invoices: { number: string; loadReference: string; dueOn: string; bucket: string; openCents: number }[]
  totalOpenCents: number
}

export async function buildStatementPdf(input: StatementPdfInput): Promise<Uint8Array> {
  const b = await newBuilder()
  b.header(input.brand, "Statement of Account")
  b.keyValue([
    ["Customer", input.customerName],
    ["Statement date", input.statementDate],
    ["Open invoices", String(input.invoices.length)],
  ])
  b.table(
    [
      { header: "INVOICE", width: 100 },
      { header: "LOAD", width: 120 },
      { header: "DUE", width: 90 },
      { header: "AGING", width: 90 },
      { header: "OPEN", width: 140, align: "right" },
    ],
    input.invoices.map((inv) => [
      inv.number,
      inv.loadReference,
      inv.dueOn,
      inv.bucket === "current" ? "Current" : `${inv.bucket} days`,
      fmtCentsExact(inv.openCents),
    ])
  )
  b.totalLine("TOTAL DUE", fmtCentsExact(input.totalOpenCents))
  return b.doc.save()
}

// ---- Settlement statement ----

export interface SettlementPdfInput {
  brand: PdfBrand
  driverName: string
  periodStart: string
  periodEnd: string
  lines: { kind: string; label: string; amountCents: number }[]
  grossCents: number
  deductionsCents: number
  netCents: number
}

export async function buildSettlementPdf(input: SettlementPdfInput): Promise<Uint8Array> {
  const b = await newBuilder()
  b.header(input.brand, "Driver Settlement")
  b.keyValue([
    ["Driver", input.driverName],
    ["Period", `${input.periodStart} — ${input.periodEnd}`],
  ])
  b.table(
    [
      { header: "TYPE", width: 90 },
      { header: "DESCRIPTION", width: 330 },
      { header: "AMOUNT", width: 120, align: "right" },
    ],
    input.lines.map((line) => [
      line.kind.toUpperCase(),
      line.label,
      `${line.kind === "deduction" ? "-" : ""}${fmtCentsExact(line.amountCents)}`,
    ])
  )
  b.totalLine("GROSS", fmtCentsExact(input.grossCents))
  b.totalLine("DEDUCTIONS", `-${fmtCentsExact(input.deductionsCents)}`)
  b.totalLine("NET PAY", fmtCentsExact(input.netCents))
  return b.doc.save()
}

// ---- IFTA worksheet ----

export interface IftaPdfInput {
  brand: PdfBrand
  quarter: string
  mileageSource: string
  fleetMiles: number
  fleetGallons: number
  mpg: number
  rows: {
    jurisdiction: string
    miles: number
    taxableGallons: number
    taxPaidGallons: number
    rate: number
    surchargeRate: number
    netCents: number
  }[]
  netTaxCents: number
}

export async function buildIftaPdf(input: IftaPdfInput): Promise<Uint8Array> {
  const b = await newBuilder()
  b.header(input.brand, `IFTA Worksheet ${input.quarter}`)
  b.keyValue([
    ["Quarter", input.quarter],
    ["Mileage source", input.mileageSource],
    ["Fleet miles", input.fleetMiles.toLocaleString("en-US")],
    ["Fleet gallons", input.fleetGallons.toLocaleString("en-US")],
    ["Fleet MPG", input.mpg.toFixed(4)],
  ])
  b.table(
    [
      { header: "JUR", width: 50 },
      { header: "MILES", width: 90, align: "right" },
      { header: "TAXABLE GAL", width: 95, align: "right" },
      { header: "TAX-PAID GAL", width: 95, align: "right" },
      { header: "RATE", width: 70, align: "right" },
      { header: "SURCH", width: 60, align: "right" },
      { header: "NET TAX", width: 80, align: "right" },
    ],
    input.rows.map((row) => [
      row.jurisdiction,
      row.miles.toLocaleString("en-US"),
      row.taxableGallons.toFixed(3),
      row.taxPaidGallons.toFixed(3),
      row.rate.toFixed(4),
      row.surchargeRate ? row.surchargeRate.toFixed(4) : "—",
      fmtCentsExact(row.netCents),
    ])
  )
  b.totalLine("NET TAX DUE (CREDIT)", fmtCentsExact(input.netTaxCents))
  b.text("Worksheet for transcription into the WA IFTA filing portal. Source data retained 4 years.", {
    size: 8.5, color: GRAY,
  })
  return b.doc.save()
}
