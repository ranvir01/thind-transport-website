/**
 * Carrier packet vault (Phase 5): every new broker asks for the same bundle —
 * W-9, COI, authority letter, NOA if factored, signed agreement. Store it
 * once, send it in one click, win the load before the slow carriers reply.
 */
import { promises as fs } from "fs"
import path from "path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { query } from "./db"
import { getCarrier } from "./settings"
import { saveDocument } from "./documents"
import type { HubDocument } from "./types"

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads")

export async function listPacketDocuments(carrierId: string): Promise<HubDocument[]> {
  return query<HubDocument>(
    `SELECT * FROM hub.documents WHERE carrier_id = $1 AND entity_type = 'carrier' AND entity_id = $1
     ORDER BY kind, created_at DESC`,
    [carrierId]
  )
}

/** Raw bytes for a stored document (local disk or blob URL). */
export async function readDocumentBytes(doc: HubDocument): Promise<Buffer | null> {
  try {
    if (doc.storage === "local") {
      const safeName = doc.url.split("/").pop()
      if (!safeName) return null
      return await fs.readFile(path.join(UPLOAD_DIR, safeName))
    }
    const response = await fetch(doc.url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

/** Email the current packet (latest doc per kind) as attachments. */
export async function emailPacket(
  carrierId: string,
  to: string,
  note: string | null
): Promise<{ sent: boolean; attached: number; missing: string[] }> {
  const carrier = await getCarrier(carrierId)
  const documents = await listPacketDocuments(carrierId)
  // Latest per kind only — brokers don't want three stale COIs.
  const latestByKind = new Map<string, HubDocument>()
  for (const doc of documents) {
    if (!latestByKind.has(doc.kind)) latestByKind.set(doc.kind, doc)
  }
  const wanted = ["w9", "insurance", "authority_letter", "noa", "agreement"]
  const attachments: { filename: string; content: Buffer }[] = []
  const missing: string[] = []
  for (const kind of wanted) {
    const doc = latestByKind.get(kind)
    if (!doc) {
      if (kind !== "noa" && kind !== "agreement") missing.push(kind)
      continue
    }
    const bytes = await readDocumentBytes(doc)
    if (bytes) attachments.push({ filename: doc.file_name, content: bytes })
  }
  if (attachments.length === 0) return { sent: false, attached: 0, missing }

  const { createMailTransport, mailFrom } = await import("@/lib/mailer")
  const transport = createMailTransport()
  await transport.sendMail({
    from: mailFrom(carrier?.name ?? "Carrier"),
    to,
    subject: `Carrier packet — ${carrier?.name ?? ""}${carrier?.mc_number ? ` (MC ${carrier.mc_number})` : ""}`,
    text:
      `${note?.trim() ? `${note.trim()}\n\n` : ""}` +
      `Attached: ${attachments.map((a) => a.filename).join(", ")}.\n\n` +
      `${carrier?.name ?? ""}${carrier?.dot_number ? ` · DOT ${carrier.dot_number}` : ""}${carrier?.mc_number ? ` · MC ${carrier.mc_number}` : ""}\n` +
      `${carrier?.phone ?? ""}`,
    attachments,
  })
  return { sent: true, attached: attachments.length, missing }
}

/** Generate + store a signed broker-carrier agreement PDF (canvas e-sign). */
export async function signBrokerAgreement(
  carrierId: string,
  customerId: string,
  input: { signerName: string; signerTitle: string; signatureDataUrl: string },
  actor: { id: string; name: string }
): Promise<HubDocument> {
  const carrier = await getCarrier(carrierId)
  // Tenancy hard-fail (AGENTS.md): a foreign or deleted customer id must not get an
  // agreement PDF, document row, or CRM note attached to it — refuse before any write.
  const customer = await query<{ name: string; mc_number: string | null }>(
    `SELECT name, mc_number FROM hub.customers WHERE carrier_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [carrierId, customerId]
  )
  if (!customer[0]) throw new Error("Customer not found")
  const customerName = customer[0].name

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let y = 740

  const draw = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    page.drawText(text, {
      x: 54, y, size: opts.size ?? 10, font: opts.bold ? bold : font, color: rgb(0.1, 0.12, 0.16),
      maxWidth: 504, lineHeight: 13,
    })
    y -= opts.gap ?? 16
  }

  draw("BROKER–CARRIER AGREEMENT", { bold: true, size: 16, gap: 26 })
  draw(`Carrier: ${carrier?.name ?? ""}  ·  DOT ${carrier?.dot_number ?? "—"}  ·  MC ${carrier?.mc_number ?? "—"}`, { gap: 16 })
  draw(`Broker: ${customerName}${customer[0].mc_number ? `  ·  MC ${customer[0].mc_number}` : ""}`, { gap: 24 })
  const terms = [
    "1. Broker is a licensed property broker; Carrier is an authorized motor carrier. Each party",
    "   warrants its operating authority is active and will notify the other of any change.",
    "2. Carrier maintains auto liability of at least $1,000,000 and cargo coverage of at least",
    "   $100,000, with certificates furnished on request.",
    "3. Rates are agreed per load confirmation. Broker pays Carrier within the agreed terms;",
    "   double brokering of Carrier's freight by either party is prohibited.",
    "4. Carrier's factoring company's Notice of Assignment, when furnished, will be honored.",
    "5. Claims are governed by 49 U.S.C. 14706 (Carmack). Nine-month filing applies.",
    "6. This agreement remains in force until cancelled in writing by either party.",
  ]
  for (const line of terms) draw(line, { gap: 14 })
  y -= 14

  // Signature image
  const pngBase64 = input.signatureDataUrl.split(",")[1]
  if (pngBase64) {
    const png = await pdf.embedPng(Buffer.from(pngBase64, "base64"))
    const dims = png.scale(140 / png.width)
    page.drawImage(png, { x: 54, y: y - dims.height, width: dims.width, height: dims.height })
    y -= dims.height + 8
  }
  draw(`Signed: ${input.signerName} (${input.signerTitle}) — ${new Date().toLocaleDateString("en-US")}`, { gap: 14 })
  draw(`Recorded in LoadOff by ${actor.name}.`, { size: 8, gap: 0 })

  const bytes = await pdf.save()
  const file = new File([Buffer.from(bytes)], `broker-carrier-agreement-${customerName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`, {
    type: "application/pdf",
  })
  const doc = await saveDocument({
    carrierId,
    entityType: "customer",
    entityId: customerId,
    kind: "agreement",
    file,
    uploadedBy: actor.id,
  })
  await query(
    `INSERT INTO hub.crm_activities (carrier_id, customer_id, kind, body, actor_id, actor_name)
     VALUES ($1, $2, 'note', $3, $4, $5)`,
    [carrierId, customerId, `Broker–carrier agreement e-signed by ${input.signerName} (${input.signerTitle}).`, actor.id, actor.name]
  )
  return doc
}
