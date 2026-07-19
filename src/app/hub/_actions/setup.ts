"use server"

/**
 * Smart Setup (Phase 7 / M11): apply scanned document fields to live records.
 * Parsers run client-side; this action only persists confirmed data.
 */
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { createCustomer } from "@/lib/hub/customers"
import { createDriver } from "@/lib/hub/drivers"
import { createTruck } from "@/lib/hub/fleet"
import { saveDocument } from "@/lib/hub/documents"
import { decodeVin } from "@/lib/hub/vin"
import { vetCustomer, fmcsaConfigured } from "@/lib/hub/vetting"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import { queryOne, query } from "@/lib/hub/db"
import type { DocKind } from "@/lib/hub/doc-intake/types"
import type { DocumentKind } from "@/lib/hub/types"

export interface ApplyScanResult {
  ok: boolean
  error?: string
  id?: string
  href?: string
  message?: string
}

function docKindForVault(kind: DocKind): DocumentKind {
  switch (kind) {
    case "cdl": return "cdl"
    case "med_card": return "medical_card"
    case "registration": return "registration"
    case "w9": return "w9"
    case "coi": return "insurance"
    case "rate_con": return "rate_confirmation"
    default: return "other"
  }
}

async function attachFile(
  carrierId: string,
  entityType: "carrier" | "truck" | "driver" | "customer",
  entityId: string,
  kind: DocumentKind,
  file: File,
  expiry: string | null,
  uploadedBy: string
) {
  await saveDocument({
    carrierId,
    entityType,
    entityId,
    kind,
    file,
    expiry,
    uploadedBy,
  })
}

export async function applySmartScanAction(formData: FormData): Promise<ApplyScanResult> {
  let user
  try {
    user = await requirePermission("fleet:write")
  } catch (err) {
    return actionError(err, "Forbidden")
  }

  const kind = formData.get("kind") as DocKind
  const payloadRaw = formData.get("payload")
  const file = formData.get("file")
  if (typeof payloadRaw !== "string") return { ok: false, error: "Missing scan data" }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(payloadRaw) as Record<string, unknown>
  } catch {
    return { ok: false, error: "Invalid scan data" }
  }

  const upload = file instanceof File && file.size > 0 ? file : null

  try {
    switch (kind) {
      case "customer": {
        let name = String(payload.name ?? "").trim()
        if (!name && payload.mc_number) name = `MC-${String(payload.mc_number)}`
        if (!name && payload.dot_number) name = `DOT-${String(payload.dot_number)}`
        if (!name) return { ok: false, error: "Enter MC, DOT, or company name" }
        const customer = await createCustomer(user.carrierId, {
          name,
          type: payload.type === "shipper" ? "shipper" : "broker",
          mc_number: payload.mc_number ? String(payload.mc_number) : null,
          dot_number: payload.dot_number ? String(payload.dot_number) : null,
          billing_email: payload.billing_email ? String(payload.billing_email) : null,
          billing_address: null,
          phone: payload.phone ? String(payload.phone) : null,
          payment_terms_days: Number(payload.payment_terms_days) || 30,
          credit_limit_cents: null,
          factored: Boolean(payload.factored),
          status: "active",
          notes: "Added via Smart Setup",
        })
        if (fmcsaConfigured() && (customer.mc_number || customer.dot_number)) {
          const snapshot = await vetCustomer(user.carrierId, customer.id)
          if (snapshot?.legal_name && (name.startsWith("MC-") || name.startsWith("DOT-"))) {
            await query(
              `UPDATE hub.customers SET name = $3, updated_at = NOW() WHERE carrier_id = $1 AND id = $2`,
              [user.carrierId, customer.id, snapshot.legal_name]
            )
          }
        }
        if (upload) {
          await attachFile(user.carrierId, "customer", customer.id, "other", upload, null, user.id)
        }
        await logAudit({
          carrierId: user.carrierId, actorId: user.id, actorName: user.name,
          entityType: "customer", entityId: customer.id, action: "smart_setup_create",
          newValue: { name, mc: customer.mc_number },
        })
        revalidatePath("/hub/customers")
        revalidatePath("/hub/setup")
        revalidatePath("/hub")
        return {
          ok: true,
          id: customer.id,
          href: `/hub/customers/${customer.id}`,
          message: fmcsaConfigured()
            ? "Broker added — FMCSA authority checked automatically"
            : "Broker added — add FMCSA_WEBKEY to auto-verify authority",
        }
      }

      case "registration": {
        const unit = String(payload.unit_number ?? "").trim()
        if (!unit) return { ok: false, error: "Unit number is required" }
        let year = payload.year ? Number(payload.year) : null
        let make = payload.make ? String(payload.make) : null
        let model = payload.model ? String(payload.model) : null
        const vin = payload.vin ? String(payload.vin).toUpperCase() : null
        if (vin) {
          const decoded = await decodeVin(vin)
          if (decoded) {
            year = decoded.year ?? year
            make = decoded.make ?? make
            model = decoded.model ?? model
          }
        }
        const truck = await createTruck(user.carrierId, {
          unit_number: unit,
          vin,
          plate: payload.plate ? String(payload.plate) : null,
          plate_state: payload.plate_state ? String(payload.plate_state) : null,
          year,
          make,
          model,
          ownership: "company",
          status: "active",
          registration_expiry: payload.registration_expiry ? String(payload.registration_expiry) : null,
          inspection_due: null,
          insurance_expiry: null,
          assigned_driver_id: null,
          tank_capacity_gallons: null,
          notes: "Added via Smart Setup",
        })
        if (upload) {
          await attachFile(
            user.carrierId, "truck", truck.id, "registration", upload,
            payload.registration_expiry ? String(payload.registration_expiry) : null,
            user.id
          )
        }
        revalidatePath("/hub/fleet")
        revalidatePath("/hub/setup")
        revalidatePath("/hub")
        return { ok: true, id: truck.id, href: `/hub/fleet/trucks/${truck.id}`, message: "Truck added" }
      }

      case "cdl":
      case "med_card": {
        const first = String(payload.first_name ?? "").trim()
        const last = String(payload.last_name ?? "").trim()
        if (!first || !last) return { ok: false, error: "Driver first and last name are required" }
        const driver = await createDriver(user.carrierId, {
          first_name: first,
          last_name: last,
          phone: null,
          email: null,
          cdl_number: payload.cdl_number ? String(payload.cdl_number) : null,
          cdl_state: payload.cdl_state ? String(payload.cdl_state) : null,
          cdl_expiry: payload.cdl_expiry ? String(payload.cdl_expiry) : null,
          medical_card_expiry: payload.medical_card_expiry ? String(payload.medical_card_expiry) : null,
          hire_date: null,
          pay_type: "per_mile",
          pay_rate: 0.63,
          pay_loaded_miles_only: true,
          escrow_weekly_cents: 0,
          insurance_weekly_cents: 0,
          status: "active",
          notes: "Added via Smart Setup — confirm pay rules on driver page",
        })
        if (upload) {
          await attachFile(
            user.carrierId, "driver", driver.id,
            kind === "cdl" ? "cdl" : "medical_card",
            upload,
            kind === "cdl"
              ? (payload.cdl_expiry ? String(payload.cdl_expiry) : null)
              : (payload.medical_card_expiry ? String(payload.medical_card_expiry) : null),
            user.id
          )
        }
        revalidatePath("/hub/drivers")
        revalidatePath("/hub/setup")
        revalidatePath("/hub")
        return {
          ok: true,
          id: driver.id,
          href: `/hub/drivers/${driver.id}`,
          message: "Driver added — set pay rate on their page",
        }
      }

      case "w9":
      case "coi": {
        const expiry = payload.expiry ? String(payload.expiry) : null
        if (!upload) {
          return { ok: false, error: "Upload the PDF to file it in your carrier packet" }
        }
        await attachFile(
          user.carrierId, "carrier", user.carrierId,
          docKindForVault(kind), upload, expiry, user.id
        )
        revalidatePath("/hub/settings/packet")
        revalidatePath("/hub/setup")
        revalidatePath("/hub")
        return {
          ok: true,
          href: "/hub/settings/packet",
          message: kind === "w9" ? "W-9 filed in carrier packet" : "COI filed in carrier packet",
        }
      }

      case "spreadsheet": {
        const hint = String(payload.hint ?? "loads")
        return {
          ok: true,
          href: `/hub/import?kind=${hint === "fuel" ? "fuel" : "loads"}`,
          message: "Open the import wizard to map columns and finish",
        }
      }

      case "rate_con":
        return {
          ok: true,
          href: "/hub/loads/paste",
          message: "Opening paste intake — load form pre-filled from this rate con",
        }

      default:
        return { ok: false, error: "This document type cannot be applied automatically yet" }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not apply"
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "That record already exists (duplicate unit # or name)" }
    }
    return actionError(err, "Could not apply")
  }
}

export interface AnalyzeScanResult {
  analysis: import("@/lib/hub/doc-intake/types").DocAnalysis
  aiEnhanced: boolean
}

/** Classify + parse document text; merges LLM extraction when ANTHROPIC_API_KEY is set. */
export async function analyzeSmartSetupAction(
  text: string,
  fileName?: string
): Promise<AnalyzeScanResult> {
  await requirePermission("fleet:write")
  const { analyzeDocumentEnhanced } = await import("@/lib/hub/doc-intake/analyze-enhanced")
  return analyzeDocumentEnhanced(text, fileName)
}
