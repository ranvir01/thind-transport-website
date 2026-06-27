import type { Confidence, ParsedField } from "../parser"
import type { DocAnalysis, DocKind, ParsedDocPayload } from "./types"
import { DOC_KIND_LABELS } from "./types"

const RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 }

function pickField<T>(
  base?: ParsedField<T>,
  llm?: ParsedField<T>
): ParsedField<T> | undefined {
  if (!base && !llm) return undefined
  if (!base) return llm
  if (!llm) return base
  return RANK[llm.confidence] >= RANK[base.confidence] ? llm : base
}

function mergePayload(base: ParsedDocPayload, llm: ParsedDocPayload): ParsedDocPayload {
  if (base.kind !== llm.kind) return base

  switch (base.kind) {
    case "customer": {
      const b = base.data
      const l = llm.data as import("./types").ParsedCustomer
      return {
        kind: "customer",
        data: {
          name: pickField(b.name, l.name),
          mcNumber: pickField(b.mcNumber, l.mcNumber),
          dotNumber: pickField(b.dotNumber, l.dotNumber),
          billingEmail: pickField(b.billingEmail, l.billingEmail),
          paymentTermsDays: pickField(b.paymentTermsDays, l.paymentTermsDays),
          phone: pickField(b.phone, l.phone),
          type: pickField(b.type, l.type),
        },
      }
    }
    case "registration": {
      const b = base.data
      const l = llm.data as import("./types").ParsedRegistration
      return {
        kind: "registration",
        data: {
          unitNumber: pickField(b.unitNumber, l.unitNumber),
          vin: pickField(b.vin, l.vin),
          plate: pickField(b.plate, l.plate),
          plateState: pickField(b.plateState, l.plateState),
          registrationExpiry: pickField(b.registrationExpiry, l.registrationExpiry),
          year: pickField(b.year, l.year),
        },
      }
    }
    case "cdl": {
      const b = base.data
      const l = llm.data as import("./types").ParsedCdl
      return {
        kind: "cdl",
        data: {
          firstName: pickField(b.firstName, l.firstName),
          lastName: pickField(b.lastName, l.lastName),
          cdlNumber: pickField(b.cdlNumber, l.cdlNumber),
          cdlState: pickField(b.cdlState, l.cdlState),
          cdlExpiry: pickField(b.cdlExpiry, l.cdlExpiry),
        },
      }
    }
    case "med_card": {
      const b = base.data
      const l = llm.data as import("./types").ParsedMedCard
      return {
        kind: "med_card",
        data: {
          firstName: pickField(b.firstName, l.firstName),
          lastName: pickField(b.lastName, l.lastName),
          medicalCardExpiry: pickField(b.medicalCardExpiry, l.medicalCardExpiry),
        },
      }
    }
    case "w9": {
      const b = base.data
      const l = llm.data as import("./types").ParsedW9
      return {
        kind: "w9",
        data: {
          businessName: pickField(b.businessName, l.businessName),
          ein: pickField(b.ein, l.ein),
          address: pickField(b.address, l.address),
        },
      }
    }
    case "coi": {
      const b = base.data
      const l = llm.data as import("./types").ParsedCoi
      return {
        kind: "coi",
        data: {
          insuredName: pickField(b.insuredName, l.insuredName),
          policyNumber: pickField(b.policyNumber, l.policyNumber),
          expiry: pickField(b.expiry, l.expiry),
        },
      }
    }
    case "rate_con": {
      const b = base.data as import("../parser").ParsedRateCon
      const l = llm.data as import("../parser").ParsedRateCon
      return l.stops.length > b.stops.length ? llm : base
    }
    default:
      return base
  }
}

/** Merge LLM extraction over heuristic — higher-confidence field wins. */
export function mergeDocAnalysis(
  base: DocAnalysis,
  llm: DocAnalysis,
  summary: string[]
): DocAnalysis {
  if (base.kind === "unknown" && llm.kind !== "unknown") {
    return { kind: llm.kind, label: DOC_KIND_LABELS[llm.kind], payload: llm.payload, summary }
  }
  if (base.kind !== llm.kind) {
    return { ...base, summary }
  }

  const mergedPayload = mergePayload(base.payload, llm.payload)
  return {
    kind: base.kind,
    label: DOC_KIND_LABELS[base.kind],
    payload: mergedPayload,
    summary,
  }
}
